/**
 * High-contrast, aesthetic color palette for Job Classes
 */
const CLASS_PALETTE = [
	'#38bdf8', // Sky 400 (Cyan/Blue)
	'#a855f7', // Purple 500
	'#f59e0b', // Amber 500
	'#10b981', // Emerald 500
	'#ec4899', // Pink 500
	'#f97316', // Orange 500
	'#06b6d4', // Cyan 500
	'#8b5cf6', // Violet 500
	'#14b8a6', // Teal 500
	'#e11d48', // Rose 600
	'#84cc16', // Lime 500
	'#6366f1'  // Indigo 500
];

/**
 * Station categorization colors
 */
export const STATION_TYPE_COLORS: Record<string, { bg: string; border: string; accent: string; text: string }> = {
	Source: {
		bg: 'rgba(16, 185, 129, 0.12)',
		border: '#059669',
		accent: '#10b981',
		text: '#34d399'
	},
	Queue: {
		bg: 'rgba(56, 189, 248, 0.12)',
		border: '#0284c7',
		accent: '#38bdf8',
		text: '#7dd3fc'
	},
	Server: {
		bg: 'rgba(245, 158, 11, 0.12)',
		border: '#d97706',
		accent: '#f59e0b',
		text: '#fbbf24'
	},
	Delay: {
		bg: 'rgba(168, 85, 247, 0.12)',
		border: '#9333ea',
		accent: '#a855f7',
		text: '#c084fc'
	},
	Fork: {
		bg: 'rgba(249, 115, 22, 0.12)',
		border: '#ea580c',
		accent: '#f97316',
		text: '#fb923c'
	},
	Join: {
		bg: 'rgba(236, 72, 153, 0.12)',
		border: '#db2777',
		accent: '#ec4899',
		text: '#f472b6'
	},
	Sink: {
		bg: 'rgba(100, 116, 139, 0.16)',
		border: '#475569',
		accent: '#94a3b8',
		text: '#cbd5e1'
	},
	Station: {
		bg: 'rgba(99, 102, 241, 0.12)',
		border: '#4f46e5',
		accent: '#6366f1',
		text: '#818cf8'
	}
};

/**
 * Get color for a job class name
 */
export function getJobClassColor(className?: string, classId?: number): string {
	if (!className && classId === undefined) return '#94a3b8';
	if (classId !== undefined && classId >= 0) {
		return CLASS_PALETTE[classId % CLASS_PALETTE.length];
	}
	// Hash string to pick deterministic color
	let hash = 0;
	const name = className || 'default';
	for (let i = 0; i < name.length; i++) {
		hash = (hash << 5) - hash + name.charCodeAt(i);
		hash |= 0;
	}
	const index = Math.abs(hash) % CLASS_PALETTE.length;
	return CLASS_PALETTE[index];
}

/**
 * Phase status badge color and border
 */
export function getPhaseStyle(phase: string): { bg: string; text: string; border: string } {
	switch (phase.toUpperCase()) {
		case 'SEND':
			return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#0284c7' };
		case 'DISPATCH':
			return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: '#059669' };
		case 'DROP':
			return { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', border: '#dc2626' };
		case 'NOT_PROCESSED':
			return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '#d97706' };
		default:
			return { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: '#64748b' };
	}
}
