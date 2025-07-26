import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'auto';

// Create the theme store
function createThemeStore() {
	// Default to auto theme
	const { subscribe, set } = writable<Theme>('auto');

	return {
		subscribe,
		setTheme: (theme: Theme) => {
			set(theme);
			if (browser) {
				localStorage.setItem('theme', theme);
				applyTheme(theme);
			}
		},
		init: () => {
			if (browser) {
				const savedTheme = localStorage.getItem('theme') as Theme;
				const theme = savedTheme || 'auto';
				set(theme);
				applyTheme(theme);
			}
		}
	};
}

export const theme = createThemeStore();

// Function to apply theme to the document
export function applyTheme(selectedTheme: Theme) {
	if (!browser) return;

	const root = document.documentElement;
	
	// Remove existing theme classes
	root.classList.remove('light', 'dark');
	
	if (selectedTheme === 'auto') {
		// Use system preference
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		root.classList.add(prefersDark ? 'dark' : 'light');
	} else {
		root.classList.add(selectedTheme);
	}
}

// Listen for system theme changes when in auto mode
if (browser) {
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	mediaQuery.addEventListener('change', () => {
		theme.subscribe(currentTheme => {
			if (currentTheme === 'auto') {
				applyTheme('auto');
			}
		})();
	});
}
