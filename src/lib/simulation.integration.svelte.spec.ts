import { describe, it, expect } from 'vitest';
import {
	generateSampleTrace,
	stitchTraceChunks,
	type ChunkFileInfo
} from './services/traceParser';
import { SimulationEngine } from './services/simulationEngine.svelte';

describe('End-to-End Simulation Pipeline Integration', () => {
	it('integrates chunk splitting, multi-file stitching, and playback execution', () => {
		// Generate full baseline trace
		const fullTrace = generateSampleTrace();
		const total = fullTrace.events.length;
		expect(total).toBeGreaterThan(15);

		// Simulate rolling chunk split (3 chunks)
		const chunkSize = Math.ceil(total / 3);
		const chunk1Events = fullTrace.events.slice(0, chunkSize);
		const chunk2Events = fullTrace.events.slice(chunkSize, chunkSize * 2);
		const chunk3Events = fullTrace.events.slice(chunkSize * 2);

		const chunk1Info: ChunkFileInfo = {
			file: new File([''], 'WebArch_run1_part1.ndjson'),
			name: 'WebArch_run1_part1.ndjson',
			runId: 'run1',
			partNumber: 1,
			modelPrefix: 'WebArch',
			size: 1024
		};
		const chunk2Info: ChunkFileInfo = {
			file: new File([''], 'WebArch_run1_part2.ndjson'),
			name: 'WebArch_run1_part2.ndjson',
			runId: 'run1',
			partNumber: 2,
			modelPrefix: 'WebArch',
			size: 1024
		};
		const chunk3Info: ChunkFileInfo = {
			file: new File([''], 'WebArch_run1_part3.ndjson'),
			name: 'WebArch_run1_part3.ndjson',
			runId: 'run1',
			partNumber: 3,
			modelPrefix: 'WebArch',
			size: 1024
		};

		// Multi-file stitch
		const stitched = stitchTraceChunks([
			{ info: chunk1Info, result: { metadata: fullTrace.metadata, events: chunk1Events, footer: null, errorCount: 0 } },
			{ info: chunk2Info, result: { metadata: fullTrace.metadata, events: chunk2Events, footer: null, errorCount: 0 } },
			{ info: chunk3Info, result: { metadata: fullTrace.metadata, events: chunk3Events, footer: fullTrace.footer, errorCount: 0 } }
		]);

		expect(stitched.totalFilesLoaded).toBe(3);
		expect(stitched.partsLoaded).toEqual([1, 2, 3]);
		expect(stitched.events.length).toBe(total);

		// Monotonic verification: every event sequence must be 1, 2, 3...
		for (let i = 0; i < stitched.events.length; i++) {
			expect(stitched.events[i].seq).toBe(i + 1);
		}

		// Feed stitched timeline into SimulationEngine
		const engine = new SimulationEngine();
		engine.loadTrace(stitched);

		expect(engine.totalEvents).toBe(total);
		expect(engine.loadedFilesCount).toBe(3);
		expect(engine.loadedParts).toEqual([1, 2, 3]);
		expect(engine.currentRunId).toBe('run1');

		// Run simulation forward across the seam of chunks
		// Step up to and past the chunk boundaries
		while (engine.currentIndex < chunkSize + 5) {
			const stepped = engine.stepForward();
			expect(stepped).toBe(true);
		}

		// Check that live simulation time and sequence are accurate
		expect(engine.currentIndex).toBe(chunkSize + 5);
		expect(engine.currentSimTime).toBe(stitched.events[chunkSize + 5].t);

		// Check station state is actively populated
		const cpuStation = engine.stationsState['CPU'];
		expect(cpuStation).toBeDefined();

		// Test fast seeking across chunk boundaries
		engine.seekToIndex(total - 1);
		expect(engine.currentIndex).toBe(total - 1);
		expect(engine.progressPercent).toBe(100);

		// Rewind back to middle chunk
		engine.seekToIndex(chunkSize);
		expect(engine.currentIndex).toBe(chunkSize);
	});
});
