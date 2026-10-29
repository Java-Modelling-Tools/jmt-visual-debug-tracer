import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StationInspector from './StationInspector.svelte';
import JobInspector from './JobInspector.svelte';
import BreakpointModal from './BreakpointModal.svelte';
import { simEngine } from '../services/simulationEngine.svelte';
import { generateSampleTrace } from '../services/traceParser';

describe('StationInspector & JobInspector', () => {
	it('mounts and renders StationInspector without throwing error 500', async () => {
		simEngine.loadTrace(generateSampleTrace());
		// step a few times to get some events into recentEvents
		simEngine.stepForward();
		simEngine.stepForward();
		simEngine.stepForward();

		expect(() => {
			render(StationInspector, {
				stationName: 'CPU',
				onClose: () => {}
			});
		}).not.toThrow();
	});

	it('mounts and renders JobInspector without throwing error 500', async () => {
		simEngine.loadTrace(generateSampleTrace());
		simEngine.stepForward();
		simEngine.stepForward();
		simEngine.stepForward();

		const job = simEngine.activeModelJobs[0];
		expect(job).toBeDefined();

		expect(() => {
			render(JobInspector, {
				job,
				onClose: () => {}
			});
		}).not.toThrow();
	});

	it('mounts BreakpointModal without throwing error 500 even when adding multiple job breakpoints', async () => {
		// Simulate adding job breakpoint twice
		simEngine.addBreakpoint({
			id: 'bp-job-0',
			enabled: true,
			type: 'job_id',
			label: 'Pause on Job #0',
			jobIdTarget: 0
		});
		simEngine.addBreakpoint({
			id: 'bp-job-0',
			enabled: true,
			type: 'job_id',
			label: 'Pause on Job #0',
			jobIdTarget: 0
		});

		expect(() => {
			render(BreakpointModal, {
				onClose: () => {}
			});
		}).not.toThrow();
	});
});
