<script lang="ts">
	import { onMount } from 'svelte';
	import { loading, error, filteredNotes, searchTerm, sortBy, sortOrder, noteStore } from '$lib/stores/notes';
	import { Alert, Button, Modal, Input, Select } from '$lib/components/ui';
	import NoteForm from '$lib/components/forms/NoteForm.svelte';
	import NoteList from '$lib/components/notes/NoteList.svelte';
	import type { Note, NoteFormData } from '$lib/types/notes';

	// UI state
	let showNoteForm = $state(false);
	let showEditNoteForm = $state(false);
	let showDeleteConfirmation = $state(false);
	let submitting = $state(false);
	let editingNote = $state<Note | null>(null);
	let deletingNoteId = $state<string | null>(null);

	// Load notes on mount
	onMount(() => {
		noteStore.loadNotes();

		// Cleanup on unmount
		return () => {
			noteStore.cleanup();
		};
	});

	// Sort options for the select component
	const sortOptions = [
		{ value: 'updatedAt', label: 'Last Updated' },
		{ value: 'createdAt', label: 'Date Created' },
		{ value: 'title', label: 'Title' }
	];

	// Event handlers
	async function handleNoteSubmit(data: NoteFormData) {
		submitting = true;
		try {
			await noteStore.addNote(data);
			showNoteForm = false;
		} catch (err) {
			console.error('Failed to add note:', err);
		} finally {
			submitting = false;
		}
	}

	function handleDeleteNote(event: { id: string }) {
		deletingNoteId = event.id;
		showDeleteConfirmation = true;
	}

	async function confirmDelete() {
		if (!deletingNoteId) return;

		submitting = true;
		try {
			await noteStore.deleteNote(deletingNoteId);
			showDeleteConfirmation = false;
			deletingNoteId = null;
		} catch (err) {
			console.error('Failed to delete note:', err);
			alert('Failed to delete note. Please try again.');
		} finally {
			submitting = false;
		}
	}

	function cancelDelete() {
		showDeleteConfirmation = false;
		deletingNoteId = null;
	}

	function handleEditNote(event: { note: Note }) {
		editingNote = event.note;
		showEditNoteForm = true;
	}

	async function handleUpdateNote(data: NoteFormData) {
		if (!editingNote?.id) return;

		submitting = true;
		try {
			await noteStore.updateNote(editingNote.id, data);
			showEditNoteForm = false;
			editingNote = null;
		} catch (err) {
			console.error('Failed to update note:', err);
			alert('Failed to update note. Please try again.');
		} finally {
			submitting = false;
		}
	}

	function handleDismissError() {
		noteStore.clearError();
	}

	function handleSearchInput(value: string | number) {
		searchTerm.set(String(value));
	}

	function handleSortChange(value: string) {
		sortBy.set(value as 'title' | 'createdAt' | 'updatedAt');
	}

	function toggleSortOrder() {
		sortOrder.update(order => order === 'asc' ? 'desc' : 'asc');
	}

</script>

<svelte:head>
	<title>Notes - Congregation Accounts</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8" style="background: var(--color-bg-secondary); min-height: 100vh;">
	<!-- Error Alert -->
	{#if $error}
		<Alert
			variant="error"
			message={$error}
			dismissible
			ondismiss={handleDismissError}
		/>
	{/if}

	<!-- Loading State -->
	{#if $loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
			<span class="ml-3" style="color: var(--color-text-secondary);">Loading notes...</span>
		</div>
	{:else}
		<!-- Header with Actions -->
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold" style="color: var(--color-text-primary);">Notes</h1>
				<p style="color: var(--color-text-secondary);">Create and manage your congregation notes</p>
			</div>
			<div>
				<Button
					variant="primary"
					onclick={() => showNoteForm = true}
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					New Note
				</Button>
			</div>
		</div>

		<!-- Search and Sort Controls -->
		<div class="flex flex-col sm:flex-row gap-4 p-4 rounded-lg" style="background: var(--color-surface-primary); border: 1px solid var(--color-border-primary);">
			<div class="flex-1">
				<Input
					type="text"
					value={$searchTerm}
					placeholder="Search notes by title or content..."
					oninput={handleSearchInput}
				/>
			</div>
			<div class="flex gap-2">
				<div class="min-w-[150px]">
					<Select
						value={$sortBy}
						options={sortOptions}
						onchange={handleSortChange}
					/>
				</div>
				<Button
					variant="secondary"
					onclick={toggleSortOrder}
					title={$sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
				>
					{#if $sortOrder === 'asc'}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
						</svg>
					{:else}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
						</svg>
					{/if}
				</Button>
			</div>
		</div>

		<!-- Notes List -->
		<NoteList
			notes={$filteredNotes}
			title={$searchTerm ? `Search Results (${$filteredNotes.length})` : `All Notes (${$filteredNotes.length})`}
			showActions={true}
			ondelete={handleDeleteNote}
			onedit={handleEditNote}
		/>
	{/if}

	<!-- Add Note Form Modal -->
	<Modal
		open={showNoteForm}
		title="Create New Note"
		size="md"
		onclose={() => showNoteForm = false}
	>
		<NoteForm
			loading={submitting}
			onsubmit={handleNoteSubmit}
			oncancel={() => showNoteForm = false}
			submitLabel="Create Note"
		/>
	</Modal>

	<!-- Edit Note Form Modal -->
	<Modal
		open={showEditNoteForm}
		title="Edit Note"
		size="md"
		onclose={() => {
			showEditNoteForm = false;
			editingNote = null;
		}}
	>
		{#if editingNote}
			<NoteForm
				loading={submitting}
				initialData={{
					title: editingNote.title,
					content: editingNote.content
				}}
				onsubmit={handleUpdateNote}
				oncancel={() => {
					showEditNoteForm = false;
					editingNote = null;
				}}
				submitLabel="Update Note"
			/>
		{/if}
	</Modal>

	<!-- Delete Confirmation Modal -->
	<Modal
		open={showDeleteConfirmation}
		title="Delete Note"
		size="sm"
		onclose={cancelDelete}
	>
		<div class="space-y-4">
			<div class="text-center py-4">
				<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
					<svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold mb-2" style="color: var(--color-text-primary);">
					Confirm Delete
				</h3>
				<p class="text-sm" style="color: var(--color-text-secondary);">
					Are you sure you want to delete this note? This action cannot be undone.
				</p>
			</div>

			<div class="flex justify-center gap-3 pt-2">
				<Button
					variant="secondary"
					onclick={cancelDelete}
					disabled={submitting}
				>
					Cancel
				</Button>
				<Button
					variant="primary"
					onclick={confirmDelete}
					disabled={submitting}
					class="bg-red-600 hover:bg-red-700 text-white"
				>
					{submitting ? 'Deleting...' : 'Delete Note'}
				</Button>
			</div>
		</div>
	</Modal>
</div>