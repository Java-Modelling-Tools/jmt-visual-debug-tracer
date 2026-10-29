<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { themeManager } from '../lib';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>JMT Visual Debugger</title>
	<link rel="icon" href={favicon} />
	<meta name="description" content="Discrete-event packet flow tracer and simulation debugger for Java Modelling Tools" />
</svelte:head>

<div class="app-shell" data-theme={themeManager.current}>
	{@render children()}
</div>

<style>
	:global(:root) {
		/* Dark theme defaults (Deep Obsidian / Technical Slate) */
		--bg-base: #09090b;
		--bg-surface: #121215;
		--bg-card: #18181b;
		--bg-subtle: #202024;
		--bg-input: #0e0e11;
		
		--border-base: #27272a;
		--border-subtle: #1f1f23;
		--border-focus: #38bdf8;
		
		--text-primary: #f4f4f5;
		--text-secondary: #a1a1aa;
		--text-muted: #71717a;
		
		--accent-blue: #0284c7;
		--accent-blue-hover: #0369a1;
		--accent-cyan: #38bdf8;
		--accent-purple: #a855f7;
		--accent-emerald: #10b981;
		--accent-amber: #f59e0b;
		--accent-rose: #ef4444;
		
		--wire-color: #334155;
		--wire-active: #38bdf8;
		--canvas-dots: #1e293b;
		--canvas-bg: #09090c;
	}

	:global([data-theme="light"]) {
		/* Precision Light theme (Clean Slate / Monochrome accents) */
		--bg-base: #f8fafc;
		--bg-surface: #ffffff;
		--bg-card: #f1f5f9;
		--bg-subtle: #e2e8f0;
		--bg-input: #ffffff;
		
		--border-base: #cbd5e1;
		--border-subtle: #e2e8f0;
		--border-focus: #0284c7;
		
		--text-primary: #0f172a;
		--text-secondary: #334155;
		--text-muted: #64748b;
		
		--accent-blue: #0284c7;
		--accent-blue-hover: #0369a1;
		--accent-cyan: #0284c7;
		--accent-purple: #7c3aed;
		--accent-emerald: #059669;
		--accent-amber: #d97706;
		--accent-rose: #dc2626;
		
		--wire-color: #94a3b8;
		--wire-active: #0284c7;
		--canvas-dots: #cbd5e1;
		--canvas-bg: #f8fafc;
	}

	:global(html, body) {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background-color: var(--bg-base);
		color: var(--text-primary);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	:global(::-webkit-scrollbar) {
		width: 6px;
		height: 6px;
	}

	:global(::-webkit-scrollbar-track) {
		background: var(--bg-base);
	}

	:global(::-webkit-scrollbar-thumb) {
		background: var(--border-base);
		border-radius: 3px;
	}

	:global(::-webkit-scrollbar-thumb:hover) {
		background: var(--text-muted);
	}

	.app-shell {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--bg-base);
	}
</style>
