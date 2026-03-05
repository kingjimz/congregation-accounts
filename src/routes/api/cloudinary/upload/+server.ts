import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { env as svelteEnv } from '$env/dynamic/private';

function getEnv() {
	const nodeEnv = typeof process !== 'undefined' ? process.env : {};
	return {
		CLOUDINARY_CLOUD_NAME: svelteEnv.CLOUDINARY_CLOUD_NAME ?? nodeEnv.CLOUDINARY_CLOUD_NAME,
		CLOUDINARY_API_KEY: svelteEnv.CLOUDINARY_API_KEY ?? nodeEnv.CLOUDINARY_API_KEY,
		CLOUDINARY_API_SECRET: svelteEnv.CLOUDINARY_API_SECRET ?? nodeEnv.CLOUDINARY_API_SECRET
	};
}

export const POST: RequestHandler = async ({ request }) => {
	const env = getEnv();
	const cloudName = env.CLOUDINARY_CLOUD_NAME;
	const apiKey = env.CLOUDINARY_API_KEY;
	const apiSecret = env.CLOUDINARY_API_SECRET;
	if (!cloudName || !apiKey || !apiSecret) {
		return json({ error: 'Cloudinary is not configured' }, { status: 503 });
	}
	cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const month = formData.get('month') as string | null;
		const source = (formData.get('source') as string | null) || 'congregation';

		if (!file || !month || typeof month !== 'string') {
			return json({ error: 'Missing file or month' }, { status: 400 });
		}

		// Validate month format YYYY-MM
		if (!/^\d{4}-\d{2}$/.test(month)) {
			return json({ error: 'Invalid month format (use YYYY-MM)' }, { status: 400 });
		}

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const folder =
			source === 'khoc'
				? `congregation-accounts/khoc/${month}`
				: `congregation-accounts/${month}`;

		const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
			const stream = cloudinary.uploader.upload_stream(
				{
					folder,
					resource_type: 'auto'
				},
				(err, res) => {
					if (err) reject(err);
					else if (res) resolve({ secure_url: res.secure_url, public_id: res.public_id });
					else reject(new Error('No result from Cloudinary'));
				}
			);
			Readable.from(buffer).pipe(stream);
		});

		return json({ url: result.secure_url, publicId: result.public_id });
	} catch (err) {
		console.error('Cloudinary upload error:', err);
		return json(
			{ error: err instanceof Error ? err.message : 'Upload failed' },
			{ status: 500 }
		);
	}
};
