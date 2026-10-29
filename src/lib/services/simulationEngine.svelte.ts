import type {
	TraceMetadata,
	TraceEvent,
	TraceFooter,
	ActivePacket,
	ActiveModelJob,
	StationLiveState,
	BreakpointConfig,
	Point2D
} from '../types/trace';
import {
	parseNDJSON,
	parseTraceFile,
	parseMultipleTraceFiles,
	generateSampleTrace,
	type ParseResult,
	type MultiFileParseResult,
	type ProgressInfo
} from './traceParser';

export class SimulationEngine {
	// Core trace data (Svelte 5 runes)
	metadata = $state<TraceMetadata | null>(null);
	events = $state<TraceEvent[]>([]);
	footer = $state<TraceFooter | null>(null);

	// Playback state
	currentIndex = $state<number>(-1);
	currentSimTime = $state<number>(0);
	isPlaying = $state<boolean>(false);
	playbackSpeed = $state<number>(1.0);

	// Visual states
	stationsState = $state<Record<string, StationLiveState>>({});
	activePackets = $state<ActivePacket[]>([]);
	selectedStation = $state<string | null>(null);
	selectedPacket = $state<ActivePacket | null>(null);
	selectedJob = $state<ActiveModelJob | null>(null);

	// Active jobs currently residing in the model
	activeJobs = $state<Record<number, ActiveModelJob>>({});

	// Filter state for Active Jobs Table
	filterJobSearch = $state<string>('');
	filterJobStatus = $state<'ALL' | 'IN_SERVICE' | 'IN_QUEUE' | 'IN_FLIGHT'>('ALL');
	filterJobStation = $state<string>('');
	filterJobClass = $state<string>('');

	// User custom canvas drag positions
	userNodePositions = $state<Record<string, Point2D>>({});

	// Breakpoints
	breakpoints = $state<BreakpointConfig[]>([
		{
			id: 'bp-drop',
			enabled: true,
			type: 'drop',
			label: 'Pause on Job Drop (Buffer Full)'
		}
	]);

	// Filter state for Event Log
	filterStation = $state<string>('');
	filterPhase = $state<string>('');
	filterSearch = $state<string>('');

	// Multi-file chunk metadata
	loadedFilesCount = $state<number>(0);
	loadedParts = $state<number[]>([]);
	currentRunId = $state<string>('');

	// Internal animation frame handle
	private animFrameId: number | null = null;
	private lastTimestamp: number = 0;
	private packetCounter: number = 0;
	private stepAccumulatorMs: number = 0;

	constructor() {
		// Do NOT load a sample model on startup. Leave empty until user loads a trace.
	}

	// Derived states
	totalEvents = $derived(this.events.length);
	currentEvent = $derived(
		this.currentIndex >= 0 && this.currentIndex < this.events.length
			? this.events[this.currentIndex]
			: null
	);

	progressPercent = $derived(
		this.events.length === 0 ? 0 : Math.min(100, Math.max(0, ((this.currentIndex + 1) / this.events.length) * 100))
	);

	maxSimTime = $derived(
		this.footer?.lastSimTime ||
		(this.events.length > 0 ? this.events[this.events.length - 1].t : 1.0)
	);

	filteredEvents = $derived.by(() => {
		const search = this.filterSearch.toLowerCase().trim();
		const station = this.filterStation.trim();
		const phase = this.filterPhase.trim();

		return this.events.filter((ev) => {
			if (station && ev.srcStation !== station && ev.dstStation !== station) return false;
			if (phase && ev.phase !== phase) return false;
			if (search) {
				const matchJob = ev.jobId !== undefined && String(ev.jobId).includes(search);
				const matchClass = ev.jobClass?.toLowerCase().includes(search);
				const matchCaller = ev.caller?.toLowerCase().includes(search);
				const matchEvent = ev.event.toLowerCase().includes(search);
				if (!matchJob && !matchClass && !matchCaller && !matchEvent) return false;
			}
			return true;
		});
	});

	totalDropsSoFar = $derived.by(() => {
		let drops = 0;
		for (const key in this.stationsState) {
			drops += this.stationsState[key].droppedCount;
		}
		return drops;
	});

