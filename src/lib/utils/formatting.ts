/**
 * Format discrete simulation time to readable clock format
 */
export function formatSimTime(t: number): string {
	if (isNaN(t) || t === undefined || t === null) return '0.0000 s';
	if (t < 0.001 && t > 0) {
		return `${(t * 1_000_000).toFixed(1)} µs`;
	} else if (t < 1.0 && t > 0) {
		return `${(t * 1000).toFixed(2)} ms`;
	} else if (t >= 3600) {
		const hours = Math.floor(t / 3600);
		const mins = Math.floor((t % 3600) / 60);
		const secs = (t % 60).toFixed(2);
		return `${hours}h ${mins}m ${secs}s`;
	}
	return `${t.toFixed(4)} s`;
}

/**
 * Format bytes to human readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format sequence numbers with thousand separators
 */
export function formatNumber(n: number): string {
	return new Intl.NumberFormat().format(n);
}

/**
 * Shorten a caller string (e.g. NodeSections.Queue.process(Queue.java:558) -> Queue.process:558)
 */
export function formatCaller(caller?: string): string {
	if (!caller) return '-';
	const match = caller.match(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\([^:]+:(\d+)\)/);
	if (match) {
		return `${match[1]}.${match[2]}:${match[3]}`;
	}
	return caller;
}
