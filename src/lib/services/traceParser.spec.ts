import { describe, it, expect } from 'vitest';
import {
	generateSampleTrace,
	parseNDJSON,
	extractChunkInfo,
	groupAndSortChunks,
	stitchTraceChunks,
	type ChunkFileInfo
} from './traceParser';

describe('TraceParser and Multi-Chunk Engine', () => {
	it('generates a valid sample trace with metadata, events, and footer', () => {
		const sample = generateSampleTrace();
		expect(sample.metadata).not.toBeNull();
		expect(sample.metadata?.modelName).toBe('ClosedLoopSimulation');
		expect(sample.metadata?.nodes.length).toBeGreaterThanOrEqual(2);
		expect(sample.events.length).toBeGreaterThan(20);
		expect(sample.footer).not.toBeNull();
		expect(sample.errorCount).toBe(0);
	});

	it('parses NDJSON text stream line by line', () => {
		const sample = generateSampleTrace();
		const metaLine = JSON.stringify(sample.metadata);
		const ev1 = JSON.stringify(sample.events[0]);
		const ev2 = JSON.stringify(sample.events[1]);
		const raw = `${metaLine}\n${ev1}\n${ev2}\n`;

		const result = parseNDJSON(raw);
		expect(result.metadata?.modelName).toBe(sample.metadata?.modelName);
		expect(result.events.length).toBe(2);
		expect(result.events[0].seq).toBe(1);
		expect(result.events[1].seq).toBe(2);
	});

	it('gracefully handles malformed JSON lines without crashing', () => {
		const raw = `{"type":"metadata","modelName":"TestModel","classes":[],"nodes":[],"connections":[]}\n{INVALID_JSON\n{"type":"event","seq":1,"t":0.1,"phase":"SEND","event":"EVENT_JOB","eventId":3,"srcStation":"A","dstStation":"B","src":"A","dst":"B"}\n`;

		const result = parseNDJSON(raw);
		expect(result.metadata?.modelName).toBe('TestModel');
		expect(result.events.length).toBe(1);
		expect(result.errorCount).toBe(1);
	});

	describe('Chunk Filename Parser (extractChunkInfo)', () => {
		it('extracts run and part numbers from standard JMT filenames', () => {
			const info1 = extractChunkInfo('JSIM_simulation___JModelSimulation1559749829381431458.xml_run1_part1.ndjson.gz');
			expect(info1.runId).toBe('run1');
			expect(info1.partNumber).toBe(1);

			const info2 = extractChunkInfo('MyModel_run2_part4.ndjson');
			expect(info2.runId).toBe('run2');
			expect(info2.partNumber).toBe(4);

			const info3 = extractChunkInfo('simple_trace_part12.ndjson.gz');
			expect(info3.runId).toBe('run1');
			expect(info3.partNumber).toBe(12);

			const info4 = extractChunkInfo('standalone_trace.ndjson');
			expect(info4.runId).toBe('run1');
			expect(info4.partNumber).toBe(1);
		});
	});

	describe('groupAndSortChunks', () => {
		it('sorts chunk parts in ascending order', () => {
			const mockFiles = [
				new File([''], 'model_run1_part3.ndjson.gz'),
				new File([''], 'model_run1_part1.ndjson.gz'),
				new File([''], 'model_run1_part2.ndjson.gz')
			];

			const groups = groupAndSortChunks(mockFiles);
			expect(groups.has('run1')).toBe(true);
			const chunks = groups.get('run1')!;
			expect(chunks.length).toBe(3);
			expect(chunks[0].partNumber).toBe(1);
			expect(chunks[1].partNumber).toBe(2);
			expect(chunks[2].partNumber).toBe(3);
		});

		it('separates distinct runs into separate groups', () => {
			const mockFiles = [
				new File([''], 'model_run1_part1.ndjson.gz'),
				new File([''], 'model_run2_part1.ndjson.gz'),
				new File([''], 'model_run1_part2.ndjson.gz')
			];

			const groups = groupAndSortChunks(mockFiles);
			expect(groups.size).toBe(2);
			expect(groups.get('run1')?.length).toBe(2);
			expect(groups.get('run2')?.length).toBe(1);
		});
	});

	describe('stitchTraceChunks', () => {
		it('stitches multiple chunk parts into one seamless continuous sequence', () => {
			const sample = generateSampleTrace();
			const part1Events = sample.events.slice(0, 10);
			const part2Events = sample.events.slice(10, 20);

			const chunk1: ChunkFileInfo = {
				file: new File([''], 'model_run1_part1.ndjson'),
				name: 'model_run1_part1.ndjson',
				runId: 'run1',
				partNumber: 1,
				modelPrefix: 'model',
				size: 100
			};
			const chunk2: ChunkFileInfo = {
				file: new File([''], 'model_run1_part2.ndjson'),
				name: 'model_run1_part2.ndjson',
				runId: 'run1',
				partNumber: 2,
				modelPrefix: 'model',
				size: 100
			};

			const stitched = stitchTraceChunks([
				{ info: chunk1, result: { metadata: sample.metadata, events: part1Events, footer: null, errorCount: 0 } },
				{ info: chunk2, result: { metadata: sample.metadata, events: part2Events, footer: sample.footer, errorCount: 0 } }
			]);

			expect(stitched.totalFilesLoaded).toBe(2);
			expect(stitched.partsLoaded).toEqual([1, 2]);
			expect(stitched.events.length).toBe(20);
			expect(stitched.events[0].seq).toBe(1);
			expect(stitched.events[19].seq).toBe(20);
			expect(stitched.metadata?.modelName).toBe(sample.metadata?.modelName);
			expect(stitched.footer).not.toBeNull();
		});

		it('deduplicates overlapping sequence numbers if chunks overlap', () => {
			const sample = generateSampleTrace();
			const overlappingEvents = [sample.events[0], sample.events[1]];

			const chunk: ChunkFileInfo = {
				file: new File([''], 'part.ndjson'),
				name: 'part.ndjson',
				runId: 'run1',
				partNumber: 1,
				modelPrefix: 'm',
				size: 100
			};

			const stitched = stitchTraceChunks([
				{ info: chunk, result: { metadata: sample.metadata, events: overlappingEvents, footer: null, errorCount: 0 } },
				{ info: chunk, result: { metadata: sample.metadata, events: overlappingEvents, footer: null, errorCount: 0 } }
			]);

			expect(stitched.events.length).toBe(2);
		});
	});
});