	activeModelJobs = $derived.by(() => {
		const list: ActiveModelJob[] = [];
		const now = this.currentSimTime;

		for (const key in this.activeJobs) {
			const job = this.activeJobs[key];
			if (!job) continue;
			const residenceTime = Math.max(0, now - (job.enterTime ?? now));

			// If in flight, sync progress from activePackets if matching
			let progressPercent = job.progressPercent ?? 0;
			let packetRef = job.packetRef;

			if (job.state === 'IN_FLIGHT') {
				const packet = this.activePackets.find((p) => p.jobId === job.jobId && p.status === 'flying');
				if (packet) {
					progressPercent = Math.round(packet.progress * 100);
					packetRef = packet;
				}
			}

			list.push({
				...job,
				residenceTime,
				progressPercent,
				packetRef
			});
		}

		return list.sort((a, b) => a.jobId - b.jobId);
	});

	filteredActiveModelJobs = $derived.by(() => {
		const all = this.activeModelJobs;
		const search = this.filterJobSearch.trim().toLowerCase();
		const status = this.filterJobStatus;
		const station = this.filterJobStation;
		const jClass = this.filterJobClass;

		return all.filter((job) => {
			if (status !== 'ALL' && job.state !== status) return false;
			if (station && job.stationName !== station && job.linkSource !== station && job.linkTarget !== station) return false;
			if (jClass && job.jobClass !== jClass) return false;
			if (search) {
				const idMatch = job.jobId.toString().includes(search);
				const classMatch = job.jobClass.toLowerCase().includes(search);
				const stationMatch = (job.stationName || '').toLowerCase().includes(search);
				const linkMatch = `${job.linkSource || ''} ${job.linkTarget || ''}`.toLowerCase().includes(search);
				if (!idMatch && !classMatch && !stationMatch && !linkMatch) return false;
			}
			return true;
		});
	});

	activeJobsCountByStatus = $derived.by(() => {
		const jobs = this.activeModelJobs;
		let inFlight = 0;
		let inService = 0;
		let inQueue = 0;
		for (const j of jobs) {
			if (j.state === 'IN_FLIGHT') inFlight++;
			else if (j.state === 'IN_SERVICE') inService++;
			else if (j.state === 'IN_QUEUE') inQueue++;
		}
		return { all: jobs.length, inFlight, inService, inQueue };
	});

	/**
	 * Initialize fresh state when trace data is loaded
	 */
	loadTrace(result: ParseResult | MultiFileParseResult) {
		this.pause();
		this.metadata = result.metadata;
		this.events = result.events;
		this.footer = result.footer;
		this.userNodePositions = {};

		if ('totalFilesLoaded' in result) {
			this.loadedFilesCount = result.totalFilesLoaded;
			this.loadedParts = result.partsLoaded;
			this.currentRunId = result.runId;
		} else {
			this.loadedFilesCount = 1;
			this.loadedParts = [1];
			this.currentRunId = 'run1';
		}

		this.reset();
	}

	loadSampleData() {
		const sample = generateSampleTrace();
		this.loadTrace(sample);
	}

	async loadFromFile(file: File, maxEvents: number = 100000) {
		const parsed = await parseTraceFile(file, maxEvents);
		this.loadTrace(parsed);
	}

	async loadFromMultipleFiles(
		files: File[],
		targetRunId?: string,
		maxEvents: number = 100000,
		onProgress?: (p: ProgressInfo) => void
	) {
		const parsed = await parseMultipleTraceFiles(files, targetRunId, maxEvents, onProgress);
		this.loadTrace(parsed);
		return parsed;
	}

	loadFromText(text: string) {
		const parsed = parseNDJSON(text);
		this.loadTrace(parsed);
	}

	/**
	 * Reset playback to initial state before event 0
	 */
	reset() {
		this.pause();
		this.currentIndex = -1;
		this.currentSimTime = 0;
		this.activePackets = [];
		this.selectedPacket = null;
		this.initStationStates();
	}

	private initStationStates() {
		this.activeJobs = {};
		this.selectedJob = null;
		const newStates: Record<string, StationLiveState> = {};
		if (!this.metadata) {
			this.stationsState = {};
			return;
		}

		for (const node of this.metadata.nodes) {
			const cap = node.sections?.input?.capacity ?? -1;
			const totalServers = node.sections?.service?.servers ?? 1;

			const serverSlots = [];
			for (let i = 0; i < totalServers; i++) {
				serverSlots.push({ id: i + 1, busy: false });
			}

			newStates[node.name] = {
				id: node.id,
				name: node.name,
				nodeType: node.nodeType,
				capacity: cap,
				totalServers,
				queueJobs: [],
				servers: serverSlots,
				currentQueueSize: 0,
				nodeJobs: 0,
				droppedCount: 0,
				completedCount: 0,
				recentEvents: []
			};
		}
		this.stationsState = newStates;
	}

