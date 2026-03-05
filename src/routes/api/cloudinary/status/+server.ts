import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env as svelteEnv } from '$env/dynamic/private';

function getEnv() {
	const pe = typeof process !== 'undefined' ? process.env : ({} as Record<string, string | undefined>);
	return {
		CLOUDINARY_CLOUD_NAME: svelteEnv?.CLOUDINARY_CLOUD_NAME || pe.CLOUDINARY_CLOUD_NAME || '',
		CLOUDINARY_API_KEY: svelteEnv?.CLOUDINARY_API_KEY || pe.CLOUDINARY_API_KEY || '',
		CLOUDINARY_API_SECRET: svelteEnv?.CLOUDINARY_API_SECRET || pe.CLOUDINARY_API_SECRET || ''
	};
}

/** GET /api/cloudinary/status */
export const GET: RequestHandler = async ({ url }) => {
	const env = getEnv();
	const configured = !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

	const debug = url.searchParams.get('debug') === '1';
	if (debug) {
		const pe = typeof process !== 'undefined' ? process.env : ({} as Record<string, string | undefined>);
		return json({
			configured,
			svelteEnvKeys: svelteEnv ? Object.keys(svelteEnv).filter((k) => k.startsWith('CLOUD')) : [],
			processEnvKeys: pe ? Object.keys(pe).filter((k) => k.startsWith('CLOUD')) : [],
			env: {
				CLOUDINARY_CLOUD_NAME: !!env.CLOUDINARY_CLOUD_NAME,
				CLOUDINARY_API_KEY: !!env.CLOUDINARY_API_KEY,
				CLOUDINARY_API_SECRET: !!env.CLOUDINARY_API_SECRET
			},
			note: 'If any are false, set them in Netlify → Site settings → Environment variables, Scope = "All" (or include "Functions"), then redeploy.'
		});
	}

	return json({ configured });
};
