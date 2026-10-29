<script lang="ts">
	import { simEngine } from '../services/simulationEngine.svelte';

	function handleSliderInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const targetIndex = parseInt(target.value, 10);
		simEngine.seekToIndex(targetIndex);
	}
</script>

<div class="playback-bar">
	<!-- Scrubber Timeline -->
	<div class="timeline-container">
		<div class="timeline-ticks">
			<span class="tick-label">0.00s</span>
			<span class="tick-label center">
				{#if simEngine.currentEvent}
					Seq #{simEngine.currentEvent.seq} — {simEngine.currentEvent.phase} {simEngine.currentEvent.event}
				{:else}
					Timeline (idle)
				{/if}
			</span>
			<span class="tick-label end">{simEngine.maxSimTime.toFixed(2)}s</span>
		</div>

		<div class="slider-wrapper">
			<input
				type="range"
				min="-1"
				max={simEngine.totalEvents > 0 ? simEngine.totalEvents - 1 : 0}
				value={simEngine.currentIndex}
				oninput={handleSliderInput}
				disabled={simEngine.totalEvents === 0}
				class="timeline-slider"
				aria-label="Simulation timeline scrubber"
			/>
			<div class="progress-fill" style="width: {simEngine.progressPercent}%"></div>
		</div>
	</div>

	<!-- VCR Controls Cluster -->
	<div class="controls-cluster">
		<!-- Jump to start -->
		<button
			class="ctrl-btn"
			onclick={() => simEngine.reset()}
			title="Rewind to start"
			disabled={simEngine.currentIndex <= -1 || simEngine.totalEvents === 0}
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
				<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
			</svg>
		</button>

		<!-- Step Backward -->
		<button
			class="ctrl-btn"
			onclick={() => simEngine.stepBackward()}
			title="Step Backward"
			disabled={simEngine.currentIndex <= -1 || simEngine.totalEvents === 0}
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
				<path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
			</svg>
		</button>

		<!-- Play / Pause -->
		<button
			class="ctrl-btn play-pause {simEngine.isPlaying ? 'active' : ''}"
			onclick={() => simEngine.togglePlay()}
			title={simEngine.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
			disabled={simEngine.totalEvents === 0}
		>
			{#if simEngine.isPlaying}
				<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
					<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
				</svg>
			{:else}
				<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
					<path d="M8 5v14l11-7z"/>
				</svg>
			{/if}
		</button>

		<!-- Step Forward -->
		<button
			class="ctrl-btn"
			onclick={() => simEngine.stepForward()}
			title="Step Forward"
			disabled={simEngine.currentIndex + 1 >= simEngine.totalEvents || simEngine.totalEvents === 0}
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
				<path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
			</svg>
		</button>

		<!-- Jump to End -->
		<button
			class="ctrl-btn"
			onclick={() => simEngine.seekToIndex(simEngine.totalEvents - 1)}
			title="Jump to end"
			disabled={simEngine.currentIndex + 1 >= simEngine.totalEvents || simEngine.totalEvents === 0}
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
				<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
			</svg>
		</button>
	</div>
</div>

<style>
	.playback-bar {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 0.5rem 1.25rem;
		background: var(--bg-surface);
		border-top: 1px solid var(--border-base);
		user-select: none;
		z-index: 20;
	}

	.timeline-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.timeline-ticks {
		display: flex;
		justify-content: space-between;
		font-size: 0.68rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		color: var(--text-muted);
	}

	.tick-label.center {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.slider-wrapper {
		position: relative;
		height: 12px;
		display: flex;
		align-items: center;
	}

	.timeline-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: var(--bg-subtle);
		outline: none;
		cursor: pointer;
		position: relative;
		z-index: 2;
	}

	.timeline-slider:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.timeline-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--accent-cyan);
		border: 2px solid var(--bg-surface);
		cursor: pointer;
	}

	.progress-fill {
		position: absolute;
		left: 0;
		top: 4px;
		height: 4px;
		background: var(--accent-cyan);
		border-radius: 2px;
		pointer-events: none;
		z-index: 1;
	}

	.controls-cluster {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.ctrl-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		background: var(--bg-subtle);
		border: 1px solid var(--border-base);
		border-radius: 5px;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.ctrl-btn:hover:not(:disabled) {
		background: var(--border-base);
		color: var(--text-primary);
	}

	.ctrl-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.ctrl-btn.play-pause {
		width: 36px;
		height: 30px;
		background: var(--accent-blue);
		border-color: var(--accent-blue-hover);
		color: #ffffff;
	}

	.ctrl-btn.play-pause:hover:not(:disabled) {
		background: var(--accent-blue-hover);
	}

	.ctrl-btn.play-pause.active {
		background: var(--accent-amber);
		border-color: var(--accent-amber);
	}
</style>
