<script lang="ts">
	import type { ActivePacket } from '../types/trace';
	import { simEngine } from '../services/simulationEngine.svelte';
	import { formatSimTime } from '../utils/formatting';
	import { getJobClassColor } from '../utils/colors';

	interface Props {
		packet: ActivePacket;
		onClose: () => void;
	}

	let { packet, onClose }: Props = $props();

	let classColor = $derived(getJobClassColor(packet.jobClass));
	let classInfo = $derived(
		simEngine.metadata?.classes.find((c) => c.name === packet.jobClass)
	);
</script>

<aside class="packet-inspector">
	<div class="inspector-header">
		<div class="header-title">
			<div class="packet-tag" style="border-color: {classColor}; color: {classColor};">
				PKG
			</div>
			<div>
				<h2 class="packet-title">Job #{packet.jobId}</h2>
				<span class="packet-class-pill" style="color: {classColor};">
					{packet.jobClass}
				</span>
			</div>
		</div>
		<button class="close-btn" onclick={onClose} title="Close">✕</button>
	</div>

	<div class="inspector-content">
		<!-- Transit Info Card -->
		<section class="card">
			<h3 class="card-title">TRANSIT LINK TRAVERSAL</h3>
			<div class="route-display">
				<div class="station-endpoint">
					<span class="ep-label">FROM</span>
					<span class="ep-name">{packet.srcStation}</span>
					<span class="ep-sec">{packet.srcSection || 'OUTPUT'}</span>
				</div>
				<div class="route-arrow">➔</div>
				<div class="station-endpoint">
					<span class="ep-label">TO</span>
					<span class="ep-name">{packet.dstStation}</span>
					<span class="ep-sec">{packet.dstSection || 'INPUT'}</span>
				</div>
			</div>

			<!-- Transit Progress Bar -->
			<div class="progress-wrap">
				<div class="progress-info">
					<span class="progress-label">Link Traversal</span>
					<span class="progress-val">{Math.round(packet.progress * 100)}%</span>
				</div>
				<div class="progress-track">
					<div class="progress-fill" style="width: {packet.progress * 100}%; background: {classColor};"></div>
				</div>
			</div>
		</section>

		<!-- Job Specification Card -->
		<section class="card">
			<h3 class="card-title">PACKET ATTRIBUTES</h3>
			<div class="spec-grid">
				<div class="spec-item">
					<span class="k">Job ID:</span>
					<span class="v cyan">#{packet.jobId}</span>
				</div>
				<div class="spec-item">
					<span class="k">Priority:</span>
					<span class="v">{packet.priority}</span>
				</div>
				<div class="spec-item">
					<span class="k">Workload Type:</span>
					<span class="v">{classInfo?.type || 'OPEN'}</span>
				</div>
				<div class="spec-item">
					<span class="k">Departure Clock:</span>
					<span class="v">{formatSimTime(packet.startTime)}</span>
				</div>
				<div class="spec-item">
					<span class="k">Scheduled Arrival:</span>
					<span class="v">{formatSimTime(packet.schedTime)}</span>
				</div>
				<div class="spec-item">
					<span class="k">Trigger Event:</span>
					<span class="v">{packet.event}</span>
				</div>
			</div>
		</section>

		<!-- Breakpoint Action -->
		<section class="card">
			<h3 class="card-title">BREAKPOINT TRIGGER</h3>
			<p class="bp-desc">Pause playback when Job #{packet.jobId} is scheduled or arrives:</p>
			<button
				class="btn-bp"
				onclick={() => {
					simEngine.addBreakpoint({
						id: `bp-job-${packet.jobId}`,
						enabled: true,
						type: 'job_id',
						label: `Pause on Job #${packet.jobId}`,
						jobIdTarget: packet.jobId
					});
				}}
			>
				+ Break on Job #{packet.jobId}
			</button>
		</section>
	</div>
</aside>

<style>
	.packet-inspector {
		width: 340px;
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

	.packet-tag {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: var(--bg-base);
		border: 1px solid;
		border-radius: 6px;
		font-size: 0.68rem;
		font-weight: 800;
		font-family: ui-monospace, monospace;
	}

	.packet-title {
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		font-family: ui-monospace, monospace;
	}

	.packet-class-pill {
		font-size: 0.72rem;
		font-weight: 600;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 1rem;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
	}

	.close-btn:hover { color: var(--text-primary); }

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

	.route-display {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--bg-base);
		border: 1px solid var(--border-base);
		border-radius: 5px;
		padding: 0.55rem;
		margin-bottom: 0.65rem;
	}

	.station-endpoint {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
	}

	.ep-label {
		font-size: 0.58rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.ep-name {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.ep-sec {
		font-size: 0.62rem;
		font-family: ui-monospace, monospace;
		color: var(--text-muted);
	}

	.route-arrow {
		color: var(--accent-cyan);
		font-size: 0.9rem;
	}

	.progress-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		font-size: 0.68rem;
		color: var(--text-muted);
	}

	.progress-track {
		width: 100%;
		height: 5px;
		background: var(--bg-base);
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.05s linear;
	}

	.spec-grid {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.spec-item {
		display: flex;
		justify-content: space-between;
		font-size: 0.72rem;
	}

	.spec-item .k { color: var(--text-muted); }
	.spec-item .v { color: var(--text-primary); font-family: ui-monospace, monospace; }
	.spec-item .v.cyan { color: var(--accent-cyan); font-weight: 700; }

	.bp-desc {
		font-size: 0.72rem;
		color: var(--text-muted);
		margin: 0 0 0.5rem 0;
	}

	.btn-bp {
		width: 100%;
		padding: 0.4rem;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid var(--accent-amber);
		border-radius: 5px;
		color: var(--accent-amber);
		font-size: 0.74rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.12s ease;
	}

	.btn-bp:hover {
		background: rgba(245, 158, 11, 0.2);
	}
</style>
