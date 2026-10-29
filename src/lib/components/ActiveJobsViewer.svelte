<script lang="ts">
	import { simEngine } from '../services/simulationEngine.svelte';
	import { formatSimTime } from '../utils/formatting';
	import { getJobClassColor } from '../utils/colors';
	import type { ActiveModelJob } from '../types/trace';

	let currentPage = $state(0);
	const PAGE_SIZE = 50;

	let totalPages = $derived(
		Math.max(1, Math.ceil(simEngine.filteredActiveModelJobs.length / PAGE_SIZE))
	);

	let pagedJobs = $derived(
		simEngine.filteredActiveModelJobs.slice(
			currentPage * PAGE_SIZE,
			(currentPage + 1) * PAGE_SIZE
		)
	);

	function handleInspect(job: ActiveModelJob) {
		simEngine.selectJob(job);
	}

	function nextPage() {
		if (currentPage + 1 < totalPages) currentPage++;
	}

	function prevPage() {
		if (currentPage > 0) currentPage--;
	}
</script>

<div class="jobs-viewer-container">
	<!-- Filter & Search Toolbar -->
	<div class="filter-toolbar">
		<!-- Search Filter -->
		<div class="search-wrap">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"></circle>
				<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
			</svg>
			<input
				type="text"
				placeholder="Search Job ID, class, or station..."
				bind:value={simEngine.filterJobSearch}
				class="filter-input"
			/>
			{#if simEngine.filterJobSearch}
				<button class="clear-btn" onclick={() => (simEngine.filterJobSearch = '')}>✕</button>
			{/if}
		</div>

		<!-- Status Filter Pills -->
		<div class="status-pills">
			<button
				class="pill-btn {simEngine.filterJobStatus === 'ALL' ? 'active' : ''}"
				onclick={() => { simEngine.filterJobStatus = 'ALL'; currentPage = 0; }}
			>
				All
				<span class="count-badge">{simEngine.activeJobsCountByStatus.all}</span>
			</button>
			<button
				class="pill-btn status-flight {simEngine.filterJobStatus === 'IN_FLIGHT' ? 'active' : ''}"
				onclick={() => { simEngine.filterJobStatus = 'IN_FLIGHT'; currentPage = 0; }}
			>
				In Flight
				<span class="count-badge">{simEngine.activeJobsCountByStatus.inFlight}</span>
			</button>
			<button
				class="pill-btn status-service {simEngine.filterJobStatus === 'IN_SERVICE' ? 'active' : ''}"
				onclick={() => { simEngine.filterJobStatus = 'IN_SERVICE'; currentPage = 0; }}
			>
				In Service
				<span class="count-badge">{simEngine.activeJobsCountByStatus.inService}</span>
			</button>
			<button
				class="pill-btn status-queue {simEngine.filterJobStatus === 'IN_QUEUE' ? 'active' : ''}"
				onclick={() => { simEngine.filterJobStatus = 'IN_QUEUE'; currentPage = 0; }}
			>
				In Queue
				<span class="count-badge">{simEngine.activeJobsCountByStatus.inQueue}</span>
			</button>
		</div>

		<!-- Station Filter Dropdown -->
		<select bind:value={simEngine.filterJobStation} class="filter-select">
			<option value="">All Stations</option>
			{#if simEngine.metadata}
				{#each simEngine.metadata.nodes as node (node.name)}
					<option value={node.name}>{node.name}</option>
				{/each}
			{/if}
		</select>

		<!-- Job Class Filter Dropdown -->
		<select bind:value={simEngine.filterJobClass} class="filter-select">
			<option value="">All Classes</option>
			{#if simEngine.metadata}
				{#each simEngine.metadata.classes as cls (cls.name)}
					<option value={cls.name}>{cls.name}</option>
				{/each}
			{/if}
		</select>

		<!-- Pagination summary -->
		<div class="pagination-info">
			<span>Showing {pagedJobs.length} of {simEngine.filteredActiveModelJobs.length}</span>
			{#if totalPages > 1}
				<div class="page-nav">
					<button class="nav-arrow" disabled={currentPage === 0} onclick={prevPage}>◀</button>
					<span class="page-num">{currentPage + 1}/{totalPages}</span>
					<button class="nav-arrow" disabled={currentPage + 1 >= totalPages} onclick={nextPage}>▶</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Jobs Table or Empty State -->
	<div class="table-scroll-wrap">
		{#if simEngine.filteredActiveModelJobs.length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
						<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
					</svg>
				</div>
				<p class="empty-title">No Active Jobs in Model</p>
				<p class="empty-desc">
					{#if simEngine.events.length === 0}
						Load a simulation trace to view live jobs traversing stations and links.
					{:else if simEngine.currentIndex === -1}
						Simulation is currently at initial state (seq #0). Step forward or play to observe jobs entering the system.
					{:else}
						No jobs match the current filter criteria at simulation time {formatSimTime(simEngine.currentSimTime)}.
					{/if}
				</p>
			</div>
		{:else}
			<table class="jobs-table">
				<thead>
					<tr>
						<th>Job ID</th>
						<th>Class</th>
						<th>State</th>
						<th>Current Location</th>
						<th>Priority</th>
						<th>Entered At</th>
						<th>Residence Time</th>
						<th class="th-actions">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each pagedJobs as job (job.jobId)}
						{@const classColor = getJobClassColor(job.jobClass)}
						<tr
							class="job-row {simEngine.selectedJob?.jobId === job.jobId ? 'selected-row' : ''}"
							onclick={() => handleInspect(job)}
						>
							<!-- Job ID -->
							<td class="col-job-id">
								<span class="job-id-pill" style="border-color: {classColor}40;">
									<span class="job-color-dot" style="background: {classColor};"></span>
									#{job.jobId}
								</span>
							</td>

							<!-- Job Class -->
							<td>
								<span class="class-badge" style="color: {classColor}; border-color: {classColor}30; background: {classColor}15;">
									{job.jobClass}
								</span>
							</td>

							<!-- Status Badge -->
							<td>
								{#if job.state === 'IN_FLIGHT'}
									<span class="state-pill in-flight">
										<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<line x1="5" y1="12" x2="19" y2="12"></line>
											<polyline points="12 5 19 12 12 19"></polyline>
										</svg>
										Flight ({job.progressPercent ?? 0}%)
									</span>
								{:else if job.state === 'IN_SERVICE'}
									<span class="state-pill in-service">
										<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<circle cx="12" cy="12" r="10"></circle>
											<polyline points="12 6 12 12 16 14"></polyline>
										</svg>
										In Service
									</span>
								{:else if job.state === 'IN_QUEUE'}
									<span class="state-pill in-queue">
										<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<line x1="8" y1="6" x2="21" y2="6"></line>
											<line x1="8" y1="12" x2="21" y2="12"></line>
											<line x1="8" y1="18" x2="21" y2="18"></line>
											<line x1="3" y1="6" x2="3.01" y2="6"></line>
											<line x1="3" y1="12" x2="3.01" y2="12"></line>
											<line x1="3" y1="18" x2="3.01" y2="18"></line>
										</svg>
										Queue (Pos #{job.queuePosition || 1})
									</span>
								{/if}
							</td>

							<!-- Location -->
							<td class="col-location">
								{#if job.state === 'IN_FLIGHT'}
									<span class="loc-flight">
										<span class="loc-station">{job.linkSource}</span>
										<span class="loc-arrow">➔</span>
										<span class="loc-station">{job.linkTarget}</span>
									</span>
								{:else if job.state === 'IN_SERVICE'}
									<span class="loc-station">
										{job.stationName}
										<span class="loc-detail">Core #{job.serverIndex ?? 0}</span>
									</span>
								{:else}
									<span class="loc-station">
										{job.stationName}
										<span class="loc-detail">Buffer</span>
									</span>
								{/if}
							</td>

							<!-- Priority -->
							<td class="col-priority">
								<span class="priority-tag">{job.priority}</span>
							</td>

							<!-- Entered At -->
							<td class="col-mono">
								{formatSimTime(job.enterTime ?? 0)}
							</td>

							<!-- Residence Time -->
							<td class="col-mono residence-time">
								{formatSimTime(job.residenceTime)}
							</td>

							<!-- Actions -->
							<td class="col-actions" onclick={(e) => e.stopPropagation()}>
								<button
									class="action-btn"
									onclick={() => handleInspect(job)}
									title="Inspect complete history and properties of Job #{job.jobId}"
								>
									Inspect
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<style>
	.jobs-viewer-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-surface);
		color: var(--text-primary);
		font-size: 0.75rem;
		overflow: hidden;
	}

	.filter-toolbar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.4rem 0.75rem;
		background: var(--bg-card);
		border-bottom: 1px solid var(--border-base);
	}

	.search-wrap {
		position: relative;
		display: flex;
		align-items: center;
		min-width: 220px;
	}

	.search-wrap svg {
		position: absolute;
		left: 0.5rem;
		color: var(--text-muted);
		pointer-events: none;
	}

	.filter-input {
		width: 100%;
		padding: 0.25rem 1.6rem 0.25rem 1.8rem;
		font-size: 0.72rem;
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-base);
		border-radius: 4px;
		outline: none;
	}

	.filter-input:focus {
		border-color: var(--border-focus);
	}

	.clear-btn {
		position: absolute;
		right: 0.4rem;
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.7rem;
	}

	.status-pills {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.pill-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: var(--bg-input);
		border: 1px solid var(--border-base);
		color: var(--text-secondary);
		padding: 0.2rem 0.5rem;
		font-size: 0.7rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.pill-btn:hover {
		background: var(--bg-subtle);
		color: var(--text-primary);
	}

	.pill-btn.active {
		background: var(--accent-blue);
		color: #ffffff;
		border-color: var(--accent-blue);
	}

	.count-badge {
		font-family: ui-monospace, monospace;
		font-size: 0.65rem;
		background: rgba(0, 0, 0, 0.25);
		padding: 0.05rem 0.3rem;
		border-radius: 3px;
	}

	.filter-select {
		padding: 0.25rem 0.5rem;
		font-size: 0.72rem;
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-base);
		border-radius: 4px;
		outline: none;
		cursor: pointer;
	}

	.filter-select:focus {
		border-color: var(--border-focus);
	}

	.pagination-info {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-muted);
		font-size: 0.7rem;
	}

	.page-nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.nav-arrow {
		background: var(--bg-input);
		border: 1px solid var(--border-base);
		color: var(--text-secondary);
		padding: 0.1rem 0.35rem;
		font-size: 0.65rem;
		border-radius: 3px;
		cursor: pointer;
	}

	.nav-arrow:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.table-scroll-wrap {
		flex: 1;
		overflow-y: auto;
		position: relative;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 2rem;
		text-align: center;
		color: var(--text-muted);
	}

	.empty-icon {
		margin-bottom: 0.5rem;
		color: var(--text-muted);
		opacity: 0.7;
	}

	.empty-title {
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 0.25rem 0;
	}

	.empty-desc {
		font-size: 0.72rem;
		max-width: 420px;
		line-height: 1.4;
		margin: 0;
	}

	.jobs-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	.jobs-table thead {
		position: sticky;
		top: 0;
		background: var(--bg-card);
		z-index: 2;
		border-bottom: 1px solid var(--border-base);
	}

	.jobs-table th {
		padding: 0.4rem 0.6rem;
		font-size: 0.68rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.th-actions {
		text-align: right;
		padding-right: 0.75rem;
	}

	.job-row {
		border-bottom: 1px solid var(--border-subtle);
		cursor: pointer;
		transition: background 0.1s ease;
	}

	.job-row:hover {
		background: var(--bg-subtle);
	}

	.job-row.selected-row {
		background: rgba(56, 189, 248, 0.12);
		border-left: 2px solid var(--accent-cyan);
	}

	.jobs-table td {
		padding: 0.4rem 0.6rem;
		font-size: 0.73rem;
		vertical-align: middle;
	}

	.col-job-id {
		font-weight: 600;
	}

	.job-id-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-family: ui-monospace, monospace;
		padding: 0.1rem 0.4rem;
		border: 1px solid transparent;
		border-radius: 4px;
		background: var(--bg-input);
	}

	.job-color-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.class-badge {
		display: inline-block;
		font-size: 0.68rem;
		font-weight: 600;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		border: 1px solid;
	}

	.state-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.68rem;
		font-weight: 600;
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
	}

	.state-pill.in-flight {
		background: rgba(56, 189, 248, 0.15);
		color: var(--accent-cyan);
		border: 1px solid rgba(56, 189, 248, 0.3);
	}

	.state-pill.in-service {
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	.state-pill.in-queue {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	.col-location {
		font-weight: 500;
	}

	.loc-flight {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.loc-arrow {
		color: var(--text-muted);
		font-size: 0.65rem;
	}

	.loc-detail {
		font-size: 0.65rem;
		color: var(--text-muted);
		margin-left: 0.25rem;
		font-family: ui-monospace, monospace;
	}

	.col-priority {
		font-family: ui-monospace, monospace;
	}

	.priority-tag {
		background: var(--bg-input);
		border: 1px solid var(--border-base);
		padding: 0.05rem 0.3rem;
		border-radius: 3px;
		font-size: 0.68rem;
	}

	.col-mono {
		font-family: ui-monospace, monospace;
		color: var(--text-secondary);
	}

	.residence-time {
		color: var(--accent-cyan);
	}

	.col-actions {
		text-align: right;
		padding-right: 0.75rem;
	}

	.action-btn {
		background: var(--bg-input);
		border: 1px solid var(--border-base);
		color: var(--text-secondary);
		padding: 0.2rem 0.5rem;
		font-size: 0.68rem;
		font-weight: 600;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: var(--accent-blue);
		color: #ffffff;
		border-color: var(--accent-blue);
	}
</style>
