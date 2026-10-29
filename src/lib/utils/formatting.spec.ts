import { describe, it, expect } from 'vitest';
import { formatSimTime, formatBytes, formatNumber, formatCaller } from './formatting';

describe('Formatting Utilities', () => {
	describe('formatSimTime', () => {
		it('formats microseconds (< 1ms)', () => {
			expect(formatSimTime(0.000045)).toBe('45.0 µs');
		});

		it('formats milliseconds (< 1s)', () => {
			expect(formatSimTime(0.052)).toBe('52.00 ms');
		});

		it('formats seconds', () => {
			expect(formatSimTime(12.34567)).toBe('12.3457 s');
		});

		it('formats hours and minutes', () => {
			expect(formatSimTime(3665)).toBe('1h 1m 5.00s');
		});

		it('handles 0 and edge cases', () => {
			expect(formatSimTime(0)).toBe('0.0000 s');
		});
	});

	describe('formatBytes', () => {
		it('formats bytes, KB, MB, GB properly', () => {
			expect(formatBytes(0)).toBe('0 B');
			expect(formatBytes(1024)).toBe('1 KB');
			expect(formatBytes(1024 * 1024 * 5)).toBe('5 MB');
			expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
		});
	});

	describe('formatNumber', () => {
		it('formats thousands with commas or locale separators', () => {
			const formatted = formatNumber(154200);
			expect(formatted).toMatch(/154[,.\s]200/);
		});
	});

	describe('formatCaller', () => {
		it('shortens Java stack trace caller string', () => {
			expect(formatCaller('QueueNet.NetNode.send(NetNode.java:782)')).toBe('NetNode.send:782');
			expect(formatCaller('NodeSections.Queue.process(Queue.java:558)')).toBe('Queue.process:558');
			expect(formatCaller('-')).toBe('-');
		});
	});
});