	/**
	 * Step forward exactly one event
	 */
	stepForward(): boolean {
		if (this.currentIndex + 1 >= this.events.length) {
			this.pause();
			return false;
		}

		this.currentIndex++;
		const ev = this.events[this.currentIndex];
		this.currentSimTime = ev.t;

		this.applyEventToState(ev, true);

		if (this.checkBreakpoints(ev)) {
			this.pause();
			return false;
		}

		return true;
	}

	/**
	 * Step backward one event
	 */
	stepBackward() {
		if (this.currentIndex <= -1) return;
		const targetIndex = this.currentIndex - 1;
		this.seekToIndex(targetIndex);
	}

	/**
	 * Seek directly to a specific event index
	 */
	seekToIndex(targetIndex: number) {
		this.pause();
		const target = Math.max(-1, Math.min(this.events.length - 1, targetIndex));
		this.initStationStates();
		this.activePackets = [];

		for (let i = 0; i <= target; i++) {
			const ev = this.events[i];
			this.applyEventToState(ev, false);
		}

		this.currentIndex = target;
		this.currentSimTime = target >= 0 ? this.events[target].t : 0;
	}

	/**
	 * Seek to a specific simulation time
	 */
	seekToTime(targetTime: number) {
		this.pause();
		if (this.events.length === 0) return;

		let low = 0;
		let high = this.events.length - 1;
		let targetIdx = -1;

		while (low <= high) {
			const mid = Math.floor((low + high) / 2);
			if (this.events[mid].t <= targetTime) {
				targetIdx = mid;
				low = mid + 1;
			} else {
				high = mid - 1;
			}
		}

		this.seekToIndex(targetIdx);
	}

