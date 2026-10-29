<script lang="ts">
	import {
		Header,
		PlaybackControls,
		SimulationCanvas,
		StationInspector,
		PacketInspector,
		JobInspector,
		EventLogTable,
		ActiveJobsViewer,
		MetricsDashboard,
		BreakpointModal,
		TraceUploadModal,
		simEngine
	} from '../lib';
	import type { ActivePacket } from '../lib';

	// Modal states
	let showUploadModal = $state(false);
	let showBreakpointsModal = $state(false);
	let showMetricsDrawer = $state(false);

	// Bottom panel tab & collapse state
	let bottomPanelTab = $state<'events' | 'jobs'>('events');
	let isBottomPanelCollapsed = $state(false);

	function handleSelectStation(name: string | null) {
		simEngine.selectedStation = name;
		simEngine.selectedPacket = null;
		simEngine.selectedJob = null;
		showMetricsDrawer = false;
	}

	function handleSelectPacket(packet: ActivePacket | null) {
		simEngine.selectedPacket = packet;
		simEngine.selectedStation = null;
		simEngine.selectedJob = null;
		showMetricsDrawer = false;
	}

	function toggleMetricsDrawer() {
		showMetricsDrawer = !showMetricsDrawer;
		if (showMetricsDrawer) {
			simEngine.selectedStation = null;
			simEngine.selectedPacket = null;
			simEngine.selectedJob = null;
		}
	}

	// Global Keyboard Shortcuts
	function handleKeyDown(e: KeyboardEvent) {
		// Ignore shortcuts when user is typing inside an input
		if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
			return;
		}

		if (e.code === 'Space') {
			e.preventDefault();
			simEngine.togglePlay();
		} else if (e.code === 'ArrowRight') {
			e.preventDefault();
			simEngine.stepForward();
		} else if (e.code === 'ArrowLeft') {
			e.preventDefault();
			simEngine.stepBackward();
		} else if (e.code === 'Home') {
			e.preventDefault();
			simEngine.reset();
		} else if (e.code === 'Escape') {
			simEngine.selectedStation = null;
			simEngine.selectedPacket = null;
			simEngine.selectedJob = null;
			showUploadModal = false;
			showBreakpointsModal = false;
			showMetricsDrawer = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="workspace-layout">
	<!-- Top Header -->
	<Header
		onOpenUpload={() => (showUploadModal = true)}
		onOpenBreakpoints={() => (showBreakpointsModal = true)}
	/>

	<!-- Main Middle Workspace Area -->
	<div class="middle-area">
		<!-- Left / Center Canvas & Event Log Column -->
		<div class="canvas-and-log-column">
			<!-- Canvas Container -->
			<div class="canvas-wrapper">
				<SimulationCanvas
					onSelectStation={handleSelectStation}
					onSelectPacket={handleSelectPacket}
					onOpenUpload={() => (showUploadModal = true)}
				/>

				<!-- Top-right Floating Action Bar for Tools -->
				<div class="floating-tools-bar">
					<button
						class="tool-btn {bottomPanelTab === 'jobs' && !isBottomPanelCollapsed ? 'active' : ''}"
						onclick={() => {
							bottomPanelTab = 'jobs';
							isBottomPanelCollapsed = false;
						}}
						title="View All Active Jobs Currently in Model"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
							<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
						</svg>
						<span>Active Jobs ({simEngine.activeModelJobs.length})</span>
					</button>

					<button
						class="tool-btn {showMetricsDrawer ? 'active' : ''}"
						onclick={toggleMetricsDrawer}
						title="Toggle Metrics & KPI Dashboard"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="18" y1="20" x2="18" y2="10" />
							<line x1="12" y1="20" x2="12" y2="4" />
							<line x1="6" y1="20" x2="6" y2="14" />
						</svg>
						<span>Analytics</span>
					</button>
				</div>
			</div>

			<!-- Collapsible Bottom Panel (Event Log / Analytics) -->
			<div class="bottom-panel {isBottomPanelCollapsed ? 'collapsed' : ''}">
				<!-- Panel Tab Header -->
				<div class="panel-header-bar">
					<div class="tabs-group">
						<button
							class="panel-tab {bottomPanelTab === 'events' ? 'active' : ''}"
							onclick={() => { bottomPanelTab = 'events'; isBottomPanelCollapsed = false; }}
						>
							Simulation Event Log
							<span class="tab-badge">{simEngine.filteredEvents.length}</span>
						</button>

						<button
							class="panel-tab {bottomPanelTab === 'jobs' ? 'active' : ''}"
							onclick={() => { bottomPanelTab = 'jobs'; isBottomPanelCollapsed = false; }}
						>
							Active Jobs in Model
							<span class="tab-badge {simEngine.activeModelJobs.length > 0 ? 'badge-active' : ''}">
								{simEngine.activeModelJobs.length}
							</span>
						</button>
					</div>

					<button
						class="collapse-toggle-btn"
						onclick={() => (isBottomPanelCollapsed = !isBottomPanelCollapsed)}
						title={isBottomPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
					>
						{isBottomPanelCollapsed ? 'Expand Log' : 'Minimize Log'}
					</button>
				</div>

				<!-- Panel Body Content -->
				{#if !isBottomPanelCollapsed}
					<div class="panel-body">
						{#if bottomPanelTab === 'events'}
							<EventLogTable />
						{:else if bottomPanelTab === 'jobs'}
							<ActiveJobsViewer />
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Right Side Dynamic Inspector Drawers -->
		{#if simEngine.selectedStation}
			<StationInspector
				stationName={simEngine.selectedStation}
				onClose={() => (simEngine.selectedStation = null)}
			/>
		{:else if simEngine.selectedPacket}
			<PacketInspector
				packet={simEngine.selectedPacket}
				onClose={() => (simEngine.selectedPacket = null)}
			/>
		{:else if simEngine.selectedJob}
			<JobInspector
				job={simEngine.selectedJob}
				onClose={() => (simEngine.selectedJob = null)}
			/>
		{:else if showMetricsDrawer}
			<MetricsDashboard onClose={() => (showMetricsDrawer = false)} />
		{/if}
	</div>

	<!-- Bottom Playback Controls -->
	<PlaybackControls />

	<!-- Modals -->
	{#if showUploadModal}
		<TraceUploadModal onClose={() => (showUploadModal = false)} />
	{/if}

	{#if showBreakpointsModal}
		<BreakpointModal onClose={() => (showBreakpointsModal = false)} />
	{/if}
</div>

<style>
	.workspace-layout {
		display: flex;
		flex-direction: column;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: var(--bg-base);
		color: var(--text-primary);
	}

	.middle-area {
		flex: 1;
		display: flex;
		overflow: hidden;
		position: relative;
	}

	.canvas-and-log-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}

	.canvas-wrapper {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.floating-tools-bar {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		z-index: 10;
	}

	.tool-btn {
		background: var(--bg-surface);
		backdrop-filter: blur(8px);
		border: 1px solid var(--border-base);
		border-radius: 6px;
		color: var(--text-secondary);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.4rem 0.75rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		transition: all 0.15s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.tool-btn:hover {
		background: var(--bg-subtle);
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.tool-btn.active {
		background: var(--accent-blue);
		color: #ffffff;
		border-color: var(--accent-blue-hover);
	}

	.bottom-panel {
		height: 250px;
		display: flex;
		flex-direction: column;
		background: var(--bg-surface);
		border-top: 1px solid var(--border-base);
		transition: height 0.2s ease;
		z-index: 10;
	}

	.bottom-panel.collapsed {
		height: 34px;
	}

	.panel-header-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 34px;
		padding: 0 0.75rem;
		background: var(--bg-base);
		border-bottom: 1px solid var(--border-base);
		user-select: none;
	}

	.tabs-group {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.panel-tab {
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.35rem 0.6rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		border-bottom: 2px solid transparent;
	}

	.panel-tab:hover {
		color: var(--text-primary);
	}

	.panel-tab.active {
		color: var(--accent-cyan);
		border-bottom-color: var(--accent-cyan);
	}

	.tab-badge {
		font-size: 0.65rem;
		font-family: ui-monospace, monospace;
		background: var(--bg-subtle);
		color: var(--text-secondary);
		padding: 0.05rem 0.35rem;
		border-radius: 4px;
	}

	.tab-badge.badge-active {
		background: rgba(56, 189, 248, 0.2);
		color: var(--accent-cyan);
		font-weight: 700;
	}

	.collapse-toggle-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 0.7rem;
		cursor: pointer;
		padding: 0.2rem 0.5rem;
	}

	.collapse-toggle-btn:hover {
		color: var(--text-primary);
	}

	.panel-body {
		flex: 1;
		overflow: hidden;
	}
</style>
