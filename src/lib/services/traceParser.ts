import type { TraceMetadata, TraceEvent, TraceFooter, TraceRecord } from '../types/trace';

export interface ParseResult {
	metadata: TraceMetadata | null;
	events: TraceEvent[];
	footer: TraceFooter | null;
	errorCount: number;
	totalLinesParsed?: number;
	isTruncated?: boolean;
}

export interface ChunkFileInfo {
	file: File;
	name: string;
	runId: string;
	partNumber: number;
	modelPrefix: string;
	size: number;
}

export interface ProgressInfo {
	currentFileIndex: number;
	totalFiles: number;
	fileName: string;
	stage: 'reading' | 'decompressing' | 'parsing' | 'stitching' | 'done';
	percent: number;
	message: string;
}

export interface MultiFileParseResult extends ParseResult {
	totalFilesLoaded: number;
	partsLoaded: number[];
	runId: string;
	modelName: string;
}

/**
 * Extract model prefix, run ID, and part index from a chunk filename.
 */
export function extractChunkInfo(filename: string): { modelPrefix: string; runId: string; partNumber: number } {
	const clean = filename.replace(/\.ndjson(\.gz)?$/i, '');

	const runMatch = clean.match(/_run(\d+)/i);
	const runId = runMatch ? `run${runMatch[1]}` : 'run1';

	const partMatch = clean.match(/[_.-]part(\d+)/i);
	let partNumber = 1;
	if (partMatch) {
		partNumber = parseInt(partMatch[1], 10);
	} else {
		const trailingNum = clean.match(/_(\d+)$/);
		if (trailingNum) {
			partNumber = parseInt(trailingNum[1], 10);
		}
	}

	const modelPrefix = clean
		.replace(/[_.-]run\d+/i, '')
		.replace(/[_.-]part\d+/i, '');

	return { modelPrefix, runId, partNumber };
}

/**
 * Group uploaded files by Run ID and sort in ascending order of chunk part number
 */
export function groupAndSortChunks(files: File[]): Map<string, ChunkFileInfo[]> {
	const groups = new Map<string, ChunkFileInfo[]>();

	for (const file of files) {
		const info = extractChunkInfo(file.name);
		const chunk: ChunkFileInfo = {
			file,
			name: file.name,
			runId: info.runId,
			partNumber: info.partNumber,
			modelPrefix: info.modelPrefix,
			size: file.size
		};

		if (!groups.has(info.runId)) {
			groups.set(info.runId, []);
		}
		groups.get(info.runId)!.push(chunk);
	}

	for (const chunks of groups.values()) {
		chunks.sort((a, b) => a.partNumber - b.partNumber);
	}

	return groups;
}

/**
 * Stitch multiple chunk ParseResults into a unified simulation timeline
 */
export function stitchTraceChunks(results: { info: ChunkFileInfo; result: ParseResult }[]): MultiFileParseResult {
	if (results.length === 0) {
		return {
			metadata: null,
			events: [],
			footer: null,
			errorCount: 0,
			totalFilesLoaded: 0,
			partsLoaded: [],
			runId: 'none',
			modelName: 'Unknown'
		};
	}

	let unifiedMetadata: TraceMetadata | null = null;
	let unifiedFooter: TraceFooter | null = null;
	let totalErrorCount = 0;
	const partsLoaded: number[] = [];
	const seenSeqs = new Set<number>();
	const allEvents: TraceEvent[] = [];

	let totalDropped = 0;
	let maxSimTime = 0;

	for (const { info, result } of results) {
		partsLoaded.push(info.partNumber);
		totalErrorCount += result.errorCount;

		if (!unifiedMetadata && result.metadata) {
			unifiedMetadata = result.metadata;
		}

		if (result.footer) {
			unifiedFooter = result.footer;
			totalDropped += result.footer.droppedEvents || 0;
			if (result.footer.lastSimTime > maxSimTime) {
				maxSimTime = result.footer.lastSimTime;
			}
		}

		for (const ev of result.events) {
			if (!seenSeqs.has(ev.seq)) {
				seenSeqs.add(ev.seq);
				allEvents.push(ev);
				if (ev.t > maxSimTime) {
					maxSimTime = ev.t;
				}
			}
		}
	}

	allEvents.sort((a, b) => a.seq - b.seq);

	if (!unifiedFooter && allEvents.length > 0) {
		unifiedFooter = {
			type: 'footer',
			totalEvents: allEvents.length,
			droppedEvents: totalDropped,
			lastSimTime: maxSimTime,
			durationMs: 0,
			part: partsLoaded[partsLoaded.length - 1]
		};
	} else if (unifiedFooter) {
		unifiedFooter = {
			...unifiedFooter,
			totalEvents: allEvents.length,
			lastSimTime: Math.max(unifiedFooter.lastSimTime, maxSimTime),
			droppedEvents: Math.max(unifiedFooter.droppedEvents, totalDropped)
		};
	}

	const firstInfo = results[0].info;

	return {
		metadata: unifiedMetadata,
		events: allEvents,
		footer: unifiedFooter,
		errorCount: totalErrorCount,
		totalFilesLoaded: results.length,
		partsLoaded,
		runId: firstInfo.runId,
		modelName: unifiedMetadata?.modelName || firstInfo.modelPrefix
	};
}

