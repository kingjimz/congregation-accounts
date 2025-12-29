<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Card } from '$lib/components/ui';
	import type { Note } from '$lib/types/notes';

	interface Props {
		notes: Note[];
		title?: string;
		showActions?: boolean;
		ondelete?: (event: { id: string }) => void;
		onedit?: (event: { note: Note }) => void;
	}

	let {
		notes = [],
		title = 'Notes',
		showActions = false,
		ondelete,
		onedit
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		delete: { id: string };
		edit: { note: Note };
	}>();

	function handleDelete(id: string) {
		ondelete?.({ id });
		dispatch('delete', { id });
	}

	function handleEdit(note: Note) {
		onedit?.({ note });
		dispatch('edit', { note });
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - date.getTime());
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
			if (diffHours === 0) {
				const diffMinutes = Math.floor(diffTime / (1000 * 60));
				return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
			}
			return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
			});
		}
	}

	function truncateContent(content: string, maxLength: number = 150): string {
		if (content.length <= maxLength) return content;
		return content.substring(0, maxLength).trim() + '...';
	}
</script>

<Card {title}>
	{#if notes.length === 0}
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 mb-4" style="color: var(--color-text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			<h3 class="text-lg font-medium mb-2" style="color: var(--color-text-primary);">No Notes Found</h3>
			<p class="text-sm" style="color: var(--color-text-secondary);">
				Create your first note to get started
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each notes as note}
				<div
					class="p-4 rounded-lg border transition-all duration-200 hover:shadow-md"
					style="background: var(--color-surface-primary); border-color: var(--color-border-primary);"
				>
					<div class="flex justify-between items-start gap-4">
						<div class="flex-1 min-w-0">
							<h3 class="text-lg font-semibold mb-2 truncate" style="color: var(--color-text-primary);">
								{note.title}
							</h3>
							<p class="text-sm mb-3 whitespace-pre-wrap" style="color: var(--color-text-secondary);">
								{truncateContent(note.content)}
							</p>
							<div class="flex items-center gap-4 text-xs" style="color: var(--color-text-tertiary);">
								<span>Updated {formatDate(note.updatedAt)}</span>
								{#if note.createdAt !== note.updatedAt}
									<span>•</span>
									<span>Created {formatDate(note.createdAt)}</span>
								{/if}
							</div>
						</div>

						{#if showActions}
							<div class="flex items-center gap-2 flex-shrink-0">
								<button
									onclick={() => handleEdit(note)}
									class="p-2 rounded-lg hover:bg-indigo-50 transition-colors"
									style="color: var(--color-primary);"
									aria-label="Edit note"
									title="Edit note"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>
								<button
									onclick={() => handleDelete(note.id)}
									class="p-2 rounded-lg hover:bg-red-50 transition-colors"
									style="color: var(--color-error);"
									aria-label="Delete note"
									title="Delete note"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Card>