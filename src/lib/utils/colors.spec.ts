import { describe, it, expect } from 'vitest';
import { getJobClassColor, getPhaseStyle, STATION_TYPE_COLORS } from './colors';

describe('Color Utilities', () => {
	it('assigns deterministic colors to job class names', () => {
		const color1 = getJobClassColor('CheckoutHTTP');
		const color2 = getJobClassColor('CheckoutHTTP');
		expect(color1).toBe(color2);

		const color3 = getJobClassColor('InventorySync');
		expect(typeof color3).toBe('string');
		expect(color3.startsWith('#')).toBe(true);
	});

	it('assigns colors based on classId when provided', () => {
		const c0 = getJobClassColor(undefined, 0);
		const c1 = getJobClassColor(undefined, 1);
		expect(c0).not.toBe(c1);
	});

	it('provides styles for event phases', () => {
		const sendStyle = getPhaseStyle('SEND');
		expect(sendStyle.text).toBe('#38bdf8');

		const dispatchStyle = getPhaseStyle('DISPATCH');
		expect(dispatchStyle.text).toBe('#34d399');

		const dropStyle = getPhaseStyle('DROP');
		expect(dropStyle.text).toBe('#f87171');
	});

	it('defines themes for all standard station types', () => {
		const types = ['Source', 'Queue', 'Server', 'Delay', 'Fork', 'Join', 'Sink'];
		for (const t of types) {
			expect(STATION_TYPE_COLORS[t]).toBeDefined();
			expect(STATION_TYPE_COLORS[t].border).toBeDefined();
			expect(STATION_TYPE_COLORS[t].accent).toBeDefined();
		}
	});
});
