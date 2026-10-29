<script lang="ts">
	import type { ActiveModelJob } from '../types/trace';
	import { simEngine } from '../services/simulationEngine.svelte';
	import { formatSimTime, formatCaller } from '../utils/formatting';
	import { getJobClassColor, getPhaseStyle } from '../utils/colors';

	interface Props {
		job: ActiveModelJob;
		onClose: () => void;
	}

	let { job, onClose }: Props = $props();

	let classColor = $derived(getJobClassColor(job.jobClass));
	let classInfo = $derived(
		simEngine.metadata?.classes.find((c) => c.name === job.jobClass)
	);

	// All historical events for this specific job up to the current sequence
	let jobHistory = $derived.by(() => {
		const targetSeq = simEngine.currentIndex >= 0 && simEngine.currentIndex < simEngine.events.length
			? simEngine.events[simEngine.currentIndex].seq
			: Infinity;

		return simEngine.events
			.filter((e) => e.jobId === job.jobId && e.seq <= targetSeq)
			.slice(-25)
			.reverse();
	});

	function handleJumpToEvent(seq: number) {
		simEngine.seekToIndex(seq - 1);
	}
</script>

<aside class="job-inspector">
	<!-- Inspector Header -->
	<div class="inspector-header">
		<div class="header-title">
			<div class="job-tag" style="border-color: {classColor}; color: {classColor};">
				JOB
			</div>
			<div>
				<h2 class="job-title">Job #{job.jobId}</h2>
				<span class="job-class-pill" style="color: {classColor}; border-color: {classColor}40; background: {classColor}15;">
					{job.jobClass}
				</span>
			</div>
		</div>
		<button class="close-btn" onclick={onClose} title="Close Inspector">✕</button>
	</div>

	<div class="inspector-content">
		<!-- 1. Current State & Location Card -->
		<section class="card">
			<h3 class="card-title">CURRENT STATUS & LOCATION</h3>

			<div class="status-banner {job.state.toLowerCase()}">
				{#if job.state === 'IN_FLIGHT'}
					<div class="status-headline">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="5" y1="12" x2="19" y2="12"></line>
							<polyline points="12 5 19 12 12 19"></polyline>
						</svg>
						<span>In Flight (Traversing Link)</span>
					</div>
					<div class="route-display">
						<div class="station-endpoint">
							<span class="ep-label">FROM</span>
							<span class="ep-name">{job.linkSource}</span>
						</div>
						<div class="route-arrow">➔</div>
						<div class="station-endpoint">
							<span class="ep-label">TO</span>
							<span class="ep-name">{job.linkTarget}</span>
						</div>
					</div>
					<div class="progress-wrap">
						<div class="progress-info">
							<span>Link Traversal</span>
							<span class="progress-val">{job.progressPercent ?? 0}%</span>
						</div>
						<div class="progress-bar">
							<div class="progress-fill" style="width: {job.progressPercent ?? 0}%; background: {classColor};"></div>
						</div>
					</div>
				{:else if job.state === 'IN_SERVICE'}
					<div class="status-headline">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10"></circle>
							<polyline points="12 6 12 12 16 14"></polyline>
						</svg>
						<span>In Service at Server</span>
					</div>
					<div class="loc-summary">
						<span class="loc-badge">{job.stationName}</span>
						<span class="core-badge">Server Core #{job.serverIndex ?? 0}</span>
					</div>
				{:else if job.state === 'IN_QUEUE'}
					<div class="status-headline">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="8" y1="6" x2="21" y2="6"></line>
							<line x1="8" y1="12" x2="21" y2="12"></line>
							<line x1="8" y1="18" x2="21" y2="18"></line>
						</svg>
						<span>Queued at Station Buffer</span>
					</div>
					<div class="loc-summary">
						<span class="loc-badge">{job.stationName}</span>
						<span class="queue-badge">Queue Position #{job.queuePosition ?? 1}</span>
					</div>
				{/if}
			</div>

			<div class="time-metrics-grid">
				<div class="metric-item">
					<span class="metric-lbl">ENTERED STATE</span>
					<span class="metric-val">{formatSimTime(job.enterTime ?? 0)}</span>
				</div>
				<div class="metric-item">
					<span class="metric-lbl">TIME IN STATE</span>
					<span class="metric-val highlight">{formatSimTime(job.residenceTime)}</span>
				</div>
				<div class="metric-item">
					<span class="metric-lbl">PRIORITY</span>
					<span class="metric-val">{job.priority}</span>
				</div>
				<div class="metric-item">
					<span class="metric-lbl">CLASS TYPE</span>
					<span class="metric-val">{classInfo?.type || 'Standard'}</span>
				</div>
			</div>
		</section>

		<!-- 2. Actions Card -->
		<section class="card">
			<h3 class="card-title">ACTIONS</h3>
			<div class="action-buttons-row">
				{#if job.lastEventSeq}
					<button class="nav-btn" onclick={() => handleJumpToEvent(job.lastEventSeq!)}>
						Jump to Last Event (Seq #{job.lastEventSeq})
					</button>
				{/if}
				{#if job.stationName}
					<button class="nav-btn secondary" onclick={() => (simEngine.selectedStation = job.stationName || null)}>
						Inspect Station ({job.stationName})
					</button>
				{/if}
			</div>
		</section>

		<!-- 3. Chronological Trace History Card -->
		<section class="card history-card">
			<h3 class="card-title">EVENT TRAJECTORY HISTORY ({jobHistory.length})</h3>
			<p class="history-sub">Chronological events affecting Job #{job.jobId} up to current step.</p>

			{#if jobHistory.length === 0}
				<div class="no-history">No events recorded yet for this job.</div>
			{:else}
				<div class="history-list">
					{#each jobHistory as ev (ev.seq)}
						{@const pStyle = getPhaseStyle(ev.phase)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="history-row" onclick={() => handleJumpToEvent(ev.seq)}>
							<div class="h-seq-time">
								<span class="h-seq">#{ev.seq}</span>
								<span class="h-time">{formatSimTime(ev.t)}</span>
							</div>

							<div class="h-main">
								<div class="h-phase-wrap">
									<span class="phase-pill" style="color: {pStyle.text}; background: {pStyle.bg}; border: 1px solid {pStyle.border};">
										{ev.phase}
									</span>
									<span class="h-stations">
										{ev.srcStation} ➔ {ev.dstStation}
									</span>
								</div>
								{#if ev.caller}
									<span class="h-caller">{formatCaller(ev.caller)}</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</aside>

<style>
	.job-inspector {
		width: 350px;
		background: var(--bg-surface);
		border-left: 1px solid var(--border-base);
		display: flex;
		flex-direction: column;
		height: 100%;
		z-index: 20;
		box-shadow: -4px 0 16px rgba(0, 0, 0, 0.2);
	}

	.inspector-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-base);
		background: var(--bg-card);
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.job-tag {
		font-size: 0.65rem;
		font-weight: 700;
		font-family: ui-monospace, monospace;
		padding: 0.2rem 0.4rem;
		border: 1px solid;
		border-radius: 4px;
	}

	.job-title {
		font-size: 0.95rem;
		font-weight: 700;
		margin: 0;
		color: var(--text-primary);
	}

	.job-class-pill {
		font-size: 0.68rem;
		font-weight: 600;
		padding: 0.05rem 0.4rem;
		border-radius: 3px;
		border: 1px solid;
		display: inline-block;
		margin-top: 0.15rem;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 1rem;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
	}

	.close-btn:hover {
		color: var(--text-primary);
	}

	.inspector-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.card {
		background: var(--bg-card);
		border: 1px solid var(--border-base);
		border-radius: 6px;
		padding: 0.75rem;
	}

	.card-title {
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--text-muted);
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem 0;
	}

	.status-banner {
		padding: 0.6rem;
		border-radius: 4px;
		background: var(--bg-input);
		border: 1px solid var(--border-subtle);
		margin-bottom: 0.6rem;
	}

	.status-headline {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.status-banner.in_flight .status-headline {
		color: var(--accent-cyan);
	}

	.status-banner.in_service .status-headline {
		color: #10b981;
	}

	.status-banner.in_queue .status-headline {
		color: #f59e0b;
	}

	.route-display {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.4rem 0.6rem;
		background: var(--bg-subtle);
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}

	.station-endpoint {
		display: flex;
		flex-direction: column;
	}

	.ep-label {
		font-size: 0.6rem;
		color: var(--text-muted);
		font-weight: 600;
	}

	.ep-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.route-arrow {
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.progress-wrap {
		margin-top: 0.4rem;
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		font-size: 0.68rem;
		color: var(--text-secondary);
		margin-bottom: 0.2rem;
	}

	.progress-val {
		font-weight: 600;
		color: var(--accent-cyan);
	}

	.progress-bar {
		height: 4px;
		background: var(--border-base);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.15s ease;
	}

	.loc-summary {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.loc-badge {
		font-weight: 600;
		font-size: 0.75rem;
		color: var(--text-primary);
	}

	.core-badge {
		font-size: 0.68rem;
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.3);
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
	}

	.queue-badge {
		font-size: 0.68rem;
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
		border: 1px solid rgba(245, 158, 11, 0.3);
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
	}

	.time-metrics-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.4rem;
	}

	.metric-item {
		display: flex;
		flex-direction: column;
		background: var(--bg-input);
		padding: 0.35rem 0.5rem;
		border-radius: 4px;
		border: 1px solid var(--border-subtle);
	}

	.metric-lbl {
		font-size: 0.6rem;
		color: var(--text-muted);
		font-weight: 600;
	}

	.metric-val {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary);
		font-family: ui-monospace, monospace;
	}

	.metric-val.highlight {
		color: var(--accent-cyan);
	}

	.action-buttons-row {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.nav-btn {
		width: 100%;
		padding: 0.35rem 0.6rem;
		background: var(--accent-blue);
		border: 1px solid var(--accent-blue);
		color: #ffffff;
		border-radius: 4px;
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		text-align: center;
		transition: all 0.15s ease;
	}

	.nav-btn:hover {
		background: #0369a1;
	}

	.nav-btn.secondary {
		background: var(--bg-input);
		border-color: var(--border-base);
		color: var(--text-secondary);
	}

	.nav-btn.secondary:hover {
		background: var(--bg-subtle);
		color: var(--text-primary);
	}

	.history-card {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 200px;
	}

	.history-sub {
		font-size: 0.68rem;
		color: var(--text-muted);
		margin: 0 0 0.5rem 0;
	}

	.no-history {
		color: var(--text-muted);
		font-size: 0.72rem;
		padding: 1rem 0;
		text-align: center;
	}

	.history-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.history-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.35rem 0.5rem;
		background: var(--bg-input);
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.1s ease;
	}

	.history-row:hover {
		background: var(--bg-subtle);
		border-color: var(--border-focus);
	}

	.h-seq-time {
		display: flex;
		flex-direction: column;
		min-width: 55px;
		font-family: ui-monospace, monospace;
	}

	.h-seq {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.h-time {
		font-size: 0.62rem;
		color: var(--text-muted);
	}

	.h-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.h-phase-wrap {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.phase-pill {
		font-size: 0.62rem;
		font-weight: 700;
		padding: 0.05rem 0.3rem;
		border-radius: 3px;
	}

	.h-stations {
		font-size: 0.68rem;
		color: var(--text-secondary);
	}

	.h-caller {
		font-size: 0.62rem;
		color: var(--text-muted);
		font-family: ui-monospace, monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