/**
 * True streaming line reader that decodes and decompresses in memory-safe chunks.
 * Completely immune to browser buffer overflow and "Failed to fetch" errors.
 */
export async function parseStreamedFile(
	file: File,
	maxEvents: number = 100000,
	onProgress?: (progress: number, linesParsed: number) => void
): Promise<ParseResult> {
	const isGzip = file.name.endsWith('.gz');

	let readableStream: ReadableStream<Uint8Array>;
	if (isGzip) {
		if (typeof DecompressionStream === 'undefined') {
			throw new Error('DecompressionStream API is not supported in this browser environment.');
		}
		readableStream = file.stream().pipeThrough(new DecompressionStream('gzip'));
	} else {
		readableStream = file.stream();
	}

	const reader = readableStream.getReader();
	const decoder = new TextDecoder('utf-8');

	let remainder = '';
	let isFirstLine = true;
	let metadata: TraceMetadata | null = null;
	let footer: TraceFooter | null = null;
	const events: TraceEvent[] = [];
	let errorCount = 0;
	let totalLinesParsed = 0;
	let isTruncated = false;

	const approxFileSize = file.size;
	let compressedBytesReadEstimate = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			compressedBytesReadEstimate += value.byteLength;
			remainder += decoder.decode(value, { stream: true });

			let newlineIdx: number;
			while ((newlineIdx = remainder.indexOf('\n')) !== -1) {
				const line = remainder.slice(0, newlineIdx).trim();
				remainder = remainder.slice(newlineIdx + 1);
				if (!line) continue;

				totalLinesParsed++;

				if (isFirstLine) {
					try {
						metadata = JSON.parse(line) as TraceMetadata;
					} catch {
						errorCount++;
					}
					isFirstLine = false;
				} else {
					try {
						const record = JSON.parse(line) as TraceRecord;
						if (record.type === 'footer') {
							footer = record as TraceFooter;
						} else if (record.type === 'event' || ('seq' in record && 'phase' in record)) {
							events.push(record as TraceEvent);

							if (maxEvents > 0 && events.length >= maxEvents) {
								isTruncated = true;
								await reader.cancel('Reached max event limit');
								break;
							}
						}
					} catch {
						errorCount++;
					}
				}
			}

			if (isTruncated) break;

			if (onProgress && totalLinesParsed % 15000 === 0) {
				const progress = Math.min(99, Math.round((compressedBytesReadEstimate / (approxFileSize * 4 || 1)) * 100));
				onProgress(progress, events.length);
			}
		}

		// Process remaining line if not truncated
		if (!isTruncated && remainder.trim()) {
			const line = remainder.trim();
			try {
				const record = JSON.parse(line) as TraceRecord;
				if (record.type === 'footer') {
					footer = record as TraceFooter;
				} else if (record.type === 'event' || ('seq' in record && 'phase' in record)) {
					events.push(record as TraceEvent);
				}
			} catch {
				errorCount++;
			}
		}
	} catch (err: unknown) {
		// If cancelled intentionally due to max limit, do not treat as error
		if (isTruncated) {
			// Expected
		} else {
			throw err;
		}
	}

	events.sort((a, b) => a.seq - b.seq);

	return {
		metadata,
		events,
		footer,
		errorCount,
		totalLinesParsed,
		isTruncated
	};
}

/**
 * Parse multiple trace files with streaming decompression and user-configurable event cap.
 */
