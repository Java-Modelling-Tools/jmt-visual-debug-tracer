export type Theme = 'dark' | 'light';

export class ThemeManager {
	current = $state<Theme>('dark');

	constructor() {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('jmt_theme') as Theme | null;
			if (saved === 'dark' || saved === 'light') {
				this.current = saved;
			}
			this.apply();
		}
	}

	toggle() {
		this.current = this.current === 'dark' ? 'light' : 'dark';
		if (typeof window !== 'undefined') {
			localStorage.setItem('jmt_theme', this.current);
			this.apply();
		}
	}

	set(theme: Theme) {
		this.current = theme;
		if (typeof window !== 'undefined') {
			localStorage.setItem('jmt_theme', theme);
			this.apply();
		}
	}

	private apply() {
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', this.current);
		}
	}
}

export const themeManager = new ThemeManager();
