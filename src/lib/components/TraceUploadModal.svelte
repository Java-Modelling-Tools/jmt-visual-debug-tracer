<script lang="ts">
	import { simEngine } from '../services/simulationEngine.svelte';
	import { groupAndSortChunks, type ProgressInfo, type ChunkFileInfo } from '../services/traceParser';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let isDragging = $state(false);
	let isLoading = $state(false);
	let errorMessage = $state<string | null>(null);

	// Multi-file progress tracking
	let progress = $state<ProgressInfo | null>(null);

	// Event cap threshold: default 100,000 for smooth 60fps playback
	let maxEventsCap = $state<number>(100000);

	// Detected runs if multiple runs were uploaded together
	let detectedRuns = $state<Map<string, ChunkFileInfo[]> | null>(null);
	let selectedRunId = $state<string>('');
	let pendingFiles = $state<File[]>([]);

	async function handleFiles(fileList: FileList | File[]) {
		const files = Array.from(fileList);
		if (files.length === 0) return;

		errorMessage = null;

		const groups = groupAndSortChunks(files);
		const runIds = Array.from(groups.keys());

		if (runIds.length > 1) {
			detectedRuns = groups;
			selectedRunId = runIds[0];
			pendingFiles = files;
			return;
		}

		await executeMultiFileLoad(files);
	}

	async function executeMultiFileLoad(files: File[], runId?: string) {
		isLoading = true;
		errorMessage = null;

		try {
			await simEngine.loadFromMultipleFiles(files, runId, maxEventsCap, (p) => {
				progress = p;
			});
			isLoading = false;
			onClose();
		} catch (err: unknown) {
			isLoading = false;
			errorMessage = err instanceof Error ? err.message : 'Failed to parse simulation trace files.';
		}
	}

	function handleConfirmRun() {
		if (pendingFiles.length > 0 && selectedRunId) {
			executeMultiFileLoad(pendingFiles, selectedRunId);
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer && e.dataTransfer.files.length > 0) {
			handleFiles(e.dataTransfer.files);
		}
	}

	function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			handleFiles(target.files);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onClose}>
	<div class="modal-dialog" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<div class="title-flex">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
					<polyline points="17 8 12 3 7 8"></polyline>
					<line x1="12" y1="3" x2="12" y2="15"></line>
				</svg>
				<h2 class="modal-title">Open Trace Files</h2>
			</div>
			<button class="close-btn" onclick={onClose}>✕</button>
		</div>

		<div class="modal-body">
			{#if detectedRuns && detectedRuns.size > 1}
				<!-- Multiple Runs Detected Selection -->
				<div class="run-selector-card">
					<h3 class="run-title">Multiple Simulation Runs Detected</h3>
					<p class="run-desc">
						Files from {detectedRuns.size} distinct runs were selected. Choose which run to visualize:
					</p>

					<div class="run-options-list">
						{#each Array.from(detectedRuns.entries()) as [runId, chunks] (runId)}
							<label class="run-option-label {selectedRunId === runId ? 'selected' : ''}">
								<input
									type="radio"
									name="run-selection"
									value={runId}
									checked={selectedRunId === runId}
									onchange={() => (selectedRunId = runId)}
								/>
								<div class="run-option-info">
									<strong class="run-name">{runId.toUpperCase()}</strong>
									<span class="run-parts-count">
										{chunks.length} chunk part{chunks.length > 1 ? 's' : ''} ({chunks.map((c) => `part${c.partNumber}`).join(', ')})
									</span>
								</div>
							</label>
						{/each}
					</div>

					<div class="run-actions">
						<button class="btn-cancel" onclick={() => { detectedRuns = null; pendingFiles = []; }}>Back</button>
						<button class="btn-primary" onclick={handleConfirmRun}>Load {selectedRunId.toUpperCase()}</button>
					</div>
				</div>
			{:else}
				<!-- Drag & Drop Zone -->
				<div
					class="dropzone {isDragging ? 'dragging' : ''} {isLoading ? 'loading' : ''}"
					ondragover={(e) => { e.preventDefault(); isDragging = true; }}
					ondragleave={() => (isDragging = false)}
					ondrop={handleDrop}
				>
					{#if isLoading && progress}
						<div class="spinner"></div>
						<div class="progress-details">
							<span class="progress-stage-title">{progress.message}</span>
							<div class="multi-progress-bar-bg">
								<div class="multi-progress-bar-fill" style="width: {progress.percent}%"></div>
							</div>
							<span class="progress-subtext">
								Part {progress.currentFileIndex} of {progress.totalFiles} ({progress.percent}%)
							</span>
						</div>
					{:else}
						<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="upload-icon">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
							<polyline points="17 8 12 3 7 8"></polyline>
							<line x1="12" y1="3" x2="12" y2="15"></line>
						</svg>
						<p class="drop-text">
							Drag & drop <strong>.ndjson.gz</strong> or <strong>.ndjson</strong> files here
						</p>
						<p class="sub-drop-text">
							Multi-file chunk series (_part1, _part2, ...) are stitched chronologically
						</p>
						<label class="browse-btn">
							Browse Files (Multi-Select)
							<input
								type="file"
								multiple
								accept=".ndjson,.gz,.ndjson.gz"
								onchange={handleFileInput}
								style="display: none;"
							/>
						</label>
					{/if}
				</div>

				{#if errorMessage}
					<div class="error-banner">
						{errorMessage}
					</div>
				{/if}

				<!-- Ingestion Settings -->
				<div class="config-row">
					<label for="event-cap-select" class="config-label">
						<span>Max Events Window:</span>
						<small class="config-hint">Optimizes memory for multi-gigabyte traces</small>
					</label>
					<select id="event-cap-select" bind:value={maxEventsCap} class="config-select">
						<option value={25000}>25,000 events</option>
						<option value={50000}>50,000 events</option>
						<option value={100000}>100,000 events (Recommended)</option>
						<option value={250000}>250,000 events</option>
						<option value={500000}>500,000 events</option>
						<option value={0}>All events (Uncapped)</option>
					</select>
				</div>
			{/if}
		</div>

		<div class="modal-footer">
			<button class="btn-cancel" onclick={onClose}>Close</button>
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
		width: 480px;
		max-width: 92vw;
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

	.dropzone {
		border: 1.5px dashed var(--border-base);
		border-radius: 6px;
		padding: 1.75rem 1.25rem;
		text-align: center;
		background: var(--bg-base);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.dropzone.dragging {
		border-color: var(--accent-cyan);
		background: var(--bg-subtle);
	}

	.upload-icon {
		color: var(--text-muted);
	}

	.drop-text {
		font-size: 0.82rem;
		color: var(--text-primary);
		margin: 0;
	}

	.sub-drop-text {
		font-size: 0.72rem;
		color: var(--text-muted);
		margin: 0 0 0.5rem 0;
	}

	.browse-btn {
		background: var(--accent-blue);
		color: #ffffff;
		padding: 0.4rem 1rem;
		border-radius: 5px;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.12s ease;
	}

	.browse-btn:hover { background: var(--accent-blue-hover); }

	.progress-details {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
		max-width: 380px;
	}

	.progress-stage-title {
		font-size: 0.78rem;
		color: var(--text-primary);
		text-align: center;
	}

	.multi-progress-bar-bg {
		width: 100%;
		height: 6px;
		background: var(--bg-subtle);
		border-radius: 3px;
		overflow: hidden;
	}

	.multi-progress-bar-fill {
		height: 100%;
		background: var(--accent-cyan);
		border-radius: 3px;
		transition: width 0.15s ease;
	}

	.progress-subtext {
		font-size: 0.7rem;
		font-family: ui-monospace, monospace;
		color: var(--text-muted);
	}

	.error-banner {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid var(--accent-rose);
		border-radius: 5px;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		color: var(--accent-rose);
	}

	.config-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.65rem;
		background: var(--bg-base);
		border: 1px solid var(--border-base);
		border-radius: 5px;
	}

	.config-label {
		display: flex;
		flex-direction: column;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.config-hint {
		font-size: 0.68rem;
		font-weight: 400;
		color: var(--text-muted);
	}

	.config-select {
		background: var(--bg-surface);
		border: 1px solid var(--border-base);
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		color: var(--text-primary);
		font-size: 0.75rem;
		outline: none;
		cursor: pointer;
	}

	.run-selector-card {
		background: var(--bg-base);
		border: 1px solid var(--border-base);
		border-radius: 6px;
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.run-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.run-desc {
		font-size: 0.74rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.run-options-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.run-option-label {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.5rem 0.7rem;
		background: var(--bg-surface);
		border: 1px solid var(--border-base);
		border-radius: 5px;
		cursor: pointer;
	}

	.run-option-label.selected {
		border-color: var(--accent-cyan);
	}

	.run-option-info {
		display: flex;
		flex-direction: column;
	}

	.run-name {
		font-size: 0.78rem;
		color: var(--text-primary);
		font-family: ui-monospace, monospace;
	}

	.run-parts-count {
		font-size: 0.68rem;
		color: var(--text-muted);
	}

	.run-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.4rem;
	}

	.modal-footer {
		padding: 0.65rem 1.15rem;
		background: var(--bg-base);
		border-top: 1px solid var(--border-base);
		display: flex;
		justify-content: flex-end;
	}

	.btn-cancel {
		background: var(--bg-subtle);
		border: 1px solid var(--border-base);
		color: var(--text-secondary);
		padding: 0.35rem 0.9rem;
		border-radius: 5px;
		font-size: 0.78rem;
		cursor: pointer;
	}

	.btn-primary {
		background: var(--accent-blue);
		border: none;
		color: #ffffff;
		padding: 0.35rem 0.9rem;
		border-radius: 5px;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2.5px solid var(--border-base);
		border-top-color: var(--accent-cyan);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
