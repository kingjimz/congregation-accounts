<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		loading, error, filteredNotes, notes, searchTerm, sortBy, sortOrder, noteStore
	} from '$lib/stores/notes';
	import { Alert, Button, Modal, Input, Select } from '$lib/components/ui';
	import NoteList from '$lib/components/notes/NoteList.svelte';

	let selectedNoteId = $state<string | null>(null);
	const selectedNote = $derived($notes.find((n) => n.id === selectedNoteId) ?? null);

	let isEditing = $state(false);
	let isCreating = $state(false);
	let showDeleteConfirmation = $state(false);
	let submitting = $state(false);
	let deletingNoteId = $state<string | null>(null);
	let mobileShowDetail = $state(false);
	let pendingSelectFirst = $state(false);

	let editTitle = $state('');
	let editContent = $state('');
	let editErrors: Record<string, string> = $state({});

	onMount(() => {
		noteStore.loadNotes();
		return () => noteStore.cleanup();
	});

	const sortOptions = [
		{ value: 'updatedAt', label: 'Last Updated' },
		{ value: 'createdAt', label: 'Date Created' },
		{ value: 'title', label: 'Title' }
	];

	$effect(() => {
		const allNotes = $notes;
		if (pendingSelectFirst && allNotes.length > 0) {
			untrack(() => {
				selectedNoteId = allNotes[0].id;
				pendingSelectFirst = false;
				mobileShowDetail = true;
			});
		}
	});

	function handleSelectNote(note: { id: string }) {
		selectedNoteId = note.id; isEditing = false; isCreating = false; mobileShowDetail = true;
	}

	function handleNewNote() {
		selectedNoteId = null; isCreating = true; isEditing = false;
		editTitle = ''; editContent = ''; editErrors = {}; mobileShowDetail = true;
	}

	function handleStartEdit() {
		if (!selectedNote) return;
		editTitle = selectedNote.title; editContent = selectedNote.content; editErrors = {}; isEditing = true;
	}

	function handleCancelEdit() {
		if (isCreating) { isCreating = false; mobileShowDetail = false; }
		else { isEditing = false; }
		editErrors = {};
	}

	function validateForm(): boolean {
		const newErrors: Record<string, string> = {};
		if (!editTitle.trim()) newErrors.title = 'Title is required';
		else if (editTitle.length > 100) newErrors.title = 'Max 100 characters';
		if (!editContent.trim()) newErrors.content = 'Content is required';
		else if (editContent.length > 5000) newErrors.content = 'Max 5000 characters';
		editErrors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function handleSaveNote() {
		if (!validateForm()) return;
		submitting = true;
		try {
			if (isCreating) {
				await noteStore.addNote({ title: editTitle.trim(), content: editContent.trim() });
				isCreating = false; pendingSelectFirst = true;
			} else if (isEditing && selectedNoteId) {
				await noteStore.updateNote(selectedNoteId, { title: editTitle.trim(), content: editContent.trim() });
				isEditing = false;
			}
		} catch (err) { console.error('Failed to save note:', err); }
		finally { submitting = false; }
	}

	function handleDeleteNote() {
		if (!selectedNoteId) return;
		deletingNoteId = selectedNoteId; showDeleteConfirmation = true;
	}

	async function confirmDelete() {
		if (!deletingNoteId) return;
		submitting = true;
		try {
			await noteStore.deleteNote(deletingNoteId);
			if (selectedNoteId === deletingNoteId) { selectedNoteId = null; mobileShowDetail = false; }
			showDeleteConfirmation = false; deletingNoteId = null;
		} catch (err) { console.error('Failed to delete note:', err); }
		finally { submitting = false; }
	}

	function cancelDelete() { showDeleteConfirmation = false; deletingNoteId = null; }

	function formatFullDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Notes - Congregation Accounts</title>
</svelte:head>

<div class="notes-app">
	{#if $error}
		<div class="px-4 pt-3 flex-shrink-0">
			<Alert variant="error" message={$error} dismissible ondismiss={() => noteStore.clearError()} />
		</div>
	{/if}

	{#if $loading && $notes.length === 0}
		<div class="flex items-center justify-center flex-1">
			<div class="animate-spin rounded-full h-6 w-6 border-2 border-transparent" style="border-top-color: var(--color-accent);"></div>
			<span class="ml-3 text-sm" style="color: var(--color-text-secondary);">Loading notes...</span>
		</div>
	{:else}
		<div class="notes-layout {mobileShowDetail ? 'show-detail' : 'show-list'}">

			<!-- SIDEBAR -->
			<div class="notes-sidebar">
				<div class="sidebar-header">
					<div class="flex items-center justify-between mb-3">
						<h2 class="text-sm font-semibold" style="color: var(--color-text-primary);">All Notes</h2>
						<button onclick={handleNewNote} class="new-note-btn" title="New Note" aria-label="New Note">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
						</button>
					</div>
					<Input type="text" value={$searchTerm} placeholder="Search notes..." oninput={(v) => searchTerm.set(String(v))} />
					<div class="flex gap-2 mt-2">
						<div class="flex-1">
							<Select value={$sortBy} options={sortOptions} onchange={(v) => sortBy.set(v as 'title' | 'createdAt' | 'updatedAt')} />
						</div>
						<button onclick={() => sortOrder.update((o) => (o === 'asc' ? 'desc' : 'asc'))} class="sort-btn" title={$sortOrder === 'asc' ? 'Ascending' : 'Descending'}>
							{#if $sortOrder === 'asc'}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
								</svg>
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<NoteList notes={$filteredNotes} selectedNoteId={selectedNoteId} onselect={handleSelectNote} />
			</div>

			<!-- DETAIL PANEL -->
			<div class="notes-detail">
				<button class="mobile-back" aria-label="Back to notes list"
					onclick={() => { mobileShowDetail = false; isCreating = false; isEditing = false; }}>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					All Notes
				</button>

				<div class="detail-content">
					{#if isCreating || isEditing}
						<div class="editor-toolbar">
							<Button variant="primary" size="sm" onclick={handleSaveNote} loading={submitting} disabled={submitting || !editTitle.trim() || !editContent.trim()}>
								{isCreating ? 'Create' : 'Save'}
							</Button>
							<Button variant="secondary" size="sm" onclick={handleCancelEdit} disabled={submitting}>Cancel</Button>
							<span class="ml-auto text-xs" style="color: var(--color-text-tertiary);">{editContent.length}/5000</span>
						</div>
						<div class="editor-body">
							<div class="mb-2">
								<input type="text" bind:value={editTitle} placeholder="Note title..." class="editor-title" autofocus />
								{#if editErrors.title}
									<p class="text-xs" style="color: var(--color-error);">{editErrors.title}</p>
								{/if}
							</div>
							<textarea bind:value={editContent} placeholder="Start writing..." class="editor-textarea"></textarea>
							{#if editErrors.content}
								<p class="text-xs mt-1" style="color: var(--color-error);">{editErrors.content}</p>
							{/if}
						</div>

					{:else if selectedNote}
						<div class="viewer-toolbar">
							<span class="text-xs" style="color: var(--color-text-tertiary);">Updated {formatFullDate(selectedNote.updatedAt)}</span>
							<div class="flex items-center gap-1">
								<button onclick={handleStartEdit} class="toolbar-btn" title="Edit" aria-label="Edit note">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
									</svg>
								</button>
								<button onclick={handleDeleteNote} class="toolbar-btn toolbar-btn-danger" title="Delete" aria-label="Delete note">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
									</svg>
								</button>
							</div>
						</div>
						<div class="viewer-body">
							<h2 class="viewer-title">{selectedNote.title}</h2>
							<p class="viewer-content">{selectedNote.content}</p>
						</div>

					{:else}
						<div class="empty-state">
							<div class="empty-icon">
								<svg class="w-8 h-8" style="color: var(--color-text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
								</svg>
							</div>
							<h3 class="text-sm font-semibold mb-1" style="color: var(--color-text-primary);">
								{$filteredNotes.length === 0 ? 'No Notes Yet' : 'Select a Note'}
							</h3>
							<p class="text-xs mb-4" style="color: var(--color-text-secondary);">
								{$filteredNotes.length === 0 ? 'Create your first note to get started.' : 'Choose a note from the list.'}
							</p>
							{#if $filteredNotes.length === 0}
								<Button variant="primary" size="sm" onclick={handleNewNote}>New Note</Button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Delete Modal -->
	<Modal open={showDeleteConfirmation} title="Delete Note" size="sm" onclose={cancelDelete}>
		<div class="text-center py-4 space-y-4">
			<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full" style="background: var(--color-error-bg);">
				<svg class="h-5 w-5" style="color: var(--color-error);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			</div>
			<p class="text-sm" style="color: var(--color-text-secondary);">
				Are you sure you want to delete this note? This action cannot be undone.
			</p>
			<div class="flex justify-center gap-2 pt-2">
				<Button variant="secondary" onclick={cancelDelete} disabled={submitting}>Cancel</Button>
				<Button variant="danger" onclick={confirmDelete} disabled={submitting}>
					{submitting ? 'Deleting...' : 'Delete'}
				</Button>
			</div>
		</div>
	</Modal>
</div>

<style>
	.notes-app {
		display: flex;
		flex-direction: column;
		height: calc(100svh - 56px);
		overflow: hidden;
	}

	.notes-layout {
		flex: 1;
		display: grid;
		grid-template-columns: 280px 1fr;
		min-height: 0;
		overflow: hidden;
	}

	.notes-sidebar {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-right: 1px solid var(--color-border-primary);
		background: var(--color-surface-primary);
	}

	.sidebar-header {
		padding: 1rem;
		flex-shrink: 0;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.new-note-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		border: none;
		background: var(--color-accent);
		color: #ffffff;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.new-note-btn:hover { opacity: 0.85; }

	.sort-btn {
		padding: 0.375rem 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.sort-btn:hover { background: var(--color-surface-hover); }

	.notes-detail {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--color-bg-primary);
	}

	.mobile-back {
		display: none;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		flex-shrink: 0;
		width: 100%;
		text-align: left;
		color: var(--color-accent);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-border-primary);
		cursor: pointer;
		transition: background 0.15s;
	}

	.mobile-back:hover { background: var(--color-surface-hover); }

	.detail-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 0;
	}

	.editor-toolbar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		flex-shrink: 0;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.editor-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
		min-height: 0;
	}

	.editor-title {
		width: 100%;
		font-size: 1.25rem;
		font-weight: 700;
		background: transparent;
		border: none;
		outline: none;
		padding: 0;
		margin-bottom: 0.5rem;
		font-family: inherit;
		color: var(--color-text-primary);
	}

	.editor-title::placeholder { color: var(--color-text-tertiary); }

	.editor-textarea {
		width: 100%;
		min-height: 300px;
		background: transparent;
		border: none;
		outline: none;
		resize: vertical;
		font-size: 0.875rem;
		line-height: 1.75;
		font-family: inherit;
		color: var(--color-text-secondary);
	}

	.editor-textarea::placeholder { color: var(--color-text-tertiary); }

	.viewer-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.625rem 1.25rem;
		flex-shrink: 0;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.toolbar-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.toolbar-btn:hover { background: var(--color-surface-hover); color: var(--color-accent); }
	.toolbar-btn-danger:hover { color: var(--color-error); background: var(--color-error-bg); }

	.viewer-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
		min-height: 0;
	}

	.viewer-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 0.75rem;
		line-height: 1.3;
		color: var(--color-text-primary);
	}

	.viewer-content {
		font-size: 0.875rem;
		line-height: 1.75;
		white-space: pre-wrap;
		color: var(--color-text-secondary);
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
	}

	.empty-icon {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.75rem;
		background: var(--color-bg-tertiary);
	}

	@media (max-width: 768px) {
		.notes-app {
			height: calc(100svh - 56px - 52px);
		}

		.notes-layout {
			grid-template-columns: 1fr;
		}

		.notes-layout.show-list .notes-detail { display: none; }
		.notes-layout.show-detail .notes-sidebar { display: none; }
		.mobile-back { display: flex; }
	}
</style>
