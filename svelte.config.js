import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Using Netlify adapter for continuous deployment
		adapter: adapter({
			// Optional: configure Netlify-specific options
			edge: false, // Set to true if you want to use Netlify Edge Functions
			split: false // Set to true to split your app into multiple functions
		})
	}
};

export default config;
