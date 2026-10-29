import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationEngine } from './simulationEngine.svelte';
import { generateSampleTrace } from './traceParser';

describe('SimulationEngine Playback & State Machine', () => {
	let engine: SimulationEngine;

	beforeEach(() => {
		engine = new SimulationEngine();
		engine.loadTrace(generateSampleTrace());
	});

	it('initializes in clean empty state awaiting trace upload', () => {
		const freshEngine = new SimulationEngine();
		expect(freshEngine.metadata).toBeNull();
		expect(freshEngine.events.length).toBe(0);
		expect(freshEngine.currentIndex).toBe(-1);
		expect(freshEngine.currentSimTime).toBe(0);
		expect(freshEngine.isPlaying).toBe(false);
	});

	it('initializes with sample data on loadSampleTrace', () => {
		expect(engine.metadata).not.toBeNull();
		expect(engine.events.length).toBeGreaterThan(0);
		expect(engine.currentIndex).toBe(-1);
		expect(engine.currentSimTime).toBe(0);
		expect(engine.isPlaying).toBe(false);
	});

	it('advances event-by-event on stepForward', () => {
		const firstEvent = engine.events[0];
		const hasMore = engine.stepForward();

		expect(hasMore).toBe(true);
		expect(engine.currentIndex).toBe(0);
		expect(engine.currentSimTime).toBe(firstEvent.t);
		expect(engine.currentEvent?.seq).toBe(firstEvent.seq);
	});

	it('rewinds state on stepBackward', () => {
		engine.stepForward(); // index 0
		engine.stepForward(); // index 1
		expect(engine.currentIndex).toBe(1);

		engine.stepBackward();
		expect(engine.currentIndex).toBe(0);
	});

	it('seeks accurately to any arbitrary event index', () => {
		const targetIndex = 14;
		engine.seekToIndex(targetIndex);

		expect(engine.currentIndex).toBe(targetIndex);
		expect(engine.currentSimTime).toBe(engine.events[targetIndex].t);
	});

	it('seeks to closest event matching simulation time', () => {
		const sampleTime = engine.events[10].t;
		engine.seekToTime(sampleTime);

		expect(engine.currentSimTime).toBeCloseTo(sampleTime, 4);
		expect(engine.currentIndex).toBeGreaterThanOrEqual(0);
	});

	it('resets state cleanly to before event 0', () => {
		engine.seekToIndex(20);
		expect(engine.currentIndex).toBe(20);

		engine.reset();
		expect(engine.currentIndex).toBe(-1);
		expect(engine.currentSimTime).toBe(0);
		expect(engine.activePackets.length).toBe(0);
	});

	describe('Breakpoints', () => {
		it('pauses simulation when station_event breakpoint is met', () => {
			engine.addBreakpoint({
				id: 'bp-floweq',
				enabled: true,
				type: 'station_event',
				label: 'Pause on FlowEq',
				stationTarget: 'FlowEq'
			});

			const flowEqIdx = engine.events.findIndex((e) => e.srcStation === 'FlowEq');
			expect(flowEqIdx).toBeGreaterThan(0);

			// Seek to just before the event
			engine.seekToIndex(flowEqIdx - 1);
			engine.play();

			// Step forward onto the event
			const stepped = engine.stepForward();
			// Should return false and pause playback
			expect(stepped).toBe(false);
			expect(engine.isPlaying).toBe(false);
			expect(engine.currentEvent?.srcStation).toBe('FlowEq');
		});

		it('pauses simulation on Job ID breakpoint', () => {
			engine.addBreakpoint({
				id: 'bp-job-5',
				enabled: true,
				type: 'job_id',
				label: 'Pause on Job #5',
				jobIdTarget: 5
			});

			// Find first event with jobId = 5
			const job5Idx = engine.events.findIndex((e) => e.jobId === 5);
			expect(job5Idx).toBeGreaterThan(0);

			engine.seekToIndex(job5Idx - 1);
			const stepped = engine.stepForward();
			expect(stepped).toBe(false);
			expect(engine.isPlaying).toBe(false);
			expect(engine.currentEvent?.jobId).toBe(5);
		});

		it('allows toggling breakpoints on and off', () => {
			const bp = engine.breakpoints[0];
			const initial = bp.enabled;

			engine.toggleBreakpoint(bp.id);
			expect(engine.breakpoints[0].enabled).toBe(!initial);

			engine.toggleBreakpoint(bp.id);
			expect(engine.breakpoints[0].enabled).toBe(initial);
		});
	});

	describe('Station Live State Tracking', () => {
		it('tracks resident jobs and server states', () => {
			// Step through initial events until a job dispatches to CPU
			for (let i = 0; i < 5; i++) {
				engine.stepForward();
			}

			const cpuStation = engine.stationsState['CPU'];
			expect(cpuStation).toBeDefined();
			expect(cpuStation.totalServers).toBe(1);
			expect(cpuStation.capacity).toBe(-1);
		});
	});

	describe('Active Model Jobs Tracking', () => {
		it('tracks active jobs across in-flight, in-service, and in-queue states', () => {
			// At startup before event 0, activeModelJobs is empty
			expect(engine.activeModelJobs.length).toBe(0);

			// SEND event (Job #0 departs CPU towards FlowEq)
			engine.stepForward();
			expect(engine.activeModelJobs.length).toBe(1);

			const job0 = engine.activeModelJobs[0];
			expect(job0.jobId).toBe(0);
			expect(job0.state).toBe('IN_FLIGHT');
			expect(job0.linkSource).toBe('CPU');
			expect(job0.linkTarget).toBe('FlowEq');

			// DISPATCH event (Job #0 arrives at FlowEq and enters server)
			engine.stepForward();
			expect(engine.activeModelJobs.length).toBe(1);

			const job0Served = engine.activeModelJobs[0];
			expect(job0Served.jobId).toBe(0);
			expect(job0Served.state).toBe('IN_SERVICE');
			expect(job0Served.stationName).toBe('FlowEq');
			expect(job0Served.serverIndex).toBe(1);
		});

		it('filters active jobs by search query, status, and station', () => {
			// Advance simulation forward several steps to accumulate jobs
			for (let i = 0; i < 8; i++) {
				engine.stepForward();
			}

			expect(engine.activeModelJobs.length).toBeGreaterThan(0);

			// Test search filter
			engine.filterJobSearch = '0';
			const matchJob0 = engine.filteredActiveModelJobs;
			expect(matchJob0.every((j) => String(j.jobId).includes('0') || j.jobClass.includes('0'))).toBe(true);

			engine.filterJobSearch = '';

			// Test status filter
			engine.filterJobStatus = 'IN_SERVICE';
			for (const j of engine.filteredActiveModelJobs) {
				expect(j.state).toBe('IN_SERVICE');
			}

			engine.filterJobStatus = 'ALL';

			// Test selection
			const targetJob = engine.activeModelJobs[0];
			engine.selectJob(targetJob);
			expect(engine.selectedJob?.jobId).toBe(targetJob.jobId);
		});
	});
});
