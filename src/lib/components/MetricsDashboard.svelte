<script lang="ts">
	import { simEngine } from '../services/simulationEngine.svelte';
	import { getJobClassColor } from '../utils/colors';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let completedJobs = $derived.by(() => {
		let total = 0;
		for (const key in simEngine.stationsState) {
			const st = simEngine.stationsState[key];
			if (st.nodeType === 'Sink') total += st.completedCount;
		}
		return total;
	});

	let throughput = $derived.by(() => {
		if (simEngine.currentSimTime <= 0) return 0;
		return (completedJobs / simEngine.currentSimTime).toFixed(2);
	});

	let stationsOccupancy = $derived.by(() => {
		const list = [];
		for (const key in simEngine.stationsState) {
			const st = simEngine.stationsState[key];
			const cap = st.capacity;
			const current = st.currentQueueSize;
			const percent = cap > 0 ? Math.min(100, Math.round((current / cap) * 100)) : 0;
			list.push({
				name: st.name,
				current,
				cap: cap > 0 ? cap : '∞',
				percent,
				drops: st.droppedCount
			});
		}
		return list;
	});
</script>

<aside class="metrics-drawer">
	<div class="metrics-header">
		<div class="title-flex">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="20" x2="18" y2="10"></line>
				<line x1="12" y1="20" x2="12" y2="4"></line>
				<line x1="6" y1="20" x2="6" y2="14"></line>
			</svg>
			<h2 class="title">Network Analytics</h2>
		</div>
		<button class="close-btn" onclick={onClose}>✕</button>
	</div>

	<div class="metrics-content">
		<!-- KPI Row -->
		<div class="kpi-grid">
			<div class="kpi-card">
				<span class="kpi-label">COMPLETED</span>
				<span class="kpi-value cyan">{completedJobs}</span>
			</div>
			<div class="kpi-card">
				<span class="kpi-label">THROUGHPUT</span>
				<span class="kpi-value green">{throughput} <small>jobs/s</small></span>
			</div>
			<div class="kpi-card">
				<span class="kpi-label">DROPS</span>
				<span class="kpi-value {simEngine.totalDropsSoFar > 0 ? 'red' : ''}">
					{simEngine.totalDropsSoFar}
				</span>
			</div>
		</div>

		<!-- Station Queue Occupancies -->
		<section class="metric-section">
			<h3 class="section-title">STATION QUEUE OCCUPANCY</h3>
			<div class="bars-container">
				{#if stationsOccupancy.length === 0}
					<span class="empty-note">No stations active.</span>
				{:else}
					{#each stationsOccupancy as st (st.name)}
						<div class="station-occupancy-row">
							<div class="station-meta">
								<span class="station-name">{st.name}</span>
								<span class="station-stats">
									{st.current} / {st.cap} ({st.percent}%)
									{#if st.drops > 0}
										<span class="drop-tag">{st.drops} drops</span>
									{/if}
								</span>
							</div>
							<div class="occupancy-track">
								<div
									class="occupancy-fill {st.percent > 80 ? 'danger' : ''}"
									style="width: {st.percent}%"
								></div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</section>

		<!-- Job Classes Breakdown -->
		<section class="metric-section">
			<h3 class="section-title">WORKLOAD CLASSES</h3>
			<div class="classes-grid">
				{#if simEngine.metadata && simEngine.metadata.classes.length > 0}
					{#each simEngine.metadata.classes as cls (cls.name)}
						{@const color = getJobClassColor(cls.name, cls.id)}
						<div class="class-card" style="border-left-color: {color};">
							<div class="class-top">
								<span class="class-name">{cls.name}</span>
								<span class="class-type">{cls.type}</span>
							</div>
							<div class="class-bot">
								<span class="class-pri">Priority {cls.priority}</span>
								<span class="class-ref">Ref: {cls.referenceNode || 'Source'}</span>
							</div>
						</div>
					{/each}
				{:else}
					<span class="empty-note">No classes defined.</span>
				{/if}
			</div>
		</section>
	</div>
</aside>

<style>
	.metrics-drawer {
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

	.metrics-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1.15rem;
		background: var(--bg-card);
		border-bottom: 1px solid var(--border-base);
	}

	.title-flex {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-primary);
	}

	.title {
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 1rem;
		padding: 0.2rem 0.4rem;
	}

	.close-btn:hover { color: var(--text-primary); }

	.metrics-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.4rem;
	}

	.kpi-card {
		background: var(--bg-card);
		border: 1px solid var(--border-base);
		border-radius: 5px;
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.kpi-label {
		font-size: 0.58rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.kpi-value {
		font-size: 0.95rem;
		font-family: ui-monospace, monospace;
		font-weight: 700;
		color: var(--text-primary);
		margin-top: 0.15rem;
	}

	.kpi-value small {
		font-size: 0.6rem;
		color: var(--text-muted);
		font-weight: 400;
	}

	.cyan { color: var(--accent-cyan); }
	.green { color: var(--accent-emerald); }
	.red { color: var(--accent-rose); }

	.metric-section {
		background: var(--bg-card);
		border: 1px solid var(--border-base);
		border-radius: 6px;
		padding: 0.85rem;
	}

	.section-title {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin: 0 0 0.65rem 0;
	}

	.bars-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.station-occupancy-row {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.station-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.72rem;
	}

	.station-name {
		font-weight: 600;
		color: var(--text-primary);
	}

	.station-stats {
		font-family: ui-monospace, monospace;
		color: var(--text-secondary);
	}

	.drop-tag {
		color: var(--accent-rose);
		font-weight: 700;
		margin-left: 0.3rem;
	}

	.occupancy-track {
		width: 100%;
		height: 5px;
		background: var(--bg-base);
		border-radius: 2px;
		overflow: hidden;
	}

	.occupancy-fill {
		height: 100%;
		background: var(--accent-cyan);
		border-radius: 2px;
		transition: width 0.15s ease;
	}

	.occupancy-fill.danger {
		background: var(--accent-rose);
	}

	.classes-grid {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.class-card {
		background: var(--bg-base);
		border: 1px solid var(--border-base);
		border-left: 2px solid;
		border-radius: 4px;
		padding: 0.45rem 0.65rem;
	}

	.class-top {
		display: flex;
		justify-content: space-between;
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.class-type {
		font-size: 0.62rem;
		font-family: ui-monospace, monospace;
		color: var(--text-muted);
	}

	.class-bot {
		display: flex;
		justify-content: space-between;
		margin-top: 0.15rem;
		font-size: 0.68rem;
		color: var(--text-muted);
	}

	.empty-note {
		font-size: 0.72rem;
		color: var(--text-muted);
	}
</style>
