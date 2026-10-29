<script lang="ts">
	import type { ActivePacket, ConnectionPath } from '../types/trace';
	import { getPointOnBezier } from '../services/layoutEngine';
	import { getJobClassColor } from '../utils/colors';

	interface Props {
		packet: ActivePacket;
		path?: ConnectionPath;
		onSelect: (packet: ActivePacket) => void;
	}

	let { packet, path, onSelect }: Props = $props();

	let color = $derived(getJobClassColor(packet.jobClass));

	let position = $derived.by(() => {
		if (!path) return { x: 0, y: 0, angle: 0 };
		return getPointOnBezier(path, packet.progress);
	});

	// Compute a point slightly behind for a subtle trail effect
	let trailPos = $derived.by(() => {
		if (!path || packet.progress < 0.05) return null;
		return getPointOnBezier(path, Math.max(0, packet.progress - 0.05));
	});

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		onSelect(packet);
	}
</script>

{#if path}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<g class="packet-group" onclick={handleClick}>
		<!-- Trailing motion particle -->
		{#if trailPos}
			<circle
				cx={trailPos.x}
				cy={trailPos.y}
				r="4"
				class="packet-trail"
				style="fill: {color}; opacity: 0.35;"
			/>
		{/if}

		<!-- Packet Token at current position -->
		<g transform="translate({position.x}, {position.y}) rotate({position.angle})">
			<!-- Subtle ambient glow -->
			<circle cx="0" cy="0" r="11" class="packet-glow" style="fill: {color};" />

			<!-- Directional arrow / chevron -->
			<polygon points="12,0 8,-4 8,4" style="fill: {color};" />

			<!-- Main Capsule -->
			<rect
				x="-12"
				y="-7"
				width="22"
				height="14"
				rx="3"
				ry="3"
				class="packet-body"
				style="stroke: {color};"
			/>

			<!-- Job ID Text -->
			<text x="-1" y="3.5" text-anchor="middle" class="packet-label" style="fill: {color};">
				#{packet.jobId}
			</text>
		</g>

		<title>Packet #{packet.jobId} ({packet.jobClass}) | Progress: {Math.round(packet.progress * 100)}%</title>
	</g>
{/if}

<style>
	.packet-group {
		cursor: pointer;
		user-select: none;
	}

	.packet-trail {
		pointer-events: none;
		transition: cx 0.02s linear, cy 0.02s linear;
	}

	.packet-glow {
		opacity: 0.25;
		filter: blur(2px);
	}

	.packet-body {
		fill: var(--bg-surface);
		stroke-width: 1.5px;
		filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.4));
		transition: stroke 0.15s ease;
	}

	.packet-label {
		font-size: 7.5px;
		font-weight: 700;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		pointer-events: none;
	}
</style>
