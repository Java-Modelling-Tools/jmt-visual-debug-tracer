import { describe, it, expect } from 'vitest';
import {
	computeTopologyLayout,
	getPointOnBezier,
} from './layoutEngine';
import type { NodeTopology, ConnectionTopology, ConnectionPath } from '../types/trace';

describe('LayoutEngine', () => {
	const sampleNodes: NodeTopology[] = [
		{ id: 1, name: 'ClientSource', nodeType: 'Source' },
		{ id: 2, name: 'AppQueue', nodeType: 'Queue' },
		{ id: 3, name: 'DBServer', nodeType: 'Server' },
		{ id: 4, name: 'SinkStation', nodeType: 'Sink' }
	];

	const sampleConnections: ConnectionTopology[] = [
		{ source: 'ClientSource', target: 'AppQueue' },
		{ source: 'AppQueue', target: 'DBServer' },
		{ source: 'DBServer', target: 'SinkStation' }
	];

	it('computes topological DAG layers with Sources on left and Sinks on right', () => {
		const layout = computeTopologyLayout(sampleNodes, sampleConnections);

		expect(layout.layouts.size).toBe(4);
		expect(layout.paths.length).toBe(3);

		const source = layout.layouts.get('ClientSource')!;
		const queue = layout.layouts.get('AppQueue')!;
		const server = layout.layouts.get('DBServer')!;
		const sink = layout.layouts.get('SinkStation')!;

		expect(source.x).toBeLessThan(queue.x);
		expect(queue.x).toBeLessThan(server.x);
		expect(server.x).toBeLessThan(sink.x);
	});

	it('preserves user manual drag positions', () => {
		const userOverrides = {
			AppQueue: { x: 550, y: 720 }
		};

		const layout = computeTopologyLayout(sampleNodes, sampleConnections, userOverrides);
		const queue = layout.layouts.get('AppQueue')!;

		expect(queue.x).toBe(550);
		expect(queue.y).toBe(720);
	});

	it('handles cyclic / feedback loops without infinite recursion', () => {
		const cyclicConnections: ConnectionTopology[] = [
			{ source: 'AppQueue', target: 'DBServer' },
			{ source: 'DBServer', target: 'AppQueue' } // feedback loop
		];

		const layout = computeTopologyLayout(
			[sampleNodes[1], sampleNodes[2]],
			cyclicConnections
		);

		expect(layout.layouts.size).toBe(2);
		expect(layout.paths.length).toBe(2);
	});

	describe('Bézier Curve Calculation (getPointOnBezier)', () => {
		const testPath: ConnectionPath = {
			source: 'A',
			target: 'B',
			startX: 100,
			startY: 200,
			endX: 400,
			endY: 500,
			controlX1: 250,
			controlY1: 200,
			controlX2: 250,
			controlY2: 500,
			pathData: ''
		};

		it('evaluates to start point at t = 0.0', () => {
			const pt = getPointOnBezier(testPath, 0.0);
			expect(pt.x).toBeCloseTo(100);
			expect(pt.y).toBeCloseTo(200);
		});

		it('evaluates to end point at t = 1.0', () => {
			const pt = getPointOnBezier(testPath, 1.0);
			expect(pt.x).toBeCloseTo(400);
			expect(pt.y).toBeCloseTo(500);
		});

		it('calculates tangent angle along the path', () => {
			const pt0 = getPointOnBezier(testPath, 0.0);
			expect(typeof pt0.angle).toBe('number');
			expect(isNaN(pt0.angle)).toBe(false);

			const ptMid = getPointOnBezier(testPath, 0.5);
			expect(ptMid.x).toBeGreaterThan(100);
			expect(ptMid.x).toBeLessThan(400);
		});

		it('clamps progress t outside [0, 1]', () => {
			const ptUnder = getPointOnBezier(testPath, -0.5);
			expect(ptUnder.x).toBeCloseTo(100);

			const ptOver = getPointOnBezier(testPath, 1.5);
			expect(ptOver.x).toBeCloseTo(400);
		});
	});
});
