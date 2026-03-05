import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '$env/dynamic/private';

export const DELETE: RequestHandler = async ({ request }) => {
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
