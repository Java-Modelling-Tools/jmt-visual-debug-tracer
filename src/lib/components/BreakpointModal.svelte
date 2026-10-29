<script lang="ts">
	import { simEngine } from '../services/simulationEngine.svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let newJobIdInput = $state<string>('');
	let newThresholdInput = $state<number>(90);

	function addJobBreakpoint() {
		const id = parseInt(newJobIdInput, 10);
		if (!isNaN(id) && id >= 0) {
			simEngine.addBreakpoint({
				id: `bp-job-${id}-${Date.now()}`,
				enabled: true,
				type: 'job_id',
				label: `Pause on Job #${id}`,
				jobIdTarget: id
			});
			newJobIdInput = '';
		}
	}

	function addThresholdBreakpoint() {
		if (newThresholdInput > 0 && newThresholdInput <= 100) {
			simEngine.addBreakpoint({
				id: `bp-threshold-${newThresholdInput}-${Date.now()}`,
				enabled: true,
				type: 'queue_capacity',
				label: `Pause when any Queue ≥ ${newThresholdInput}% capacity`,
				queueThresholdPercent: newThresholdInput
			});
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onClose}>
	<div class="modal-dialog" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<div class="title-flex">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
				</svg>
				<h2 class="modal-title">Breakpoints</h2>
			</div>
			<button class="close-btn" onclick={onClose}>✕</button>
		</div>

		<div class="modal-body">
			<p class="intro-text">
				Execution automatically pauses when specified simulation conditions are reached.
			</p>

			<!-- Active Breakpoints List -->
			<div class="breakpoints-list">
				{#each simEngine.breakpoints as bp, idx (`${bp.id}-${idx}`)}
					<div class="bp-item {bp.enabled ? 'enabled' : 'disabled'}">
						<label class="bp-toggle-label">
							<input
								type="checkbox"
								checked={bp.enabled}
								onchange={() => simEngine.toggleBreakpoint(bp.id)}
								class="bp-checkbox"
							/>
							<span class="bp-name">{bp.label}</span>
						</label>
						{#if bp.id !== 'bp-drop'}
							<button
								class="delete-btn"
								onclick={() => simEngine.removeBreakpoint(bp.id)}
								title="Delete breakpoint"
							>
								✕
							</button>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Add Breakpoint -->
			<div class="add-section">
				<h4 class="add-title">ADD BREAKPOINT</h4>

				<!-- Add Job ID Breakpoint -->
				<div class="add-row">
					<input
						type="number"
						placeholder="Job ID (e.g. 42)"
						bind:value={newJobIdInput}
						class="bp-input"
					/>
					<button class="btn-add" onclick={addJobBreakpoint}>+ Job Breakpoint</button>
				</div>

				<!-- Add Queue Threshold Breakpoint -->
				<div class="add-row">
					<input
						type="number"
						min="1"
						max="100"
						placeholder="Queue % Full (e.g. 85)"
						bind:value={newThresholdInput}
						class="bp-input"
					/>
					<button class="btn-add" onclick={addThresholdBreakpoint}>+ Capacity Breakpoint</button>
				</div>
			</div>
		</div>

		<div class="modal-footer">
			<button class="btn-close" onclick={onClose}>Done</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(2px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}

	.modal-dialog {
		background: var(--bg-surface);
		border: 1px solid var(--border-base);
		border-radius: 8px;
		width: 440px;
		max-width: 90vw;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
		overflow: hidden;
	}

	.modal-header {
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

	.modal-title {
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 1rem;
		cursor: pointer;
	}

	.close-btn:hover { color: var(--text-primary); }

	.modal-body {
		padding: 1.15rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.intro-text {
		font-size: 0.74rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.breakpoints-list {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.bp-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.7rem;
		background: var(--bg-base);
		border: 1px solid var(--border-base);
		border-radius: 5px;
	}

	.bp-item.enabled {
		border-color: var(--border-focus);
	}

	.bp-toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.76rem;
		color: var(--text-primary);
		font-weight: 500;
	}

	.bp-checkbox {
		accent-color: var(--accent-cyan);
		width: 14px;
		height: 14px;
		cursor: pointer;
	}

	.delete-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.85rem;
	}

	.delete-btn:hover { color: var(--accent-rose); }

	.add-section {
		border-top: 1px solid var(--border-base);
		padding-top: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.add-title {
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin: 0;
	}

	.add-row {
		display: flex;
		gap: 0.45rem;
	}

	.bp-input {
		flex: 1;
		background: var(--bg-base);
		border: 1px solid var(--border-base);
		border-radius: 5px;
		padding: 0.35rem 0.65rem;
		font-size: 0.75rem;
		color: var(--text-primary);
		outline: none;
	}

	.bp-input:focus {
		border-color: var(--border-focus);
	}

	.btn-add {
		background: var(--bg-subtle);
		border: 1px solid var(--border-base);
		border-radius: 5px;
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 600;
		padding: 0 0.75rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-add:hover {
		background: var(--border-base);
		color: var(--text-primary);
	}

	.modal-footer {
		padding: 0.65rem 1.15rem;
		background: var(--bg-base);
		border-top: 1px solid var(--border-base);
		display: flex;
		justify-content: flex-end;
	}

	.btn-close {
		padding: 0.35rem 1rem;
		background: var(--accent-blue);
		border: none;
		border-radius: 5px;
		color: #ffffff;
		font-weight: 600;
		font-size: 0.78rem;
		cursor: pointer;
	}

	.btn-close:hover {
		background: var(--accent-blue-hover);
	}
</style>
