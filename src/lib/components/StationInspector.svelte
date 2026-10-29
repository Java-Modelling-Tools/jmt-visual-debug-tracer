<script lang="ts">
	import { simEngine } from '../services/simulationEngine.svelte';
	import { formatSimTime, formatCaller } from '../utils/formatting';
	import { getJobClassColor, getPhaseStyle } from '../utils/colors';

	interface Props {
		stationName: string;
		onClose: () => void;
	}

	let { stationName, onClose }: Props = $props();

	let state = $derived(simEngine.stationsState[stationName]);
	let nodeTopology = $derived(
		simEngine.metadata?.nodes.find((n) => n.name === stationName)
	);

	let queueOccupancyPercent = $derived.by(() => {
		if (!state || state.capacity <= 0) return 0;
		return Math.min(100, Math.round((state.currentQueueSize / state.capacity) * 100));
	});
</script>

<aside class="station-inspector">
	<div class="inspector-header">
		<div class="header-title">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="station-icon">
				<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
				<line x1="8" y1="21" x2="16" y2="21"></line>
				<line x1="12" y1="17" x2="12" y2="21"></line>
			</svg>
			<div>
				<h2 class="station-name">{stationName}</h2>
				<span class="station-type-tag">{state?.nodeType || 'Station'} (ID: {state?.id ?? '-'})</span>
			</div>
		</div>
		<button class="close-btn" onclick={onClose} title="Close">✕</button>
	</div>

	<div class="inspector-content">
		<!-- Section: Capacity & Queue Utilization -->
		<section class="card">
			<h3 class="card-title">QUEUE BUFFER OCCUPANCY</h3>
			<div class="gauge-row">
				<div class="stat-box">
					<span class="stat-label">QUEUED JOBS</span>
					<span class="stat-value">{state?.currentQueueSize ?? 0}</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">CAPACITY</span>
					<span class="stat-value">{state && state.capacity > 0 ? state.capacity : '∞ (Infinite)'}</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">UTILIZATION</span>
					<span class="stat-value {queueOccupancyPercent > 80 ? 'text-red' : 'text-cyan'}">
						{state && state.capacity > 0 ? `${queueOccupancyPercent}%` : 'N/A'}
					</span>
				</div>
			</div>

			<!-- Visual Capacity Meter -->
			{#if state && state.capacity > 0}
				<div class="progress-bar-bg">
					<div
						class="progress-bar-fill {queueOccupancyPercent > 80 ? 'danger' : ''}"
						style="width: {queueOccupancyPercent}%"
					></div>
				</div>
			{/if}

			{#if state && state.droppedCount > 0}
				<div class="drop-alert-banner">
					<span><strong>{state.droppedCount}</strong> dropped packets recorded at this queue</span>
				</div>
			{/if}
		</section>

		<!-- Section: Parallel Server Cores -->
		<section class="card">
			<div class="section-header-flex">
				<h3 class="card-title">SERVER CORES</h3>
				<span class="server-count-badge">
					{state?.servers?.filter((s) => s.busy).length ?? 0} / {state?.totalServers ?? 1} Busy
				</span>
			</div>

			<div class="servers-grid">
				{#if state && state.servers}
					{#each state.servers as server (server.id)}
						<div class="server-card {server.busy ? 'busy' : 'idle'}">
							<div class="server-header">
								<span class="core-tag">Core #{server.id}</span>
								<span class="status-indicator {server.busy ? 'busy-dot' : 'idle-dot'}"></span>
							</div>

							{#if server.busy && server.jobId !== undefined}
								<div class="server-job-info">
									<div class="job-badge" style="border-left-color: {getJobClassColor(server.jobClass)};">
										<span class="job-id">Job #{server.jobId}</span>
										<span class="job-class">{server.jobClass}</span>
									</div>
									{#if server.startSimTime !== undefined}
										<span class="sim-time-text">Started @ {formatSimTime(server.startSimTime)}</span>
									{/if}
								</div>
							{:else}
								<div class="server-idle-state">Idle</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</section>

		<!-- Section: Queued Jobs List -->
		<section class="card">
			<div class="section-header-flex">
				<h3 class="card-title">QUEUE RESIDENTS</h3>
				<span class="count-pill">{state?.queueJobs?.length ?? 0}</span>
			</div>

			{#if state && state.queueJobs && state.queueJobs.length > 0}
				<div class="jobs-list">
					{#each state.queueJobs as job (job.jobId)}
						<div class="job-row">
							<div class="job-color-stripe" style="background: {getJobClassColor(job.jobClass)};"></div>
							<div class="job-details">
								<span class="job-id-text">Job #{job.jobId}</span>
								<span class="job-class-text">{job.jobClass}</span>
							</div>
							<div class="job-extra">
								<span class="priority-badge">Pri {job.priority}</span>
								{#if job.enterTime !== undefined}
									<span class="enter-time">{formatSimTime(job.enterTime)}</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-notice">Queue buffer is currently empty.</div>
			{/if}
		</section>

		<!-- Section: Internal Node Sections (JMT Architecture) -->
		{#if nodeTopology?.sections}
			<section class="card">
				<h3 class="card-title">NETNODE SECTIONS</h3>
				<div class="sections-spec">
					<div class="spec-row">
						<span class="spec-key">Input:</span>
						<span class="spec-val">{nodeTopology.sections.input?.type || 'NONE'}</span>
					</div>
					<div class="spec-row">
						<span class="spec-key">Service:</span>
						<span class="spec-val">{nodeTopology.sections.service?.type || 'NONE'} ({nodeTopology.sections.service?.servers ?? 1} servers)</span>
					</div>
					<div class="spec-row">
						<span class="spec-key">Output:</span>
						<span class="spec-val">{nodeTopology.sections.output?.type || 'NONE'}</span>
					</div>
				</div>
			</section>
		{/if}

		<!-- Section: Recent Station Events -->
		<section class="card">
			<h3 class="card-title">RECENT STATION EVENTS</h3>
			{#if state && state.recentEvents && state.recentEvents.length > 0}
				<div class="events-mini-list">
					{#each state.recentEvents as ev (ev.seq)}
						{@const pStyle = getPhaseStyle(ev.phase)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="mini-event-item" onclick={() => simEngine.seekToIndex(ev.seq - 1)}>
							<div class="mini-event-top">
								<span class="ev-seq">#{ev.seq}</span>
								<span class="phase-pill" style="background: {pStyle.bg}; color: {pStyle.text}; border-color: {pStyle.border};">
									{ev.phase}
								</span>
								<span class="ev-name">{ev.event}</span>
								<span class="ev-time">{formatSimTime(ev.t)}</span>
							</div>
							<div class="mini-event-bot">
								<span class="route-text">{ev.srcStation} → {ev.dstStation}</span>
								{#if ev.jobId !== undefined}
									<span class="job-id-pill" style="color: {getJobClassColor(ev.jobClass)};">
										#{ev.jobId} {ev.jobClass}
									</span>
								{/if}
								{#if ev.caller}
									<span class="caller-text" title={ev.caller}>{formatCaller(ev.caller)}</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-notice">No events recorded for this station yet.</div>
			{/if}
		</section>
	</div>
</aside>

<style>
	.station-inspector {
		width: 360px;
		height: 100%;
		background: var(--bg-surface);
		border-left: 1px solid var(--border-base);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		user-select: none;
		z-index: 15;
	}

	.inspector-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1.15rem;
		border-bottom: 1px solid var(--border-base);
		background: var(--bg-card);
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.station-icon {
		color: var(--accent-cyan);
	}

	.station-name {
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.station-type-tag {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-family: ui-monospace, monospace;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 1rem;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
	}

	.close-btn:hover {
		background: var(--bg-subtle);
		color: var(--text-primary);
	}

	.inspector-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.card {
		background: var(--bg-card);
		border: 1px solid var(--border-base);
		border-radius: 6px;
		padding: 0.85rem;
	}

	.card-title {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin: 0 0 0.65rem 0;
	}

	.section-header-flex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.65rem;
	}

	.section-header-flex .card-title {
		margin: 0;
	}

	.gauge-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.4rem;
		margin-bottom: 0.5rem;
	}

	.stat-box {
		background: var(--bg-base);
		padding: 0.45rem;
		border-radius: 4px;
		border: 1px solid var(--border-base);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-label {
		font-size: 0.58rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.stat-value {
		font-size: 0.82rem;
		font-family: ui-monospace, monospace;
		font-weight: 700;
		color: var(--text-primary);
		margin-top: 0.15rem;
	}

	.text-cyan { color: var(--accent-cyan); }
	.text-red { color: var(--accent-rose); }

	.progress-bar-bg {
		width: 100%;
		height: 5px;
		background: var(--bg-base);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: var(--accent-cyan);
		transition: width 0.15s ease;
	}

	.progress-bar-fill.danger {
		background: var(--accent-rose);
	}

	.drop-alert-banner {
		margin-top: 0.65rem;
		padding: 0.45rem 0.65rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--accent-rose);
		border-radius: 4px;
		color: var(--accent-rose);
		font-size: 0.72rem;
	}

	.server-count-badge, .count-pill {
		font-size: 0.68rem;
		font-family: ui-monospace, monospace;
		background: var(--bg-base);
		color: var(--text-muted);
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
	}

	.servers-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.server-card {
		background: var(--bg-base);
		border: 1px solid var(--border-base);
		border-radius: 4px;
		padding: 0.45rem;
	}

	.server-card.busy {
		border-color: var(--accent-amber);
	}

	.server-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.35rem;
	}

	.core-tag {
		font-size: 0.62rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.status-indicator {
		width: 5px;
		height: 5px;
		border-radius: 50%;
	}

	.idle-dot { background: var(--accent-emerald); }
	.busy-dot { background: var(--accent-amber); }

	.server-job-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.job-badge {
		border-left: 2px solid;
		padding-left: 0.3rem;
		display: flex;
		flex-direction: column;
	}

	.job-id {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-primary);
		font-family: ui-monospace, monospace;
	}

	.job-class {
		font-size: 0.62rem;
		color: var(--text-muted);
	}

	.sim-time-text {
		font-size: 0.62rem;
		font-family: ui-monospace, monospace;
		color: var(--text-muted);
	}

	.server-idle-state {
		font-size: 0.68rem;
		color: var(--text-muted);
	}

	.jobs-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		max-height: 160px;
		overflow-y: auto;
	}

	.job-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--bg-base);
		padding: 0.35rem 0.5rem;
		border-radius: 4px;
		border: 1px solid var(--border-base);
	}

	.job-color-stripe {
		width: 3px;
		height: 22px;
		border-radius: 1px;
	}

	.job-details {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.job-id-text {
		font-size: 0.72rem;
		font-weight: 700;
		font-family: ui-monospace, monospace;
		color: var(--text-primary);
	}

	.job-class-text {
		font-size: 0.62rem;
		color: var(--text-muted);
	}

	.job-extra {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.1rem;
	}

	.priority-badge {
		font-size: 0.62rem;
		background: var(--bg-subtle);
		color: var(--text-secondary);
		padding: 0.05rem 0.3rem;
		border-radius: 3px;
	}

	.enter-time {
		font-size: 0.62rem;
		font-family: ui-monospace, monospace;
		color: var(--text-muted);
	}

	.empty-notice {
		font-size: 0.72rem;
		color: var(--text-muted);
		text-align: center;
		padding: 0.65rem 0;
	}

	.sections-spec {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.spec-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.72rem;
	}

	.spec-key { color: var(--text-muted); }
	.spec-val { color: var(--text-secondary); font-family: ui-monospace, monospace; }

	.events-mini-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.mini-event-item {
		background: var(--bg-base);
		border: 1px solid var(--border-base);
		border-radius: 4px;
		padding: 0.35rem 0.5rem;
		cursor: pointer;
		transition: border-color 0.12s ease;
	}

	.mini-event-item:hover {
		border-color: var(--accent-cyan);
	}

	.mini-event-top {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.68rem;
	}

	.ev-seq {
		font-family: ui-monospace, monospace;
		font-weight: 700;
		color: var(--text-muted);
	}

	.phase-pill {
		font-size: 0.62rem;
		font-weight: 700;
		padding: 0.05rem 0.3rem;
		border-radius: 3px;
		border: 1px solid;
	}

	.ev-name {
		font-weight: 600;
		color: var(--text-primary);
		flex: 1;
	}

	.ev-time {
		font-family: ui-monospace, monospace;
		color: var(--text-muted);
	}

	.mini-event-bot {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.2rem;
		font-size: 0.62rem;
	}

	.route-text {
		color: var(--text-secondary);
	}

	.job-id-pill {
		font-family: ui-monospace, monospace;
		font-weight: 700;
	}

	.caller-text {
		color: var(--text-muted);
		margin-left: auto;
		font-family: ui-monospace, monospace;
	}
</style>
