<script lang="ts">
	import { simEngine } from '../services/simulationEngine.svelte';
	import { themeManager } from '../services/theme.svelte';
	import { formatSimTime, formatNumber } from '../utils/formatting';

	interface Props {
		onOpenUpload: () => void;
		onOpenBreakpoints: () => void;
	}

	let { onOpenUpload, onOpenBreakpoints }: Props = $props();

	const speedOptions = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 25.0];

	function handleSpeedChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		simEngine.setSpeed(parseFloat(target.value));
	}
</script>

<header class="app-header">
	<div class="brand">
		<div class="logo-box">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
				<line x1="8" y1="21" x2="16" y2="21"></line>
				<line x1="12" y1="17" x2="12" y2="21"></line>
			</svg>
		</div>
		<div class="title-wrap">
			<span class="app-title">JMT Tracer</span>
			<span class="model-badge">
				{simEngine.metadata?.modelName || 'No trace loaded'}
			</span>
		</div>
	</div>

	<!-- Live Telemetry Bar -->
	<div class="telemetry-bar">
		<div class="telemetry-item">
			<span class="label">SIM TIME</span>
			<span class="value cyan">{formatSimTime(simEngine.currentSimTime)}</span>
		</div>
		<div class="divider"></div>
		<div class="telemetry-item">
			<span class="label">SEQUENCE</span>
			<span class="value">
				{simEngine.currentIndex >= 0 ? formatNumber(simEngine.currentIndex + 1) : 0}
				<small class="text-muted">/ {formatNumber(simEngine.totalEvents)}</small>
			</span>
		</div>
		<div class="divider"></div>
		<div class="telemetry-item">
			<span class="label">DROPS</span>
			<span class="value {simEngine.totalDropsSoFar > 0 ? 'drop-alert' : ''}">
				{formatNumber(simEngine.totalDropsSoFar)}
			</span>
		</div>
	</div>

	<!-- Controls & Actions -->
	<div class="header-actions">
		<!-- Speed Selector -->
		<div class="speed-control">
			<label for="speed-select" class="speed-label">SPEED</label>
			<select id="speed-select" value={simEngine.playbackSpeed} onchange={handleSpeedChange}>
				{#each speedOptions as spd (spd)}
					<option value={spd}>{spd}x</option>
				{/each}
			</select>
		</div>

		<!-- Breakpoints Button -->
		<button class="btn btn-secondary" onclick={onOpenBreakpoints} title="Configure breakpoints">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
			</svg>
			<span>Breakpoints</span>
			{#if simEngine.breakpoints.some((b) => b.enabled)}
				<span class="bp-active-dot"></span>
			{/if}
		</button>

		<!-- Theme Toggle (Dark / Light) -->
		<button
			class="btn btn-icon"
			onclick={() => themeManager.toggle()}
			title="Toggle theme ({themeManager.current === 'dark' ? 'Switch to Light' : 'Switch to Dark'})"
		>
			{#if themeManager.current === 'dark'}
				<!-- Sun icon for switching to light -->
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="5"></circle>
					<line x1="12" y1="1" x2="12" y2="3"></line>
					<line x1="12" y1="21" x2="12" y2="23"></line>
					<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
					<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
					<line x1="1" y1="12" x2="3" y2="12"></line>
					<line x1="21" y1="12" x2="23" y2="12"></line>
					<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
					<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
				</svg>
			{:else}
				<!-- Moon icon for switching to dark -->
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
				</svg>
			{/if}
		</button>

		<!-- Open Trace File Button -->
		<button class="btn btn-primary" onclick={onOpenUpload} title="Open .ndjson or .ndjson.gz trace files">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
				<polyline points="17 8 12 3 7 8"></polyline>
				<line x1="12" y1="3" x2="12" y2="15"></line>
			</svg>
			<span>Open Trace</span>
		</button>
	</div>
</header>

<style>
	.app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.25rem;
		height: 50px;
		background-color: var(--bg-surface);
		border-bottom: 1px solid var(--border-base);
		color: var(--text-primary);
		user-select: none;
		z-index: 20;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.logo-box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		background: var(--bg-subtle);
		border: 1px solid var(--border-base);
		border-radius: 6px;
		color: var(--accent-cyan);
	}

	.title-wrap {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
	}

	.app-title {
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.model-badge {
		font-size: 0.72rem;
		font-family: ui-monospace, SFMono-Regular, monospace;
		padding: 0.15rem 0.5rem;
		background: var(--bg-subtle);
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
		color: var(--text-secondary);
		max-width: 240px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.telemetry-bar {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		background: var(--bg-base);
		padding: 0.25rem 0.85rem;
		border-radius: 5px;
		border: 1px solid var(--border-base);
	}

	.telemetry-item {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.telemetry-item .label {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.telemetry-item .value {
		font-size: 0.82rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-weight: 600;
		color: var(--text-primary);
	}

	.value.cyan {
		color: var(--accent-cyan);
	}

	.value.drop-alert {
		color: var(--accent-rose);
	}

	.text-muted {
		color: var(--text-muted);
		font-size: 0.72rem;
	}

	.divider {
		width: 1px;
		height: 20px;
		background: var(--border-base);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.speed-control {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: var(--bg-subtle);
		padding: 0.2rem 0.5rem;
		border-radius: 5px;
		border: 1px solid var(--border-base);
	}

	.speed-label {
		font-size: 0.62rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	select {
		background: transparent;
		color: var(--text-primary);
		border: none;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		outline: none;
	}

	select option {
		background: var(--bg-surface);
		color: var(--text-primary);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		height: 30px;
		padding: 0 0.7rem;
		font-size: 0.78rem;
		font-weight: 600;
		border-radius: 5px;
		cursor: pointer;
		transition: all 0.12s ease;
		position: relative;
	}

	.btn-icon {
		width: 30px;
		height: 30px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-subtle);
		border: 1px solid var(--border-base);
		color: var(--text-secondary);
	}

	.btn-icon:hover {
		background: var(--border-base);
		color: var(--text-primary);
	}

	.btn-secondary {
		background: var(--bg-subtle);
		border: 1px solid var(--border-base);
		color: var(--text-secondary);
	}

	.btn-secondary:hover {
		background: var(--border-base);
		color: var(--text-primary);
	}

	.btn-primary {
		background: var(--accent-blue);
		border: 1px solid var(--accent-blue-hover);
		color: #ffffff;
	}

	.btn-primary:hover {
		background: var(--accent-blue-hover);
	}

	.bp-active-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--accent-amber);
		position: absolute;
		top: 5px;
		right: 5px;
	}
</style>
