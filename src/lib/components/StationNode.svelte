<script lang="ts">
	import type { NodeLayout } from '../types/trace';
	import { simEngine } from '../services/simulationEngine.svelte';
	import { STATION_TYPE_COLORS, getJobClassColor } from '../utils/colors';

	interface Props {
		layout: NodeLayout;
		isSelected: boolean;
		onSelect: (name: string) => void;
		onDragStart: (e: MouseEvent, name: string) => void;
	}

	let { layout, isSelected, onSelect, onDragStart }: Props = $props();

	let state = $derived(simEngine.stationsState[layout.name]);
	let colors = $derived(STATION_TYPE_COLORS[layout.nodeType] || STATION_TYPE_COLORS.Station);

	let currentQueueSize = $derived(state?.currentQueueSize ?? state?.queueJobs.length ?? 0);
	let capacity = $derived(state?.capacity ?? -1);
	let queuePercent = $derived(
		capacity > 0 ? Math.min(100, (currentQueueSize / capacity) * 100) : 0
	);

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		onSelect(layout.name);
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 0) {
			onDragStart(e, layout.name);
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<g
	class="station-node {isSelected ? 'selected' : ''}"
	transform="translate({layout.x}, {layout.y})"
	onclick={handleClick}
	onmousedown={handleMouseDown}
>
	<!-- Outer Station Card -->
	<rect
		width={layout.width}
		height={layout.height}
		rx="6"
		ry="6"
		class="node-background"
		style="fill: var(--bg-surface); stroke: {isSelected ? 'var(--accent-cyan)' : 'var(--border-base)'};"
	/>

	<!-- Top Header Bar -->
	<path
		d="M 0 6 Q 0 0 6 0 L {layout.width - 6} 0 Q {layout.width} 0 {layout.width} 6 L {layout.width} 26 L 0 26 Z"
		class="node-header-bg"
		style="fill: var(--bg-card); stroke-bottom: var(--border-base);"
	/>
	<line x1="0" y1="26" x2={layout.width} y2="26" stroke="var(--border-base)" stroke-width="1" />

	<!-- Station Type Dot Indicator -->
	<circle cx="14" cy="13" r="4" style="fill: {colors.accent};" />

	<!-- Station Name -->
	<text x="24" y="16.5" class="node-title">
		{layout.name}
	</text>

	<!-- Type Tag -->
	<rect
		x={layout.width - 56}
		y="6"
		width="48"
		height="14"
		rx="3"
		ry="3"
		class="type-pill-bg"
		style="fill: var(--bg-subtle); stroke: var(--border-subtle);"
	/>
	<text x={layout.width - 32} y="16" class="node-type-label" text-anchor="middle">
		{layout.nodeType}
	</text>

	<!-- Input Section -->
	<g transform="translate(10, 34)">
		<text x="0" y="9" class="section-label">QUEUE</text>
		<text x="68" y="9" class="section-val">
			{currentQueueSize} / {capacity > 0 ? capacity : '∞'}
		</text>

		<!-- Queue Capacity Progress Bar -->
		<rect x="0" y="14" width="88" height="4" rx="2" class="bar-track" />
		<rect
			x="0"
			y="14"
			width={(queuePercent / 100) * 88}
			height="4"
			rx="2"
			class="bar-fill {queuePercent > 80 ? 'bar-danger' : ''}"
		/>

		<!-- Queued Job Dots -->
		<g transform="translate(0, 24)">
			{#if state && state.queueJobs.length > 0}
				{#each state.queueJobs.slice(0, 6) as job, idx (job.jobId)}
					<circle
						cx={5 + idx * 13}
						cy="8"
						r="4"
						style="fill: {getJobClassColor(job.jobClass)};"
						class="job-dot"
					>
						<title>Job #{job.jobId} ({job.jobClass})</title>
					</circle>
				{/each}
				{#if state.queueJobs.length > 6}
					<text x="82" y="11" class="more-jobs-text">+{state.queueJobs.length - 6}</text>
				{/if}
			{:else}
				<text x="0" y="10" class="empty-state-text">idle</text>
			{/if}
		</g>
	</g>

	<!-- Divider between Queue and Servers -->
	<line x1="108" y1="32" x2="108" y2="108" class="internal-divider" />

	<!-- Service Section -->
	<g transform="translate(118, 34)">
		<text x="0" y="9" class="section-label">SERVERS</text>
		<text x="54" y="9" class="section-val">
			{state?.servers.filter((s) => s.busy).length ?? 0}/{state?.totalServers ?? 1}
		</text>

		<!-- Server Slots Grid -->
		<g transform="translate(0, 16)">
			{#if state && state.servers.length > 0}
				{#each state.servers.slice(0, 4) as server, idx (server.id)}
					<g transform="translate({(idx % 2) * 38}, {Math.floor(idx / 2) * 22})">
						<rect
							x="0"
							y="0"
							width="34"
							height="18"
							rx="3"
							class="server-box {server.busy ? 'server-busy' : 'server-idle'}"
						/>
						<text x="17" y="12" text-anchor="middle" class="server-text">
							{server.busy ? `#${server.jobId}` : 'IDLE'}
						</text>
					</g>
				{/each}
			{/if}
		</g>
	</g>

	<!-- Drop Badge Alert -->
	{#if state && state.droppedCount > 0}
		<g transform="translate({layout.width - 24}, {layout.height - 22})">
			<rect x="-4" y="-2" width="24" height="15" rx="3" class="drop-badge-rect" />
			<text x="8" y="9" class="drop-badge-text" text-anchor="middle">
				{state.droppedCount}
			</text>
			<title>{state.droppedCount} drops</title>
		</g>
	{/if}

	<!-- Ingress / Egress Ports -->
	<circle cx="0" cy={layout.height / 2} r="3.5" class="port-indicator in-port" />
	<circle cx={layout.width} cy={layout.height / 2} r="3.5" class="port-indicator out-port" />
</g>

<style>
	.station-node {
		cursor: grab;
		user-select: none;
	}

	.station-node:active {
		cursor: grabbing;
	}

	.station-node:hover .node-background {
		stroke: var(--text-secondary) !important;
	}

	.station-node.selected .node-background {
		stroke-width: 2px;
	}

	.node-background {
		stroke-width: 1px;
		transition: stroke 0.12s ease;
	}

	.node-title {
		font-size: 10.5px;
		font-weight: 700;
		fill: var(--text-primary);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.type-pill-bg {
		stroke-width: 1px;
	}

	.node-type-label {
		font-size: 7.5px;
		font-weight: 600;
		fill: var(--text-muted);
		font-family: ui-monospace, SFMono-Regular, monospace;
	}

	.section-label {
		font-size: 7px;
		font-weight: 700;
		letter-spacing: 0.04em;
		fill: var(--text-muted);
	}

	.section-val {
		font-size: 7.5px;
		font-weight: 600;
		font-family: ui-monospace, monospace;
		fill: var(--text-secondary);
	}

	.bar-track {
		fill: var(--bg-subtle);
	}

	.bar-fill {
		fill: var(--accent-cyan);
		transition: width 0.12s ease;
	}

	.bar-danger {
		fill: var(--accent-rose);
	}

	.empty-state-text {
		font-size: 7.5px;
		fill: var(--text-muted);
		font-family: ui-monospace, monospace;
	}

	.more-jobs-text {
		font-size: 7.5px;
		font-weight: 700;
		fill: var(--text-secondary);
	}

	.internal-divider {
		stroke: var(--border-base);
		stroke-width: 1;
	}

	.server-box {
		stroke-width: 1;
	}

	.server-idle {
		fill: var(--bg-subtle);
		stroke: var(--border-base);
	}

	.server-busy {
		fill: rgba(245, 158, 11, 0.15);
		stroke: var(--accent-amber);
	}

	.server-text {
		font-size: 7.5px;
		font-family: ui-monospace, monospace;
		font-weight: 700;
		fill: var(--text-primary);
	}

	.drop-badge-rect {
		fill: var(--accent-rose);
	}

	.drop-badge-text {
		font-size: 8px;
		font-weight: 700;
		fill: #ffffff;
		font-family: ui-monospace, monospace;
	}

	.port-indicator {
		fill: var(--bg-surface);
		stroke: var(--border-base);
		stroke-width: 1.5;
	}
</style>
