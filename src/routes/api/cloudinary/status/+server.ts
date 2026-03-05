import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

/** GET /api/cloudinary/status - returns whether Cloudinary env vars are set (for UI to show setup message). */
export const GET: RequestHandler = async () => {
	const configured = !!(
		env.CLOUDINARY_CLOUD_NAME &&
		env.CLOUDINARY_API_KEY &&
		env.CLOUDINARY_API_SECRET
	);
	return json({ configured });
};
