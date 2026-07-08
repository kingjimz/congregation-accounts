<script lang="ts">
	import { Card, Alert, Button, LoadingSpinner } from '$lib/components/ui';
	import {
		monthlyImages,
		monthlyImagesLoading,
		monthlyImagesError,
		monthlyImagesStore,
		type MonthlyImagesSource
	} from '$lib/stores/monthly-images';
	import { user } from '$lib/stores/auth';
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
			formData.set('userId', $user?.uid ?? '');
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

	/** Track which images have been revealed (by publicId). All hidden by default. */
	let revealedImages = $state<Set<string>>(new Set());

	function toggleReveal(publicId: string) {
		const next = new Set(revealedImages);
		if (next.has(publicId)) {
			next.delete(publicId);
		} else {
			next.add(publicId);
		}
		revealedImages = next;
	}

	function showAll() {
		revealedImages = new Set($monthlyImages.map((img) => img.publicId));
	}

	function hideAll() {
		revealedImages = new Set();
	}

	let allRevealed = $derived(
		$monthlyImages.length > 0 && revealedImages.size === $monthlyImages.length
	);

	$effect(() => {
		selectedMonth;
		revealedImages = new Set();
	});

	/** Cloudinary thumbnail URL: smaller size + auto format/quality to save bandwidth (free tier). */
	function thumbnailUrl(url: string): string {
		if (!url || !url.includes('cloudinary.com')) return url;
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
				Set these in Netlify: <strong>Site settings &rarr; Environment variables</strong>. For each variable, set <strong>Scope to "All"</strong> (or at least include <strong>Functions</strong>) so they are available at runtime.
			</p>
			<ul class="text-sm font-mono space-y-1 mb-3 pl-4" style="color: var(--color-text-secondary);">
				<li>CLOUDINARY_CLOUD_NAME</li>
				<li>CLOUDINARY_API_KEY</li>
				<li>CLOUDINARY_API_SECRET</li>
			</ul>
			<p class="text-xs mb-2" style="color: var(--color-text-tertiary);">
				Get values from your <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer" class="underline">Cloudinary dashboard</a>. Then <strong>trigger a new deploy</strong>.
			</p>
			<p class="text-xs" style="color: var(--color-text-tertiary);">
				<a href="/api/cloudinary/status?debug=1" target="_blank" rel="noopener noreferrer" class="underline">Check which vars are set in production (debug)</a>
			</p>
		</div>
	{:else}
		<div class="flex flex-col gap-4">
			<!-- Upload zone -->
			{#if cloudinaryConfigured === true}
				<label
					for="monthly-images-file-input-{source}"
					class="relative flex items-center justify-center gap-3 rounded-xl border-2 border-dashed
						   cursor-pointer transition-all duration-200 py-6 px-4"
					style="border-color: {isDragging ? 'var(--color-accent)' : 'var(--color-border-secondary)'};
						   background: {isDragging ? 'var(--color-accent-alpha)' : 'var(--color-surface-primary)'};
						   {isDragging ? 'box-shadow: 0 0 0 3px var(--color-accent-alpha);' : ''}"
					class:cursor-wait={uploading}
					class:pointer-events-none={uploading}
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
						class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
						aria-label="Choose image to upload"
						disabled={uploading}
					/>
					{#if uploading}
						<LoadingSpinner size="sm" centered={false} />
						<div class="flex flex-col pointer-events-none">
							<span class="text-sm font-semibold" style="color: var(--color-text-primary);">Uploading...</span>
							<span class="text-xs" style="color: var(--color-text-tertiary);">Please wait</span>
						</div>
					{:else}
						<div class="pointer-events-none" style="color: {isDragging ? 'var(--color-accent)' : 'var(--color-text-tertiary)'};">
							<svg class="w-8 h-8 transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
								<polyline points="17 8 12 3 7 8" />
								<line x1="12" y1="3" x2="12" y2="15" />
							</svg>
						</div>
						<div class="flex flex-col pointer-events-none">
							<span class="text-sm font-semibold" style="color: var(--color-text-primary);">Choose file or drag and drop</span>
							<span class="text-xs" style="color: var(--color-text-tertiary);">JPG, PNG, WebP</span>
						</div>
					{/if}
				</label>
			{/if}

			{#if uploadError}
				<p class="text-sm m-0" style="color: var(--color-error);">{uploadError}</p>
			{/if}

			{#if $monthlyImagesError}
				<Alert
					variant="error"
					message={$monthlyImagesError}
					dismissible
					ondismiss={() => monthlyImagesStore.clearError()}
				/>
				{#if $monthlyImagesError.toLowerCase().includes('permission') || $monthlyImagesError.toLowerCase().includes('insufficient')}
					<p class="text-xs m-0" style="color: var(--color-text-secondary);">
						Make sure you're signed in and that Firestore rules are deployed (including <code class="text-[0.7em] px-1.5 py-0.5 rounded" style="background: var(--color-surface-secondary); color: var(--color-text-primary);">monthly_images</code>). Run <code class="text-[0.7em] px-1.5 py-0.5 rounded" style="background: var(--color-surface-secondary); color: var(--color-text-primary);">firebase deploy --only firestore:rules</code> if needed.
					</p>
				{/if}
			{/if}

			{#if $monthlyImagesLoading}
				<div class="py-10">
					<LoadingSpinner message="Loading images..." />
				</div>
			{:else if $monthlyImages.length === 0}
				<div class="flex flex-col items-center justify-center gap-2 py-10 text-center">
					<svg class="w-10 h-10" style="color: var(--color-text-tertiary);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
						<circle cx="8.5" cy="8.5" r="1.5" />
						<polyline points="21 15 16 10 5 21" />
					</svg>
					<p class="text-sm font-medium m-0" style="color: var(--color-text-primary);">No images for this month yet.</p>
					{#if cloudinaryConfigured === true}
						<p class="text-xs m-0" style="color: var(--color-text-tertiary);">Use the upload area above to add receipts or photos.</p>
					{/if}
				</div>
			{:else}
				<!-- Toolbar -->
				<div class="flex justify-end">
					<Button variant="ghost" size="sm" onclick={() => allRevealed ? hideAll() : showAll()}>
						{#if allRevealed}
							<svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
								<path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
								<line x1="1" y1="1" x2="23" y2="23" />
							</svg>
							Hide All
						{:else}
							<svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
							Show All
						{/if}
					</Button>
				</div>

				<!-- Image grid -->
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" role="list">
					{#each $monthlyImages as img (img.publicId)}
						{@const revealed = revealedImages.has(img.publicId)}
						<article
							class="group relative aspect-square rounded-lg overflow-hidden border transition-shadow duration-200 hover:shadow-md"
							style="background: var(--color-bg-primary); border-color: var(--color-border-primary); box-shadow: var(--shadow-sm);"
							role="listitem"
						>
							<a
								href={revealed ? img.url : undefined}
								target={revealed ? '_blank' : undefined}
								rel={revealed ? 'noopener noreferrer' : undefined}
								class="block w-full h-full"
								onclick={(e) => { if (!revealed) e.preventDefault(); }}
							>
								<img
									src={thumbnailUrl(img.url)}
									alt={img.caption ?? 'Uploaded image'}
									class="w-full h-full object-cover block"
									class:img-hidden={!revealed}
									loading="lazy"
									decoding="async"
								/>
							</a>

							{#if !revealed}
								<!-- Privacy overlay -->
								<button
									type="button"
									class="absolute inset-0 flex flex-col items-center justify-center gap-1 border-0 cursor-pointer transition-colors duration-200"
									style="background: color-mix(in srgb, var(--color-bg-secondary) 70%, transparent); -webkit-tap-highlight-color: transparent;"
									onclick={() => toggleReveal(img.publicId)}
									aria-label="Reveal receipt"
								>
									<svg class="w-6 h-6" style="color: var(--color-text-tertiary);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
										<circle cx="12" cy="12" r="3" />
									</svg>
									<span class="text-xs font-medium" style="color: var(--color-text-tertiary);">Tap to view</span>
								</button>
							{:else}
								<!-- Hide button -->
								<button
									type="button"
									class="absolute top-2 left-2 w-8 h-8 flex items-center justify-center rounded-lg border-0
										   opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 cursor-pointer
										   hover:bg-black/70 active:scale-95"
									style="background: rgba(0,0,0,0.5); color: #fff; -webkit-tap-highlight-color: transparent;"
									onclick={() => toggleReveal(img.publicId)}
									title="Hide receipt"
									aria-label="Hide receipt"
								>
									<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
										<line x1="1" y1="1" x2="23" y2="23" />
									</svg>
								</button>
							{/if}

							<!-- Delete button -->
							<button
								type="button"
								class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg border-0
									   opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 cursor-pointer
									   active:scale-95"
								style="background: rgba(0,0,0,0.5); color: #fff; -webkit-tap-highlight-color: transparent;"
								onmouseenter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-error)'; }}
								onmouseleave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.5)'; }}
								onclick={(e) => { e.preventDefault(); handleDelete(img); }}
								title="Delete image"
								aria-label="Delete image"
							>
								<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
	.img-hidden {
		filter: blur(18px) saturate(0.3);
		transform: scale(1.15);
	}
</style>
