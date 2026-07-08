<script lang="ts">
	import type { Note } from '$lib/types/notes';

	interface Props {
		notes: Note[];
		selectedNoteId?: string | null;
		onselect?: (note: Note) => void;
	}

	let { notes = [], selectedNoteId = null, onselect }: Props = $props();

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'now';
		if (diffMins < 60) return `${diffMins}m`;
		if (diffHours < 24) return `${diffHours}h`;
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function preview(content: string): string {
		const flat = content.replace(/\n+/g, ' ').trim();
		return flat.length > 80 ? flat.slice(0, 80) + '…' : flat;
	}
</script>

<div class="note-list">
	{#if notes.length === 0}
		<p class="empty-msg" style="color: var(--color-text-tertiary);">No notes found</p>
	{:else}
		{#each notes as note}
			{@const active = note.id === selectedNoteId}
			<button
				class="note-item"
				style="
					background: {active ? 'var(--color-accent)' : 'transparent'};
					border-bottom: 1px solid var(--color-border-primary);
				"
				onclick={() => onselect?.(note)}
			>
				<div class="note-item-top">
					<span class="note-title" style="color: {active ? 'white' : 'var(--color-text-primary)'};">
						{note.title}
					</span>
					<span class="note-date" style="color: {active ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary)'};">
						{formatDate(note.updatedAt)}
					</span>
				</div>
				<p class="note-preview" style="color: {active ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)'};">
					{preview(note.content)}
				</p>
			</button>
		{/each}
	{/if}
</div>

<style>
	.note-list {
		flex: 1;
		overflow-y: auto;
		min-height: 0;
	}

	.empty-msg {
		text-align: center;
		padding: 2rem 1rem;
		font-size: 0.875rem;
	}

	.note-item {
		width: 100%;
		text-align: left;
		padding: 0.75rem 1rem;
		cursor: pointer;
		transition: background 0.1s;
	}

	.note-item:hover {
		filter: brightness(0.96);
	}

	.note-item-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.2rem;
	}

	.note-title {
		font-size: 0.875rem;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.note-date {
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.note-preview {
		font-size: 0.75rem;
		line-height: 1.4;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