	/**
	 * Update station and packet live state from an event
	 */
	private applyEventToState(ev: TraceEvent, spawnVisualPacket: boolean = true) {
		const srcState = this.stationsState[ev.srcStation];
		const dstState = this.stationsState[ev.dstStation];

		if (srcState) {
			srcState.recentEvents = [ev, ...srcState.recentEvents.slice(0, 9)];
		}
		if (dstState && dstState !== srcState) {
			dstState.recentEvents = [ev, ...dstState.recentEvents.slice(0, 9)];
		}

		// Handle Job Drops
		if (ev.phase === 'DROP') {
			if (dstState) {
				dstState.droppedCount++;
			} else if (srcState) {
				srcState.droppedCount++;
			}
			if (ev.jobId !== undefined) {
				delete this.activeJobs[ev.jobId];
			}
			return;
		}

		// Update station queue/jobs if present in event payload
		if (dstState && ev.queueSize !== undefined) {
			dstState.currentQueueSize = ev.queueSize;
		}
		if (dstState && ev.nodeJobs !== undefined) {
			dstState.nodeJobs = ev.nodeJobs;
		}

		// Manage job lifecycle inside stations
		if (ev.jobId !== undefined && ev.jobClass) {
			const jobId = ev.jobId;
			const jobClass = ev.jobClass;
			const priority = ev.priority ?? 0;

			// Handle SEND phase: packet departs station
			if (ev.phase === 'SEND') {
				if (srcState) {
					srcState.queueJobs = srcState.queueJobs.filter((j) => j.jobId !== jobId);
					for (const server of srcState.servers) {
						if (server.jobId === jobId) {
							server.busy = false;
							delete server.jobId;
							delete server.jobClass;
						}
					}

					// Advance next queued job into freed server if available
					if (srcState.queueJobs.length > 0) {
						const nextJob = srcState.queueJobs.shift()!;
						const freeServer = srcState.servers.find((s) => !s.busy);
						if (freeServer) {
							freeServer.busy = true;
							freeServer.jobId = nextJob.jobId;
							freeServer.jobClass = nextJob.jobClass;
							freeServer.startSimTime = ev.t;

							const existingNext = this.activeJobs[nextJob.jobId];
							if (existingNext) {
								existingNext.state = 'IN_SERVICE';
								existingNext.serverIndex = freeServer.id;
								existingNext.serviceStartTime = ev.t;
								delete existingNext.queuePosition;
							}
						}
					}
				}

				// Check if departing towards Sink
				if (dstState && dstState.nodeType === 'Sink') {
					delete this.activeJobs[jobId];
				} else {
					// Mark job in-flight across the link
					this.activeJobs[jobId] = {
						jobId,
						jobClass,
						priority,
						state: 'IN_FLIGHT',
						linkSource: ev.srcStation,
						linkTarget: ev.dstStation,
						progressPercent: 0,
						enterTime: ev.t,
						residenceTime: 0,
						scheduledDeparture: ev.schedTime ?? ev.t + (ev.delay || 0.05),
						lastEventSeq: ev.seq,
						lastEventPhase: ev.phase
					};
				}

				// Only spawn flying packet if it is transmitting across a network connection
				if (spawnVisualPacket && ev.srcStation && ev.dstStation && ev.srcStation !== ev.dstStation) {
					this.spawnPacket(ev);
				}
			}

			// Handle DISPATCH phase: packet reaches destination station
			if (ev.phase === 'DISPATCH') {
				if (dstState) {
					if (dstState.nodeType === 'Sink') {
						dstState.completedCount++;
						delete this.activeJobs[jobId];
					} else {
						const freeServer = dstState.servers.find((s) => !s.busy);
						if (freeServer && dstState.queueJobs.length === 0) {
							freeServer.busy = true;
							freeServer.jobId = jobId;
							freeServer.jobClass = jobClass;
							freeServer.startSimTime = ev.t;

							this.activeJobs[jobId] = {
								jobId,
								jobClass,
								priority,
								state: 'IN_SERVICE',
								stationName: ev.dstStation,
								serverIndex: freeServer.id,
								enterTime: ev.t,
								serviceStartTime: ev.t,
								residenceTime: 0,
								lastEventSeq: ev.seq,
								lastEventPhase: ev.phase
							};
						} else {
							if (!dstState.queueJobs.some((j) => j.jobId === jobId)) {
								dstState.queueJobs.push({
									jobId,
									jobClass,
									priority,
									enterTime: ev.enterTime ?? ev.t
								});
							}
							const qPos = dstState.queueJobs.findIndex((j) => j.jobId === jobId);
							this.activeJobs[jobId] = {
								jobId,
								jobClass,
								priority,
								state: 'IN_QUEUE',
								stationName: ev.dstStation,
								queuePosition: qPos >= 0 ? qPos + 1 : dstState.queueJobs.length,
								enterTime: ev.t,
								residenceTime: 0,
								lastEventSeq: ev.seq,
								lastEventPhase: ev.phase
							};
						}
					}
				}
			}
		}
	}

	/**
	 * Spawn an animated packet traversing the wire link
	 */
	private spawnPacket(ev: TraceEvent) {
		const delay = ev.delay && ev.delay > 0 ? ev.delay : 0.05;
		const packet: ActivePacket = {
			id: `packet-${++this.packetCounter}`,
			jobId: ev.jobId!,
			jobClass: ev.jobClass!,
			priority: ev.priority ?? 0,
			srcStation: ev.srcStation,
			dstStation: ev.dstStation,
			srcSection: ev.srcSection,
			dstSection: ev.dstSection,
			phase: ev.phase,
			startTime: ev.t,
			schedTime: ev.schedTime ?? ev.t + delay,
			event: ev.event,
			progress: 0.0,
			status: 'flying'
		};

		// Keep up to 45 concurrent animated packets on the wire canvas
		if (this.activePackets.length > 45) {
			this.activePackets.shift();
		}
		this.activePackets.push(packet);
	}

	/**
	 * Check if current event matches any active breakpoint
	 */
	private checkBreakpoints(ev: TraceEvent): boolean {
		for (const bp of this.breakpoints) {
			if (!bp.enabled) continue;

			if (bp.type === 'drop' && ev.phase === 'DROP') return true;
			if (bp.type === 'job_id' && bp.jobIdTarget !== undefined && ev.jobId === bp.jobIdTarget) return true;
			if (bp.type === 'station_event' && bp.stationTarget && (ev.srcStation === bp.stationTarget || ev.dstStation === bp.stationTarget)) return true;
			if (bp.type === 'queue_capacity' && bp.queueThresholdPercent !== undefined && ev.queueCap && ev.queueCap > 0 && ev.queueSize) {
				const percent = (ev.queueSize / ev.queueCap) * 100;
				if (percent >= bp.queueThresholdPercent) return true;
			}
		}
		return false;
	}

