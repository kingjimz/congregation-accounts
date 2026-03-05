import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { v2 as cloudinary } from 'cloudinary';
import { env as svelteEnv } from '$env/dynamic/private';

function getEnv() {
	const pe = typeof process !== 'undefined' ? process.env : ({} as Record<string, string | undefined>);
	return {
		CLOUDINARY_CLOUD_NAME: svelteEnv?.CLOUDINARY_CLOUD_NAME || pe.CLOUDINARY_CLOUD_NAME || '',
		CLOUDINARY_API_KEY: svelteEnv?.CLOUDINARY_API_KEY || pe.CLOUDINARY_API_KEY || '',
		CLOUDINARY_API_SECRET: svelteEnv?.CLOUDINARY_API_SECRET || pe.CLOUDINARY_API_SECRET || ''
	};
}

export const DELETE: RequestHandler = async ({ request }) => {
	const env = getEnv();
	const cloudName = env.CLOUDINARY_CLOUD_NAME;
	const apiKey = env.CLOUDINARY_API_KEY;
	const apiSecret = env.CLOUDINARY_API_SECRET;
	if (!cloudName || !apiKey || !apiSecret) {
		return json({ error: 'Cloudinary is not configured' }, { status: 503 });
	}
	cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
	try {
		const body = await request.json().catch(() => ({}));
		const publicId = (body.publicId ?? body.public_id) as string | undefined;

		if (!publicId || typeof publicId !== 'string') {
			return json({ error: 'Missing publicId' }, { status: 400 });
		}

		await cloudinary.uploader.destroy(publicId);
		return json({ ok: true });
	} catch (err) {
		console.error('Cloudinary delete error:', err);
		return json(
			{ error: err instanceof Error ? err.message : 'Delete failed' },
			{ status: 500 }
		);
	}
};
