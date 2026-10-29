import type { NodeTopology, ConnectionTopology, NodeLayout, ConnectionPath, Point2D } from '../types/trace';

export const NODE_WIDTH = 210;
export const NODE_HEIGHT = 120;
export const LAYER_SPACING_X = 300;
export const NODE_SPACING_Y = 160;
export const CANVAS_PADDING = 80;

/**
 * Computes automatic layered DAG layout for nodes
 */
export function computeTopologyLayout(
	nodes: NodeTopology[],
	connections: ConnectionTopology[],
	userPositions: Record<string, Point2D> = {}
): { layouts: Map<string, NodeLayout>; paths: ConnectionPath[] } {
	const layouts = new Map<string, NodeLayout>();
	if (!nodes || nodes.length === 0) {
		return { layouts, paths: [] };
	}

	// Build adjacency graph
	const inDegree = new Map<string, number>();
	const outNodes = new Map<string, string[]>();

	for (const node of nodes) {
		inDegree.set(node.name, 0);
		outNodes.set(node.name, []);
	}

	for (const conn of connections) {
		outNodes.get(conn.source)?.push(conn.target);
		inDegree.set(conn.target, (inDegree.get(conn.target) || 0) + 1);
	}

	// Assign layers using topological breadth-first search with cycle protection
	const layers = new Map<string, number>();
	const queue: { name: string; layer: number }[] = [];
	const visited = new Set<string>();

	// Sources or 0-in-degree nodes start at layer 0
	for (const node of nodes) {
		if ((inDegree.get(node.name) || 0) === 0 || node.nodeType === 'Source') {
			queue.push({ name: node.name, layer: 0 });
			layers.set(node.name, 0);
			visited.add(node.name);
		}
	}

	// If all nodes have in-degree (e.g. pure cycle / closed network), seed with the first node
	if (queue.length === 0 && nodes.length > 0) {
		queue.push({ name: nodes[0].name, layer: 0 });
		layers.set(nodes[0].name, 0);
		visited.add(nodes[0].name);
	}

	while (queue.length > 0) {
		const current = queue.shift()!;
		const nextLayer = current.layer + 1;
		const targets = outNodes.get(current.name) || [];

		for (const target of targets) {
			if (!visited.has(target)) {
				visited.add(target);
				layers.set(target, nextLayer);
				queue.push({ name: target, layer: nextLayer });
			}
		}
	}

	// Sinks should be positioned at the max layer
	let maxLayer = 0;
	for (const layer of layers.values()) {
		if (layer > maxLayer) maxLayer = layer;
	}

	for (const node of nodes) {
		if (!layers.has(node.name)) {
			layers.set(node.name, node.nodeType === 'Sink' ? maxLayer + 1 : 1);
		} else if (node.nodeType === 'Sink' && layers.get(node.name)! < maxLayer) {
			layers.set(node.name, maxLayer);
		}
	}

	// Group nodes by layer
	const layerBuckets = new Map<number, NodeTopology[]>();
	for (const node of nodes) {
		const l = layers.get(node.name) || 0;
		if (!layerBuckets.has(l)) layerBuckets.set(l, []);
		layerBuckets.get(l)!.push(node);
	}

	// Sort layer keys
	const sortedLayers = Array.from(layerBuckets.keys()).sort((a, b) => a - b);

	// Calculate coordinates
	for (let i = 0; i < sortedLayers.length; i++) {
		const l = sortedLayers[i];
		const nodesInLayer = layerBuckets.get(l)!;
		const totalLayerHeight = (nodesInLayer.length - 1) * NODE_SPACING_Y;
		const startY = CANVAS_PADDING + Math.max(0, (400 - totalLayerHeight) / 2);

		nodesInLayer.forEach((node, idx) => {
			// Check if user manually dragged this node
			const userPos = userPositions[node.name];
			const x = userPos ? userPos.x : CANVAS_PADDING + i * LAYER_SPACING_X;
			const y = userPos ? userPos.y : startY + idx * NODE_SPACING_Y;

			layouts.set(node.name, {
				id: node.id,
				name: node.name,
				nodeType: node.nodeType,
				x,
				y,
				width: NODE_WIDTH,
				height: NODE_HEIGHT
			});
		});
	}

	// Generate smooth curved connection paths
	const paths: ConnectionPath[] = [];
	for (const conn of connections) {
		const src = layouts.get(conn.source);
		const dst = layouts.get(conn.target);
		if (!src || !dst) continue;

		// Source port: middle right edge of source station
		const startX = src.x + src.width;
		const startY = src.y + src.height / 2;

		// Target port: middle left edge of target station
		const endX = dst.x;
		const endY = dst.y + dst.height / 2;

		// Cubic Bézier control points
		const dx = Math.abs(endX - startX) * 0.55;
		const controlX1 = startX + Math.max(40, dx);
		const controlY1 = startY;
		const controlX2 = endX - Math.max(40, dx);
		const controlY2 = endY;

		const pathData = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

		paths.push({
			source: conn.source,
			target: conn.target,
			startX,
			startY,
			endX,
			endY,
			controlX1,
			controlY1,
			controlX2,
			controlY2,
			pathData
		});
	}

	return { layouts, paths };
}

/**
 * Calculate coordinates and tangent angle along a cubic Bézier curve at progress t (0.0 to 1.0)
 */
export function getPointOnBezier(
	path: ConnectionPath,
	t: number
): { x: number; y: number; angle: number } {
	const clamped = Math.max(0, Math.min(1, t));
	const u = 1 - clamped;
	const tt = clamped * clamped;
	const uu = u * u;
	const uuu = uu * u;
	const ttt = tt * clamped;

	const p0x = path.startX;
	const p0y = path.startY;
	const p1x = path.controlX1;
	const p1y = path.controlY1;
	const p2x = path.controlX2;
	const p2y = path.controlY2;
	const p3x = path.endX;
	const p3y = path.endY;

	// B(t) = (1-t)^3 * P0 + 3*(1-t)^2*t * P1 + 3*(1-t)*t^2 * P2 + t^3 * P3
	const x = uuu * p0x + 3 * uu * clamped * p1x + 3 * u * tt * p2x + ttt * p3x;
	const y = uuu * p0y + 3 * uu * clamped * p1y + 3 * u * tt * p2y + ttt * p3y;

	// First derivative B'(t) for angle
	const dx = 3 * uu * (p1x - p0x) + 6 * u * clamped * (p2x - p1x) + 3 * tt * (p3x - p2x);
	const dy = 3 * uu * (p1y - p0y) + 6 * u * clamped * (p2y - p1y) + 3 * tt * (p3y - p2y);
	const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

	return { x, y, angle };
}