	/**
	 * Start / Resume playback
	 */
	play() {
		if (this.isPlaying) return;
		if (this.currentIndex + 1 >= this.events.length) {
			this.reset();
		}
		this.isPlaying = true;
		this.lastTimestamp = performance.now();
		this.stepAccumulatorMs = 0;
		this.startAnimationLoop();
	}

	/**
	 * Pause playback
	 */
	pause() {
		this.isPlaying = false;
		if (this.animFrameId !== null) {
			if (typeof cancelAnimationFrame !== 'undefined') {
				cancelAnimationFrame(this.animFrameId);
			} else {
				clearTimeout(this.animFrameId);
			}
			this.animFrameId = null;
		}
	}

	togglePlay() {
		if (this.isPlaying) this.pause();
		else this.play();
	}

	setSpeed(speed: number) {
		this.playbackSpeed = speed;
	}

	/**
	 * Main animation loop with smooth packet navigation pacing
	 */
	private startAnimationLoop() {
		const loop = (now: number) => {
			if (!this.isPlaying) return;

			const deltaMs = Math.min(100, now - this.lastTimestamp);
			this.lastTimestamp = now;

			// Advance packet positions along the link
			this.updatePackets(deltaMs);

			// Paced event stepping:
			// At 1x speed, an event is stepped every 120ms so packet movement along the wire is clearly visible.
			// At 5x speed, every 24ms. At 10x, every 12ms.
			this.stepAccumulatorMs += deltaMs;
			const stepIntervalMs = Math.max(10, 150 / this.playbackSpeed);

			while (this.stepAccumulatorMs >= stepIntervalMs) {
				this.stepAccumulatorMs -= stepIntervalMs;
				const hasMore = this.stepForward();
				if (!hasMore) {
					this.pause();
					return;
				}
			}

			if (typeof requestAnimationFrame !== 'undefined') {
				this.animFrameId = requestAnimationFrame(loop);
			} else {
				this.animFrameId = setTimeout(() => loop(performance.now()), 16) as unknown as number;
			}
		};

		if (typeof requestAnimationFrame !== 'undefined') {
			this.animFrameId = requestAnimationFrame(loop);
		} else {
			this.animFrameId = setTimeout(() => loop(performance.now()), 16) as unknown as number;
		}
	}

	/**
	 * Update progress of packets actively traversing the link
	 */
	private updatePackets(deltaMs: number) {
		// A packet traverses the link in ~650ms at 1x speed
		const speedFactor = 0.0016 * Math.max(0.2, this.playbackSpeed);
		const stepProgress = deltaMs * speedFactor;

		for (let i = this.activePackets.length - 1; i >= 0; i--) {
			const packet = this.activePackets[i];
			packet.progress += stepProgress;

			if (packet.progress >= 1.0) {
				packet.status = 'delivered';
				this.activePackets.splice(i, 1);
			}
		}
	}

	selectJob(job: ActiveModelJob | null) {
		this.selectedJob = job;
		if (!job) return;
		if (job.stationName) {
			this.selectedStation = job.stationName;
		} else {
			this.selectedStation = null;
		}
		if (job.state === 'IN_FLIGHT') {
			const packet = this.activePackets.find((p) => p.jobId === job.jobId);
			if (packet) {
				this.selectedPacket = packet;
			}
		} else {
			this.selectedPacket = null;
		}
	}

	setNodePosition(name: string, x: number, y: number) {
		this.userNodePositions[name] = { x, y };
	}

	toggleBreakpoint(id: string) {
		const bp = this.breakpoints.find((b) => b.id === id);
		if (bp) bp.enabled = !bp.enabled;
	}

	addBreakpoint(bp: BreakpointConfig) {
		this.breakpoints.push(bp);
	}

	removeBreakpoint(id: string) {
		this.breakpoints = this.breakpoints.filter((b) => b.id !== id);
	}
}

export const simEngine = new SimulationEngine();
