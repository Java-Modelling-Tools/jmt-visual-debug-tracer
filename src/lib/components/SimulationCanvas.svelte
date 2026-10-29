<script lang="ts">
	import { simEngine } from '../services/simulationEngine.svelte';
	import { computeTopologyLayout } from '../services/layoutEngine';
	import StationNode from './StationNode.svelte';
	import PacketElement from './PacketElement.svelte';
	import type { ActivePacket, ConnectionPath } from '../types/trace';
	import { SvelteMap } from 'svelte/reactivity';

	interface Props {
		onSelectStation: (name: string | null) => void;
		onSelectPacket: (packet: ActivePacket | null) => void;
		onOpenUpload: () => void;
	}

	let { onSelectStation, onSelectPacket, onOpenUpload }: Props = $props();

	// Zoom and Pan state
	let panX = $state(60);
	let panY = $state(60);
	let zoom = $state(1.0);

	let isPanning = $state(false);
	let startPanX = 0;
	let startPanY = 0;

	// Node drag state
	let draggingNodeName = $state<string | null>(null);
	let dragStartMouseX = 0;
	let dragStartMouseY = 0;
	let dragStartNodeX = 0;
	let dragStartNodeY = 0;

	let layoutData = $derived.by(() => {
		const nodes = simEngine.metadata?.nodes || [];
		const conns = simEngine.metadata?.connections || [];
		return computeTopologyLayout(nodes, conns, simEngine.userNodePositions);
	});

	let layouts = $derived(layoutData.layouts);
	let paths = $derived(layoutData.paths);

	let pathMap = $derived.by(() => {
		const map = new SvelteMap<string, ConnectionPath>();
		for (const p of paths) {
			map.set(`${p.source}->${p.target}`, p);
		}
		return map;
	});

	function isPathActive(conn: ConnectionPath): boolean {
		return simEngine.activePackets.some(
			(p) => p.srcStation === conn.source && p.dstStation === conn.target
		);
	}

	function handleCanvasMouseDown(e: MouseEvent) {
		if (e.button === 0 || e.button === 1) {
			isPanning = true;
			startPanX = e.clientX - panX;
			startPanY = e.clientY - panY;
			if (e.target === e.currentTarget) {
				onSelectStation(null);
				onSelectPacket(null);
			}
		}
	}

	function handleCanvasMouseMove(e: MouseEvent) {
		if (draggingNodeName) {
			const dx = (e.clientX - dragStartMouseX) / zoom;
			const dy = (e.clientY - dragStartMouseY) / zoom;
			simEngine.setNodePosition(draggingNodeName, dragStartNodeX + dx, dragStartNodeY + dy);
		} else if (isPanning) {
			panX = e.clientX - startPanX;
			panY = e.clientY - startPanY;
		}
	}

	function handleCanvasMouseUp() {
		isPanning = false;
		draggingNodeName = null;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
		const newZoom = Math.min(2.5, Math.max(0.35, zoom * zoomFactor));

		const mouseX = e.clientX;
		const mouseY = e.clientY;
		panX = mouseX - (mouseX - panX) * (newZoom / zoom);
		panY = mouseY - (mouseY - panY) * (newZoom / zoom);
		zoom = newZoom;
	}

	function handleNodeDragStart(e: MouseEvent, name: string) {
		e.stopPropagation();
		draggingNodeName = name;
		dragStartMouseX = e.clientX;
		dragStartMouseY = e.clientY;
		const layout = layouts.get(name);
		if (layout) {
			dragStartNodeX = layout.x;
			dragStartNodeY = layout.y;
		}
	}

	function zoomIn() {
		zoom = Math.min(2.5, zoom * 1.2);
	}

	function zoomOut() {
		zoom = Math.max(0.35, zoom / 1.2);
	}

	function resetView() {
		panX = 60;
		panY = 60;
		zoom = 1.0;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="canvas-container"
	onmousedown={handleCanvasMouseDown}
	onmousemove={handleCanvasMouseMove}
	onmouseup={handleCanvasMouseUp}
	onmouseleave={handleCanvasMouseUp}
	onwheel={handleWheel}
>
	{#if !simEngine.metadata}
		<!-- Clean, professional empty state -->
		<div class="empty-canvas-notice">
			<div class="empty-icon-box">
				<svg
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path
						d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
					></path>
					<polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
					<line x1="12" y1="22.08" x2="12" y2="12"></line>
				</svg>
			</div>
			<h2 class="empty-title">No Simulation Trace Loaded</h2>
			<p class="empty-desc">
				Select or drop your JMT simulation trace files (.ndjson.gz or .ndjson) to visualize
				stations, queues, and packet traffic.
			</p>
			<button class="btn-empty-open" onclick={onOpenUpload}> Open Trace File </button>
		</div>
	{:else}
		<svg class="simulation-svg" width="100%" height="100%">
			<defs>
				<!-- Subtle grid pattern -->
				<pattern id="grid-dots" width="24" height="24" patternUnits="userSpaceOnUse">
					<circle cx="2" cy="2" r="1" fill="var(--canvas-dots)" />
				</pattern>

				<!-- Standard directional wire arrowhead -->
				<marker
					id="arrowhead"
					viewBox="0 0 10 10"
					refX="8"
					refY="5"
					markerWidth="6"
					markerHeight="6"
					orient="auto-start-reverse"
				>
					<path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--wire-color)" />
				</marker>

				<!-- Active Traffic arrowhead -->
				<marker
					id="arrowhead-active"
					viewBox="0 0 10 10"
					refX="8"
					refY="5"
					markerWidth="7"
					markerHeight="7"
					orient="auto-start-reverse"
				>
					<path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--wire-active)" />
				</marker>
			</defs>

			<!-- Canvas Background -->
			<rect width="100%" height="100%" fill="var(--canvas-bg)" />
			<rect width="100%" height="100%" fill="url(#grid-dots)" />

			<!-- Pan & Zoom Layer -->
			<g transform="translate({panX}, {panY}) scale({zoom})">
				<!-- 1. Connection Wires (Edges) -->
				<g class="wires-layer">
					{#each paths as path, i (`${path.source}-${i}`)}
						{@const active = isPathActive(path)}
						{#if active}
							<path d={path.pathData} class="wire-active-glow" />
						{/if}

						<path
							d={path.pathData}
							class="wire-path {active ? 'active-wire' : ''}"
							marker-end="url(#{active ? 'arrowhead-active' : 'arrowhead'})"
						/>
					{/each}
				</g>

				<!-- 2. Stations Layer -->
				<g class="stations-layer">
					{#each Array.from(layouts.values()) as layout (layout.name)}
						<StationNode
							{layout}
							isSelected={simEngine.selectedStation === layout.name}
							onSelect={onSelectStation}
							onDragStart={handleNodeDragStart}
						/>
					{/each}
				</g>

				<!-- 3. In-flight Animated Packets Layer -->
				<g class="packets-layer">
					{#each simEngine.activePackets as packet (packet.id)}
						{@const p = pathMap.get(`${packet.srcStation}->${packet.dstStation}`)}
						{#if p}
							<PacketElement {packet} path={p} onSelect={onSelectPacket} />
						{/if}
					{/each}
				</g>
			</g>
		</svg>

		<!-- Canvas Navigation Float Controls -->
		<div class="canvas-controls">
			<button class="nav-btn" onclick={zoomIn} title="Zoom In (+)">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle cx="11" cy="11" r="8"></circle>
					<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
					<line x1="11" y1="8" x2="11" y2="14"></line>
					<line x1="8" y1="11" x2="14" y2="11"></line>
				</svg>
			</button>
			<button class="nav-btn" onclick={zoomOut} title="Zoom Out (-)">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle cx="11" cy="11" r="8"></circle>
					<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
					<line x1="8" y1="11" x2="14" y2="11"></line>
				</svg>
			</button>
			<button class="nav-btn" onclick={resetView} title="Reset View (100%)">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
					<path d="M3 3v5h5"></path>
				</svg>
			</button>
			<div class="zoom-pill">{Math.round(zoom * 100)}%</div>
		</div>
	{/if}
</div>

<style>
	.canvas-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		cursor: default;
		background: var(--canvas-bg);
	}

	.simulation-svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.wire-path {
		fill: none;
		stroke: var(--wire-color);
		stroke-width: 2px;
		transition:
			stroke 0.15s ease,
			stroke-width 0.15s ease;
	}

	.wire-path.active-wire {
		stroke: var(--wire-active);
		stroke-width: 2.5px;
	}

	.wire-active-glow {
		fill: none;
		stroke: var(--wire-active);
		stroke-width: 6px;
		opacity: 0.25;
		filter: blur(2px);
	}

	.canvas-controls {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: var(--bg-surface);
		padding: 0.25rem;
		border-radius: 6px;
		border: 1px solid var(--border-base);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
		z-index: 10;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		background: var(--bg-subtle);
		border: 1px solid var(--border-base);
		border-radius: 4px;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.nav-btn:hover {
		background: var(--border-base);
		color: var(--text-primary);
	}

	.zoom-pill {
		font-size: 0.72rem;
		font-family: ui-monospace, monospace;
		font-weight: 600;
		color: var(--text-muted);
		padding: 0 0.4rem;
	}

	.empty-canvas-notice {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 2rem;
	}

	.empty-icon-box {
		width: 52px;
		height: 52px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-subtle);
		border: 1px solid var(--border-base);
		border-radius: 12px;
		color: var(--text-secondary);
		margin-bottom: 1rem;
	}

	.empty-title {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 0.4rem 0;
	}

	.empty-desc {
		font-size: 0.8rem;
		color: var(--text-muted);
		max-width: 420px;
		line-height: 1.4;
		margin: 0 0 1.25rem 0;
	}

	.btn-empty-open {
		background: var(--accent-blue);
		color: #ffffff;
		border: none;
		border-radius: 6px;
		padding: 0.5rem 1.2rem;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.12s ease;
	}

	.btn-empty-open:hover {
		background: var(--accent-blue-hover);
	}
</style>
