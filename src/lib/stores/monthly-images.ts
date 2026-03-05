import { writable, type Writable } from 'svelte/store';
import {
	getMonthlyImages,
	addMonthlyImage,
	deleteMonthlyImage,
	getKhocMonthlyImages,
	addKhocMonthlyImage,
	deleteKhocMonthlyImage,
	type MonthlyImage
} from '$lib/firestore';

export type MonthlyImagesSource = 'congregation' | 'khoc';

export const monthlyImages: Writable<MonthlyImage[]> = writable([]);
export const monthlyImagesLoading: Writable<boolean> = writable(false);
export const monthlyImagesError: Writable<string | null> = writable(null);

/** Cache to avoid re-fetching same month (saves Firestore reads on free tier). TTL 5 min. */
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: MonthlyImage[]; ts: number }>();

function cacheKey(month: string, source: MonthlyImagesSource): string {
	return `${source}:${month}`;
}

function getCached(month: string, source: MonthlyImagesSource): MonthlyImage[] | null {
	const entry = cache.get(cacheKey(month, source));
	if (!entry || Date.now() - entry.ts > CACHE_TTL_MS) return null;
	return entry.data;
}

function setCached(month: string, source: MonthlyImagesSource, data: MonthlyImage[]) {
	cache.set(cacheKey(month, source), { data, ts: Date.now() });
}

export const monthlyImagesStore = {
	async loadByMonth(month: string, source: MonthlyImagesSource = 'congregation') {
		if (!month) {
			monthlyImages.set([]);
			return;
		}
		const cached = getCached(month, source);
		if (cached !== null) {
			monthlyImages.set(cached);
			return;
		}
		monthlyImagesLoading.set(true);
		monthlyImagesError.set(null);
		try {
			const data =
				source === 'khoc'
					? await getKhocMonthlyImages(month)
					: await getMonthlyImages(month);
			setCached(month, source, data);
			monthlyImages.set(data);
		} catch (err) {
			monthlyImagesError.set(err instanceof Error ? err.message : 'Failed to load images');
			console.error('Error loading monthly images:', err);
			monthlyImages.set([]);
		} finally {
			monthlyImagesLoading.set(false);
		}
	},

	async addImage(
		month: string,
		url: string,
		publicId: string,
		caption?: string,
		source: MonthlyImagesSource = 'congregation'
	) {
		monthlyImagesError.set(null);
		try {
			const id =
				source === 'khoc'
					? await addKhocMonthlyImage({ month, url, publicId, caption })
					: await addMonthlyImage({ month, url, publicId, caption });
			const newItem: MonthlyImage = { id, month, url, publicId, caption, uploadedAt: undefined };
			monthlyImages.update((current) => [newItem, ...current]);
			const cached = getCached(month, source);
			if (cached !== null) setCached(month, source, [newItem, ...cached]);
			return id;
		} catch (err) {
			monthlyImagesError.set(err instanceof Error ? err.message : 'Failed to save image');
			throw err;
		}
	},

	async removeImage(
		id: string,
		publicId: string,
		month: string,
		source: MonthlyImagesSource = 'congregation'
	) {
		monthlyImagesError.set(null);
		try {
			const res = await fetch('/api/cloudinary/delete', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ publicId })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || 'Failed to delete from Cloudinary');
			}
			if (source === 'khoc') {
				await deleteKhocMonthlyImage(id);
			} else {
				await deleteMonthlyImage(id);
			}
			monthlyImages.update((current) => {
				const next = current.filter((img) => img.id !== id);
				if (month) cache.delete(cacheKey(month, source));
				return next;
			});
		} catch (err) {
			monthlyImagesError.set(err instanceof Error ? err.message : 'Failed to delete image');
			throw err;
		}
	},

	clearError() {
		monthlyImagesError.set(null);
	}
};
