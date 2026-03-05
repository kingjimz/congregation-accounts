<script lang="ts">
	import { Card, Alert } from '$lib/components/ui';
	import {
		monthlyImages,
		monthlyImagesLoading,
		monthlyImagesError,
		monthlyImagesStore,
		type MonthlyImagesSource
	} from '$lib/stores/monthly-images';
	import type { MonthlyImage } from '$lib/firestore';

	interface Props {
		selectedMonth: string;
		/** 'congregation' = main dashboard only; 'khoc' = KHOC dashboard only. Images are stored separately. */
		source?: MonthlyImagesSource;
	}

	let { selectedMonth, source = 'congregation' }: Props = $props();

	let uploadInput = $state<HTMLInputElement | undefined>();
	let uploading = $state(false);
	let uploadError = $state('');
	let cloudinaryConfigured = $state<boolean | null>(null);
	let isDragging = $state(false);

	/** Cloudinary status: fetch once per session to avoid repeated API calls. */
	let statusFetched = $state(false);
	$effect(() => {
		if (!selectedMonth || selectedMonth === '' || statusFetched) return;
		statusFetched = true;
		fetch('/api/cloudinary/status')
			.then((r) => r.json())
			.then((data) => { cloudinaryConfigured = data.configured === true; })
			.catch(() => { cloudinaryConfigured = false; });
	});

	$effect(() => {
		monthlyImagesStore.loadByMonth(selectedMonth, source);
	});

	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input?.files?.[0];
		if (!file) return;
		handleFile(file);
	}

	async function handleFile(file: File) {
		if (!selectedMonth || !file?.type.startsWith('image/')) {
			if (file && !file.type.startsWith('image/')) {
				uploadError = 'Please select an image file (JPG, PNG, WebP, etc.)';
			}
			return;
		}
		uploading = true;
		uploadError = '';
		try {
			const formData = new FormData();
			formData.set('file', file);
			formData.set('month', selectedMonth);
			formData.set('source', source);
			const res = await fetch('/api/cloudinary/upload', {
				method: 'POST',
				body: formData
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Upload failed');
			await monthlyImagesStore.addImage(selectedMonth, data.url, data.publicId, undefined, source);
			if (uploadInput) uploadInput.value = '';
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	async function handleUpload() {
		if (!uploadInput?.files?.length) return;
		await handleFile(uploadInput.files[0]);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) handleFile(file);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	async function handleDelete(img: MonthlyImage) {
		if (!img.id || !img.publicId) return;
		try {
			await monthlyImagesStore.removeImage(img.id, img.publicId, selectedMonth, source);
		} catch {
			// Error shown in store
		}
	}

	/** Cloudinary thumbnail URL: smaller size + auto format/quality to save bandwidth (free tier). */
	function thumbnailUrl(url: string): string {
		if (!url || !url.includes('cloudinary.com')) return url;
		// Insert transformation after /upload/ : w_320 = max width 320px, c_limit = keep aspect, q_auto, f_auto = less bandwidth
		return url.replace('/upload/', '/upload/w_320,c_limit,q_auto,f_auto/');
	}
</script>

<Card title="Receipts" padding="sm">
	{#if !selectedMonth || selectedMonth === ''}
		<p class="text-sm" style="color: var(--color-text-secondary);">
			Select a month to upload and view images.
		</p>
	{:else if cloudinaryConfigured === false}
		<div class="rounded-lg p-4 border" style="background: var(--color-surface-primary); border-color: var(--color-border-primary);">
			<p class="text-sm font-medium mb-2" style="color: var(--color-text-primary);">Cloudinary is not configured</p>
			<p class="text-sm mb-3" style="color: var(--color-text-secondary);">
				To upload images, set these environment variables (e.g. in Netlify: Site settings → Environment variables):
			</p>
			<ul class="text-sm font-mono space-y-1 mb-3 pl-4" style="color: var(--color-text-secondary);">
				<li>CLOUDINARY_CLOUD_NAME</li>
				<li>CLOUDINARY_API_KEY</li>
				<li>CLOUDINARY_API_SECRET</li>
			</ul>
			<p class="text-xs" style="color: var(--color-text-tertiary);">
				Get them from your <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer" class="underline">Cloudinary dashboard</a>. Then redeploy the app.
			</p>
		</div>
	{:else}
		<div class="monthly-images">
			<!-- Upload zone (only when configured) -->
			{#if cloudinaryConfigured === true}
				<label
					for="monthly-images-file-input-{source}"
					class="upload-zone"
					class:upload-zone--dragging={isDragging}
					class:upload-zone--uploading={uploading}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					ondrop={handleDrop}
				>
					<input
						id="monthly-images-file-input-{source}"
						type="file"
						accept="image/*"
						bind:this={uploadInput}
						onchange={onFileChange}
						class="upload-zone__input"
						aria-label="Choose image to upload"
						disabled={uploading}
					/>
					{#if uploading}
						<div class="upload-zone__content">
							<div class="upload-zone__spinner" aria-hidden="true"></div>
							<span class="upload-zone__label">Uploading…</span>
							<span class="upload-zone__hint">Please wait</span>
						</div>
					{:else}
						<div class="upload-zone__content">
							<svg class="upload-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
								<polyline points="17 8 12 3 7 8" />
								<line x1="12" y1="3" x2="12" y2="15" />
							</svg>
							<span class="upload-zone__label">Choose file or drag and drop</span>
							<span class="upload-zone__hint">JPG, PNG, WebP</span>
						</div>
					{/if}
				</label>
			{/if}
			{#if uploadError}
				<p class="upload-error">{uploadError}</p>
			{/if}

			{#if $monthlyImagesError}
				<Alert
					variant="error"
					message={$monthlyImagesError}
					dismissible
					ondismiss={() => monthlyImagesStore.clearError()}
				/>
				{#if $monthlyImagesError.toLowerCase().includes('permission') || $monthlyImagesError.toLowerCase().includes('insufficient')}
					<p class="upload-error-hint">
						Make sure you’re signed in and that Firestore rules are deployed (including <code>monthly_images</code>). Run <code>firebase deploy --only firestore:rules</code> if needed.
					</p>
				{/if}
			{/if}

			{#if $monthlyImagesLoading}
				<div class="images-loading">
					<div class="images-loading__spinner" aria-hidden="true"></div>
					<span class="images-loading__text">Loading images…</span>
				</div>
			{:else if $monthlyImages.length === 0}
				<div class="images-empty">
					<svg class="images-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
						<circle cx="8.5" cy="8.5" r="1.5" />
						<polyline points="21 15 16 10 5 21" />
					</svg>
					<p class="images-empty__text">No images for this month yet.</p>
					{#if cloudinaryConfigured === true}
						<p class="images-empty__hint">Use the upload area above to add receipts or photos.</p>
					{/if}
				</div>
			{:else}
				<div class="images-grid" role="list">
					{#each $monthlyImages as img (img.publicId)}
						<article class="images-grid__item" role="listitem">
							<a
								href={img.url}
								target="_blank"
								rel="noopener noreferrer"
								class="images-grid__link"
							>
								<img
									src={thumbnailUrl(img.url)}
									alt={img.caption ?? 'Uploaded image'}
									class="images-grid__img"
									loading="lazy"
									decoding="async"
								/>
							</a>
							<button
								type="button"
								onclick={(e) => { e.preventDefault(); handleDelete(img); }}
								class="images-grid__delete"
								title="Delete image"
								aria-label="Delete image"
							>
								<svg class="images-grid__delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</Card>

<style>
	.monthly-images {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* ----- Upload zone ----- */
	.upload-zone {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 140px;
		padding: 1.25rem 1.5rem;
		border: 2px dashed var(--color-border-secondary);
		border-radius: 12px;
		background: var(--color-surface-primary);
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
		outline: none;
	}
	.upload-zone:hover,
	.upload-zone:focus-visible {
		border-color: var(--color-accent);
		background: var(--color-accent-alpha);
		box-shadow: 0 0 0 3px var(--color-accent-alpha);
	}
	.upload-zone--dragging {
		border-color: var(--color-accent);
		background: var(--color-accent-alpha);
	}
	.upload-zone--uploading {
		cursor: wait;
		pointer-events: none;
	}
	.upload-zone__input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}
	.upload-zone__content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		pointer-events: none;
	}
	.upload-zone__icon {
		width: 2.5rem;
		height: 2.5rem;
		color: var(--color-text-tertiary);
		transition: color 0.2s;
	}
	.upload-zone:hover .upload-zone__icon,
	.upload-zone--dragging .upload-zone__icon {
		color: var(--color-accent);
	}
	.upload-zone__label {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.upload-zone__hint {
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
	}
	.upload-zone__spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid var(--color-border-primary);
		border-top-color: var(--color-accent);
		border-radius: 50%;
		animation: monthly-images-spin 0.7s linear infinite;
	}
	@keyframes monthly-images-spin {
		to { transform: rotate(360deg); }
	}

	.upload-error {
		font-size: 0.875rem;
		color: var(--color-error);
		margin: 0;
	}
	.upload-error-hint {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin: 0.25rem 0 0;
	}
	.upload-error-hint code {
		font-size: 0.7em;
		padding: 0.1em 0.35em;
		border-radius: 4px;
		background: var(--color-surface-secondary);
		color: var(--color-text-primary);
	}

	/* ----- Loading / empty ----- */
	.images-loading,
	.images-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2.5rem 1rem;
		text-align: center;
	}
	.images-loading__spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid var(--color-border-primary);
		border-top-color: var(--color-accent);
		border-radius: 50%;
		animation: monthly-images-spin 0.7s linear infinite;
	}
	.images-loading__text {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}
	.images-empty__icon {
		width: 3rem;
		height: 3rem;
		color: var(--color-text-tertiary);
	}
	.images-empty__text {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-text-primary);
		margin: 0;
	}
	.images-empty__hint {
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
		margin: 0;
	}

	/* ----- Image grid: responsive ----- */
	.images-grid {
		display: grid;
		gap: 0.75rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	/* Mobile: 2 columns, compact gap */
	.images-grid {
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}
	/* Tablet: 3–4 columns */
	@media (min-width: 640px) {
		.images-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 0.75rem;
		}
	}
	@media (min-width: 768px) {
		.images-grid {
			grid-template-columns: repeat(4, 1fr);
			gap: 0.875rem;
		}
	}
	/* Desktop: 4–5 columns, larger gap */
	@media (min-width: 1024px) {
		.images-grid {
			grid-template-columns: repeat(4, 1fr);
			gap: 1rem;
		}
	}
	@media (min-width: 1280px) {
		.images-grid {
			grid-template-columns: repeat(5, 1fr);
			gap: 1rem;
		}
	}

	.images-grid__item {
		position: relative;
		border-radius: 10px;
		overflow: hidden;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		box-shadow: var(--shadow-sm);
		transition: box-shadow 0.2s, border-color 0.2s;
		aspect-ratio: 1;
	}
	.images-grid__item:hover {
		box-shadow: var(--shadow-md);
		border-color: var(--color-border-secondary);
	}
	.images-grid__link {
		display: block;
		width: 100%;
		height: 100%;
		text-decoration: none;
	}
	.images-grid__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.images-grid__delete {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		width: 2.25rem;
		height: 2.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: none;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.5);
		color: #fff;
		cursor: pointer;
		transition: background 0.2s, transform 0.15s;
		-webkit-tap-highlight-color: transparent;
	}
	.images-grid__delete:hover {
		background: var(--color-error);
	}
	.images-grid__delete:active {
		transform: scale(0.95);
	}
	/* Show delete on touch devices / small screens (no hover) */
	@media (max-width: 768px) {
		.images-grid__delete {
			background: rgba(0, 0, 0, 0.6);
			opacity: 1;
		}
	}
	@media (min-width: 769px) {
		.images-grid__delete {
			opacity: 0;
		}
		.images-grid__item:hover .images-grid__delete {
			opacity: 1;
		}
	}
	.images-grid__delete-icon {
		width: 1.125rem;
		height: 1.125rem;
	}
</style>
