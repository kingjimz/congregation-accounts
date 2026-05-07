<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		loading,
		error,
		filteredNotes,
		notes,
		searchTerm,
		sortBy,
		sortOrder,
		noteStore
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

	// Auto-select newly created note once subscription fires
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
		selectedNoteId = note.id;
		isEditing = false;
		isCreating = false;
		mobileShowDetail = true;
	}

	function handleNewNote() {
		selectedNoteId = null;
		isCreating = true;
		isEditing = false;
		editTitle = '';
		editContent = '';
		editErrors = {};
		mobileShowDetail = true;
	}

	function handleStartEdit() {
		if (!selectedNote) return;
		editTitle = selectedNote.title;
		editContent = selectedNote.content;
		editErrors = {};
		isEditing = true;
	}

	function handleCancelEdit() {
		if (isCreating) {
			isCreating = false;
			mobileShowDetail = false;
		} else {
			isEditing = false;
		}
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
				isCreating = false;
				pendingSelectFirst = true;
			} else if (isEditing && selectedNoteId) {
				await noteStore.updateNote(selectedNoteId, {
					title: editTitle.trim(),
					content: editContent.trim()
				});
				isEditing = false;
			}
		} catch (err) {
			console.error('Failed to save note:', err);
		} finally {
			submitting = false;
		}
	}

	function handleDeleteNote() {
		if (!selectedNoteId) return;
		deletingNoteId = selectedNoteId;
		showDeleteConfirmation = true;
	}

	async function confirmDelete() {
		if (!deletingNoteId) return;
		submitting = true;
		try {
			await noteStore.deleteNote(deletingNoteId);
			if (selectedNoteId === deletingNoteId) {
				selectedNoteId = null;
				mobileShowDetail = false;
			}
			showDeleteConfirmation = false;
			deletingNoteId = null;
		} catch (err) {
			console.error('Failed to delete note:', err);
		} finally {
			submitting = false;
		}
	}

	function cancelDelete() {
		showDeleteConfirmation = false;
		deletingNoteId = null;
	}

	function formatFullDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
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
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
			<span class="ml-3" style="color: var(--color-text-secondary);">Loading notes...</span>
		</div>
	{:else}
		<div class="notes-layout {mobileShowDetail ? 'show-detail' : 'show-list'}">

			<!-- SIDEBAR -->
			<div class="notes-sidebar" style="border-right: 1px solid var(--color-border-primary); background: var(--color-surface-primary);">
				<div class="sidebar-header" style="border-bottom: 1px solid var(--color-border-primary);">
					<div class="flex items-center justify-between mb-3">
						<h1 class="text-base font-bold" style="color: var(--color-text-primary);">Notes</h1>
						<button
							onclick={handleNewNote}
							class="new-note-btn"
							style="background: var(--color-primary); color: white;"
							title="New Note"
							aria-label="New Note"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
							</svg>
						</button>
					</div>
					<Input
						type="text"
						value={$searchTerm}
						placeholder="Search..."
						oninput={(v) => searchTerm.set(String(v))}
					/>
					<div class="flex gap-2 mt-2">
						<div class="flex-1">
							<Select
								value={$sortBy}
								options={sortOptions}
								onchange={(v) => sortBy.set(v as 'title' | 'createdAt' | 'updatedAt')}
							/>
						</div>
						<button
							onclick={() => sortOrder.update((o) => (o === 'asc' ? 'desc' : 'asc'))}
							class="sort-btn"
							style="border: 1px solid var(--color-border-primary); background: var(--color-bg-primary); color: var(--color-text-secondary);"
							title={$sortOrder === 'asc' ? 'Ascending' : 'Descending'}
						>
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

				<NoteList
					notes={$filteredNotes}
					selectedNoteId={selectedNoteId}
					onselect={handleSelectNote}
				/>
			</div>

			<!-- DETAIL PANEL -->
			<div class="notes-detail" style="background: var(--color-bg-primary);">
				<!-- Mobile back -->
				<button
					class="mobile-back"
					style="border-bottom: 1px solid var(--color-border-primary); color: var(--color-primary);"
					aria-label="Back to notes list"
					onclick={() => {
						mobileShowDetail = false;
						isCreating = false;
						isEditing = false;
					}}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					All Notes
				</button>

				<div class="detail-content">
					{#if isCreating || isEditing}
						<!-- Editor -->
						<div class="editor-toolbar" style="border-bottom: 1px solid var(--color-border-primary);">
							<Button
								variant="primary"
								onclick={handleSaveNote}
								loading={submitting}
								disabled={submitting || !editTitle.trim() || !editContent.trim()}
							>
								{isCreating ? 'Create' : 'Save'}
							</Button>
							<Button variant="secondary" onclick={handleCancelEdit} disabled={submitting}>
								Cancel
							</Button>
							<span class="ml-auto text-xs" style="color: var(--color-text-tertiary);">
								{editContent.length}/5000
							</span>
						</div>
						<div class="editor-body">
							<div class="mb-2">
								<input
									type="text"
									bind:value={editTitle}
									placeholder="Note title..."
									class="editor-title"
									style="color: var(--color-text-primary);"
									autofocus
								/>
								{#if editErrors.title}
									<p class="text-xs" style="color: var(--color-error);">{editErrors.title}</p>
								{/if}
							</div>
							<textarea
								bind:value={editContent}
								placeholder="Start writing..."
								class="editor-textarea"
								style="color: var(--color-text-secondary);"
							></textarea>
							{#if editErrors.content}
								<p class="text-xs mt-1" style="color: var(--color-error);">{editErrors.content}</p>
							{/if}
						</div>

					{:else if selectedNote}
						<!-- Viewer -->
						<div class="viewer-toolbar" style="border-bottom: 1px solid var(--color-border-primary);">
							<span class="text-xs" style="color: var(--color-text-tertiary);">
								Updated {formatFullDate(selectedNote.updatedAt)}
							</span>
							<div class="flex items-center gap-1">
								<button
									onclick={handleStartEdit}
									class="action-btn"
									style="color: var(--color-primary); background: var(--color-surface-primary);"
									title="Edit"
									aria-label="Edit note"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>
								<button
									onclick={handleDeleteNote}
									class="action-btn"
									style="color: var(--color-error); background: var(--color-surface-primary);"
									title="Delete"
									aria-label="Delete note"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						</div>
						<div class="viewer-body">
							<h2 class="viewer-title" style="color: var(--color-text-primary);">
								{selectedNote.title}
							</h2>
							<p class="viewer-content" style="color: var(--color-text-secondary);">
								{selectedNote.content}
							</p>
						</div>

					{:else}
						<!-- Empty state -->
						<div class="empty-state">
							<div class="empty-icon" style="background: var(--color-surface-primary);">
								<svg class="w-8 h-8" style="color: var(--color-text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
							</div>
							<h3 class="text-base font-semibold mb-1" style="color: var(--color-text-primary);">
								{$filteredNotes.length === 0 ? 'No Notes Yet' : 'Select a Note'}
							</h3>
							<p class="text-sm mb-4" style="color: var(--color-text-secondary);">
								{$filteredNotes.length === 0
									? 'Create your first note to get started.'
									: 'Choose a note from the list.'}
							</p>
							{#if $filteredNotes.length === 0}
								<Button variant="primary" onclick={handleNewNote}>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
									</svg>
									New Note
								</Button>
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
			<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
				<svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			</div>
			<p class="text-sm" style="color: var(--color-text-secondary);">
				Are you sure you want to delete this note? This action cannot be undone.
			</p>
			<div class="flex justify-center gap-3 pt-2">
				<Button variant="secondary" onclick={cancelDelete} disabled={submitting}>Cancel</Button>
				<Button
					variant="primary"
					onclick={confirmDelete}
					disabled={submitting}
					class="bg-red-600 hover:bg-red-700 text-white"
				>
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
		height: calc(100svh - 164px);
		overflow: hidden;
	}

	.notes-layout {
		flex: 1;
		display: grid;
		grid-template-columns: 280px 1fr;
		min-height: 0;
		overflow: hidden;
	}

	/* Sidebar */
	.notes-sidebar {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sidebar-header {
		padding: 1rem;
		flex-shrink: 0;
	}

	.new-note-btn {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		transition: opacity 0.15s;
	}

	.new-note-btn:hover {
		opacity: 0.8;
	}

	.sort-btn {
		padding: 0.375rem 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		transition: opacity 0.15s;
	}

	.sort-btn:hover {
		opacity: 0.7;
	}

	/* Detail panel */
	.notes-detail {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.mobile-back {
		display: none;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		flex-shrink: 0;
		width: 100%;
		text-align: left;
		transition: opacity 0.15s;
	}

	.mobile-back:hover {
		opacity: 0.7;
	}

	.detail-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 0;
	}

	/* Editor */
	.editor-toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		flex-shrink: 0;
	}

	.editor-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		min-height: 0;
	}

	.editor-title {
		width: 100%;
		font-size: 1.5rem;
		font-weight: 700;
		background: transparent;
		border: none;
		outline: none;
		padding: 0;
		margin-bottom: 0.5rem;
		font-family: inherit;
	}

	.editor-title::placeholder {
		color: var(--color-text-tertiary);
	}

	.editor-textarea {
		width: 100%;
		min-height: 300px;
		background: transparent;
		border: none;
		outline: none;
		resize: vertical;
		font-size: 0.9375rem;
		line-height: 1.75;
		font-family: inherit;
	}

	.editor-textarea::placeholder {
		color: var(--color-text-tertiary);
	}

	/* Viewer */
	.viewer-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		flex-shrink: 0;
	}

	.action-btn {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		transition: opacity 0.15s;
	}

	.action-btn:hover {
		opacity: 0.7;
	}

	.viewer-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		min-height: 0;
	}

	.viewer-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 1rem;
		line-height: 1.3;
	}

	.viewer-content {
		font-size: 0.9375rem;
		line-height: 1.75;
		white-space: pre-wrap;
	}

	/* Empty state */
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
		width: 4rem;
		height: 4rem;
		border-radius: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.notes-layout {
			grid-template-columns: 1fr;
		}

		.notes-layout.show-list .notes-detail {
			display: none;
		}

		.notes-layout.show-detail .notes-sidebar {
			display: none;
		}

		.mobile-back {
			display: flex;
		}
	}
</style>