export async function parseMultipleTraceFiles(
	files: File[],
	targetRunId?: string,
	maxEvents: number = 100000,
	onProgress?: (p: ProgressInfo) => void
): Promise<MultiFileParseResult> {
	if (files.length === 0) {
		throw new Error('No files provided for parsing.');
	}

	const groups = groupAndSortChunks(files);
	let selectedRunId = targetRunId;
	if (!selectedRunId || !groups.has(selectedRunId)) {
		let maxCount = -1;
		for (const [runId, chunks] of groups.entries()) {
			if (chunks.length > maxCount) {
				maxCount = chunks.length;
				selectedRunId = runId;
			}
		}
	}

	const chunksToLoad = groups.get(selectedRunId!) || [];
	const parsedChunks: { info: ChunkFileInfo; result: ParseResult }[] = [];
	let accumulatedEvents = 0;

	for (let i = 0; i < chunksToLoad.length; i++) {
		const chunk = chunksToLoad[i];

		if (onProgress) {
			onProgress({
				currentFileIndex: i + 1,
				totalFiles: chunksToLoad.length,
				fileName: chunk.name,
				stage: 'decompressing',
				percent: Math.round((i / chunksToLoad.length) * 100),
				message: `Reading part ${chunk.partNumber} of ${chunksToLoad.length}: ${chunk.name}`
			});
		}

		const remainingBudget = maxEvents > 0 ? Math.max(1000, maxEvents - accumulatedEvents) : 0;
		const result = await parseStreamedFile(chunk.file, remainingBudget, (pct, parsed) => {
			if (onProgress) {
				onProgress({
					currentFileIndex: i + 1,
					totalFiles: chunksToLoad.length,
					fileName: chunk.name,
					stage: 'parsing',
					percent: Math.min(99, Math.round(((i + pct / 100) / chunksToLoad.length) * 100)),
					message: `Decompressing ${chunk.name} (${parsed.toLocaleString()} events)...`
				});
			}
		});

		accumulatedEvents += result.events.length;
		parsedChunks.push({ info: chunk, result });

		if (maxEvents > 0 && accumulatedEvents >= maxEvents) {
			break;
		}
	}

	if (onProgress) {
		onProgress({
			currentFileIndex: chunksToLoad.length,
			totalFiles: chunksToLoad.length,
			fileName: 'All parts',
			stage: 'stitching',
			percent: 98,
			message: `Stitching ${parsedChunks.length} chunk parts into unified timeline...`
		});
	}

	const stitched = stitchTraceChunks(parsedChunks);

	if (onProgress) {
		onProgress({
			currentFileIndex: chunksToLoad.length,
			totalFiles: chunksToLoad.length,
			fileName: 'Complete',
			stage: 'done',
			percent: 100,
			message: `Loaded ${stitched.events.length.toLocaleString()} events across ${stitched.totalFilesLoaded} files.`
		});
	}

	return stitched;
}

/**
 * Synchronous text parser for string buffers (used in tests and small inputs)
 */
export function parseNDJSON(content: string): ParseResult {
	const lines = content.split('\n');
	let metadata: TraceMetadata | null = null;
	let footer: TraceFooter | null = null;
	const events: TraceEvent[] = [];
	let errorCount = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		try {
			const record = JSON.parse(line) as TraceRecord;

			if (record.type === 'metadata') {
				metadata = record as TraceMetadata;
			} else if (record.type === 'footer') {
				footer = record as TraceFooter;
			} else if (record.type === 'event' || ('seq' in record && 'phase' in record)) {
				events.push(record as TraceEvent);
			}
		} catch {
			errorCount++;
		}
	}

	events.sort((a, b) => a.seq - b.seq);
	return { metadata, events, footer, errorCount };
}

/**
 * Single file parser (delegates to stream reader)
 */
export async function parseTraceFile(file: File, maxEvents: number = 100000): Promise<ParseResult> {
	return parseStreamedFile(file, maxEvents);
}

/**
 * Generates a sample trace for testing purposes
 */
