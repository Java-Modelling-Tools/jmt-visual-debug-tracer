<script lang="ts">
	import { simEngine } from '../services/simulationEngine.svelte';
	import { formatSimTime, formatCaller } from '../utils/formatting';
	import { getJobClassColor, getPhaseStyle } from '../utils/colors';

	let currentPage = $state(0);
	const PAGE_SIZE = 50;

	let totalPages = $derived(
		Math.max(1, Math.ceil(simEngine.filteredEvents.length / PAGE_SIZE))
	);

	let pageEvents = $derived(
		simEngine.filteredEvents.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
	);

	function handleRowClick(seq: number) {
		simEngine.seekToIndex(seq - 1);
	}

	function nextPage() {
		if (currentPage + 1 < totalPages) currentPage++;
	}

	function prevPage() {
		if (currentPage > 0) currentPage--;
	}
</script>

<div class="event-log-container">
	<!-- Filter Toolbar -->
	<div class="filter-toolbar">
		<div class="search-wrap">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"></circle>
				<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
			</svg>
			<input
				type="text"
				placeholder="Filter events by Job ID, class, method..."
				bind:value={simEngine.filterSearch}
				class="filter-input"
			/>
			{#if simEngine.filterSearch}
				<button class="clear-btn" onclick={() => (simEngine.filterSearch = '')}>✕</button>
			{/if}
		</div>

		<!-- Station Filter Dropdown -->
		<select bind:value={simEngine.filterStation} class="filter-select">
			<option value="">All Stations</option>
			{#if simEngine.metadata}
				{#each simEngine.metadata.nodes as node (node.name)}
					<option value={node.name}>{node.name}</option>
				{/each}
			{/if}
		</select>

		<!-- Phase Filter Dropdown -->
		<select bind:value={simEngine.filterPhase} class="filter-select">
			<option value="">All Phases</option>
			<option value="SEND">SEND</option>
			<option value="DISPATCH">DISPATCH</option>
			<option value="DROP">DROP (Overflow)</option>
			<option value="NOT_PROCESSED">NOT_PROCESSED</option>
		</select>

		<!-- Pagination Info -->
		<div class="pagination-cluster">
			<span class="page-count-text">
				{simEngine.filteredEvents.length.toLocaleString()} events
			</span>
			<button class="page-btn" onclick={prevPage} disabled={currentPage === 0}>‹</button>
			<span class="page-number-text">{currentPage + 1} / {totalPages}</span>
			<button class="page-btn" onclick={nextPage} disabled={currentPage + 1 >= totalPages}>›</button>
		</div>
	</div>

	<!-- Event Log Table -->
	<div class="table-scroll-wrapper">
		<table class="event-table">
			<thead>
				<tr>
					<th style="width: 55px;">SEQ</th>
					<th style="width: 85px;">SIM TIME</th>
					<th style="width: 80px;">PHASE</th>
					<th style="width: 110px;">EVENT</th>
					<th style="width: 200px;">ROUTE</th>
					<th style="width: 140px;">JOB / PACKET</th>
					<th style="width: 90px;">QUEUE</th>
					<th>CALLER / ORIGIN</th>
				</tr>
			</thead>
			<tbody>
				{#if pageEvents.length === 0}
					<tr>
						<td colspan="8" class="no-events-cell">
							{simEngine.totalEvents === 0 ? 'No simulation trace loaded.' : 'No matching simulation events found.'}
						</td>
					</tr>
				{:else}
					{#each pageEvents as ev (ev.seq)}
						{@const isCurrent = simEngine.currentIndex === ev.seq - 1}
						{@const pStyle = getPhaseStyle(ev.phase)}
						<tr
							class="event-row {isCurrent ? 'current-active-row' : ''} {ev.phase === 'DROP' ? 'drop-row' : ''}"
							onclick={() => handleRowClick(ev.seq)}
						>
							<td class="cell-seq">#{ev.seq}</td>
							<td class="cell-time">{formatSimTime(ev.t)}</td>
							<td>
								<span
									class="phase-badge"
									style="background: {pStyle.bg}; color: {pStyle.text}; border-color: {pStyle.border};"
								>
									{ev.phase}
								</span>
							</td>
							<td class="cell-event">{ev.event}</td>
							<td class="cell-route">
								<span class="route-station">{ev.srcStation || 'SYSTEM'}</span>
								<span class="route-arrow">➔</span>
								<span class="route-station">{ev.dstStation || 'SYSTEM'}</span>
							</td>
							<td class="cell-job">
								{#if ev.jobId !== undefined}
									<span class="job-pill" style="color: {getJobClassColor(ev.jobClass)};">
										#{ev.jobId} {ev.jobClass || ''}
									</span>
								{:else}
									<span class="text-muted">-</span>
								{/if}
							</td>
							<td class="cell-state">
								{#if ev.queueSize !== undefined}
									<span>{ev.queueSize}/{ev.queueCap && ev.queueCap > 0 ? ev.queueCap : '∞'}</span>
								{:else if ev.phase === 'DROP'}
									<span class="text-red">DROP</span>
								{:else}
									<span class="text-muted">-</span>
								{/if}
							</td>
							<td class="cell-caller" title={ev.caller || ''}>
								{formatCaller(ev.caller)}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<style>
	.event-log-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-surface);
		user-select: none;
	}

	.filter-toolbar {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.4rem 0.85rem;
		background: var(--bg-card);
		border-bottom: 1px solid var(--border-base);
	}

	.search-wrap {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--bg-base);
		border: 1px solid var(--border-base);
		border-radius: 5px;
		padding: 0.2rem 0.5rem;
		color: var(--text-muted);
		width: 250px;
	}

	.filter-input {
		background: transparent;
		border: none;
		color: var(--text-primary);
		font-size: 0.74rem;
		outline: none;
		width: 100%;
	}

	.clear-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.72rem;
	}

	.filter-select {
		background: var(--bg-base);
		border: 1px solid var(--border-base);
		border-radius: 5px;
		padding: 0.2rem 0.5rem;
		color: var(--text-primary);
		font-size: 0.74rem;
		outline: none;
		cursor: pointer;
	}

	.pagination-cluster {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-left: auto;
	}

	.page-count-text {
		font-size: 0.72rem;
		color: var(--text-muted);
		margin-right: 0.35rem;
	}

	.page-number-text {
		font-size: 0.72rem;
		font-family: ui-monospace, monospace;
		color: var(--text-secondary);
	}

	.page-btn {
		width: 22px;
		height: 22px;
		background: var(--bg-subtle);
		border: 1px solid var(--border-base);
		border-radius: 4px;
		color: var(--text-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.page-btn:hover:not(:disabled) {
		background: var(--border-base);
		color: var(--text-primary);
	}

	.page-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.table-scroll-wrapper {
		flex: 1;
		overflow-y: auto;
	}

	.event-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.74rem;
		text-align: left;
	}

	th {
		background: var(--bg-card);
		color: var(--text-muted);
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 0.35rem 0.65rem;
		border-bottom: 1px solid var(--border-base);
		position: sticky;
		top: 0;
		z-index: 5;
	}

	td {
		padding: 0.35rem 0.65rem;
		border-bottom: 1px solid var(--border-subtle);
		white-space: nowrap;
	}

	.event-row {
		cursor: pointer;
		transition: background 0.08s ease;
	}

	.event-row:hover {
		background: var(--bg-subtle);
	}

	.event-row.current-active-row {
		background: rgba(56, 189, 248, 0.1);
		border-left: 3px solid var(--accent-cyan);
	}

	.event-row.drop-row {
		background: rgba(239, 68, 68, 0.08);
	}

	.cell-seq {
		font-family: ui-monospace, monospace;
		font-weight: 700;
		color: var(--text-muted);
	}

	.cell-time {
		font-family: ui-monospace, monospace;
		color: var(--text-secondary);
	}

	.phase-badge {
		font-size: 0.62rem;
		font-weight: 700;
		padding: 0.08rem 0.35rem;
		border-radius: 3px;
		border: 1px solid;
	}

	.cell-event {
		font-family: ui-monospace, monospace;
		color: var(--text-primary);
		font-weight: 500;
	}

	.cell-route {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.route-station {
		color: var(--text-primary);
		font-weight: 600;
	}

	.route-arrow {
		color: var(--accent-cyan);
		font-size: 0.72rem;
	}

	.job-pill {
		font-family: ui-monospace, monospace;
		font-weight: 700;
	}

	.cell-state {
		font-family: ui-monospace, monospace;
		color: var(--text-secondary);
	}

	.cell-caller {
		font-family: ui-monospace, monospace;
		color: var(--text-muted);
		font-size: 0.68rem;
	}

	.text-muted { color: var(--text-muted); }
	.text-red { color: var(--accent-rose); font-weight: 700; }

	.no-events-cell {
		text-align: center;
		padding: 2.5rem;
		color: var(--text-muted);
	}
</style>
