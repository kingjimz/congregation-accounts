import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env as svelteEnv } from '$env/dynamic/private';

/** Get env - prefer SvelteKit, fallback to process.env (e.g. Netlify injects at runtime). */
function getEnv() {
	const nodeEnv = typeof process !== 'undefined' ? process.env : {};
	return {
		CLOUDINARY_CLOUD_NAME: svelteEnv.CLOUDINARY_CLOUD_NAME ?? nodeEnv.CLOUDINARY_CLOUD_NAME,
		CLOUDINARY_API_KEY: svelteEnv.CLOUDINARY_API_KEY ?? nodeEnv.CLOUDINARY_API_KEY,
		CLOUDINARY_API_SECRET: svelteEnv.CLOUDINARY_API_SECRET ?? nodeEnv.CLOUDINARY_API_SECRET
	};
}

/** GET /api/cloudinary/status - returns whether Cloudinary env vars are set (for UI to show setup message). */
export const GET: RequestHandler = async ({ url }) => {
	const env = getEnv();
	const configured = !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

	// ?debug=1 returns which vars are set (safe for production - no values)
	const debug = url.searchParams.get('debug') === '1';
	if (debug) {
		return json({
			configured,
			env: {
				CLOUDINARY_CLOUD_NAME: !!env.CLOUDINARY_CLOUD_NAME,
				CLOUDINARY_API_KEY: !!env.CLOUDINARY_API_KEY,
				CLOUDINARY_API_SECRET: !!env.CLOUDINARY_API_SECRET
			},
			note: 'If any are false, set them in Netlify → Site settings → Environment variables and set Scope to "All" (or include "Functions"). Then redeploy.'
		});
	}

	return json({ configured });
};