export function generateSampleTrace(): ParseResult {
	const metadata: TraceMetadata = {
		type: 'metadata',
		version: '1.0',
		timestamp: Date.now() - 3600000,
		modelName: 'ClosedLoopSimulation',
		classes: [
			{ id: 0, name: 'Class0', type: 'CLOSED', priority: 0, referenceNode: 'CPU' }
		],
		nodes: [
			{ id: 0, name: 'CPU', nodeType: 'Queue', sections: { input: { type: 'Queue', capacity: -1 }, service: { type: 'Server', servers: 1 }, output: { type: 'Router' } } },
			{ id: 1, name: 'FlowEq', nodeType: 'Queue', sections: { input: { type: 'Queue', capacity: -1 }, service: { type: 'Server', servers: 1 }, output: { type: 'Router' } } }
		],
		connections: [
			{ source: 'CPU', target: 'FlowEq' },
			{ source: 'FlowEq', target: 'CPU' }
		]
	};

	const events: TraceEvent[] = [];
	let seq = 1;
	let simTime = 0.0;

	for (let jobId = 0; jobId < 30; jobId++) {
		// CPU -> FlowEq (SEND)
		events.push({
			type: 'event',
			seq: seq++,
			t: parseFloat(simTime.toFixed(4)),
			phase: 'SEND',
			event: 'EVENT_JOB',
			eventId: 3,
			delay: 0.1,
			schedTime: parseFloat((simTime + 0.1).toFixed(4)),
			srcStation: 'CPU',
			srcStationId: 0,
			srcSection: 'OUTPUT',
			srcClass: 'Router',
			srcDisplay: 'CPU [OUTPUT:Router]',
			dstStation: 'FlowEq',
			dstStationId: 1,
			dstSection: 'INPUT',
			dstClass: 'Queue',
			dstDisplay: 'FlowEq [INPUT:Queue]',
			src: 'CPU',
			dst: 'FlowEq',
			caller: 'QueueNet.NetNode.send(NetNode.java:782)',
			jobId,
			jobClass: 'Class0',
			classId: 0,
			priority: 0,
			enterTime: simTime
		});

		simTime += 0.1;

		// DISPATCH at FlowEq
		events.push({
			type: 'event',
			seq: seq++,
			t: parseFloat(simTime.toFixed(4)),
			phase: 'DISPATCH',
			event: 'EVENT_JOB',
			eventId: 3,
			srcStation: 'CPU',
			srcStationId: 0,
			srcSection: 'OUTPUT',
			srcClass: 'Router',
			srcDisplay: 'CPU [OUTPUT:Router]',
			dstStation: 'FlowEq',
			dstStationId: 1,
			dstSection: 'INPUT',
			dstClass: 'Queue',
			dstDisplay: 'FlowEq [INPUT:Queue]',
			src: 'CPU',
			dst: 'FlowEq',
			caller: 'QueueNet.NetNode.dispatch(NetNode.java:620)',
			nodeJobs: 1,
			queueSize: 0,
			queueCap: -1,
			servers: 1,
			jobId,
			jobClass: 'Class0',
			classId: 0,
			priority: 0,
			enterTime: simTime
		});

		simTime += 0.15;

		// FlowEq -> CPU (SEND)
		events.push({
			type: 'event',
			seq: seq++,
			t: parseFloat(simTime.toFixed(4)),
			phase: 'SEND',
			event: 'EVENT_JOB',
			eventId: 3,
			delay: 0.1,
			schedTime: parseFloat((simTime + 0.1).toFixed(4)),
			srcStation: 'FlowEq',
			srcStationId: 1,
			srcSection: 'OUTPUT',
			srcClass: 'Router',
			srcDisplay: 'FlowEq [OUTPUT:Router]',
			dstStation: 'CPU',
			dstStationId: 0,
			dstSection: 'INPUT',
			dstClass: 'Queue',
			dstDisplay: 'CPU [INPUT:Queue]',
			src: 'FlowEq',
			dst: 'CPU',
			caller: 'QueueNet.NetNode.send(NetNode.java:782)',
			jobId,
			jobClass: 'Class0',
			classId: 0,
			priority: 0,
			enterTime: simTime
		});

		simTime += 0.1;

		// DISPATCH at CPU
		events.push({
			type: 'event',
			seq: seq++,
			t: parseFloat(simTime.toFixed(4)),
			phase: 'DISPATCH',
			event: 'EVENT_JOB',
			eventId: 3,
			srcStation: 'FlowEq',
			srcStationId: 1,
			srcSection: 'OUTPUT',
			srcClass: 'Router',
			srcDisplay: 'FlowEq [OUTPUT:Router]',
			dstStation: 'CPU',
			dstStationId: 0,
			dstSection: 'INPUT',
			dstClass: 'Queue',
			dstDisplay: 'CPU [INPUT:Queue]',
			src: 'FlowEq',
			dst: 'CPU',
			caller: 'QueueNet.NetNode.dispatch(NetNode.java:620)',
			nodeJobs: 1,
			queueSize: 0,
			queueCap: -1,
			servers: 1,
			jobId,
			jobClass: 'Class0',
			classId: 0,
			priority: 0,
			enterTime: simTime
		});

		simTime += 0.1;
	}

	const footer: TraceFooter = {
		type: 'footer',
		totalEvents: events.length,
		droppedEvents: 0,
		lastSimTime: parseFloat(simTime.toFixed(4)),
		durationMs: 250,
		part: 1
	};

	return { metadata, events, footer, errorCount: 0 };
}
