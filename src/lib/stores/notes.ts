import { writable, derived, get } from 'svelte/store';
import { NoteService } from '$lib/services/NoteService';
import { user } from '$lib/stores/auth';
import type { Note, NoteFormData } from '$lib/types/notes';
import type { Unsubscribe } from 'firebase/firestore';

// Store state
export const notes = writable<Note[]>([]);
export const loading = writable(false);
export const error = writable<string | null>(null);

// Search and filter state
export const searchTerm = writable('');
export const sortBy = writable<'title' | 'createdAt' | 'updatedAt'>('updatedAt');
export const sortOrder = writable<'asc' | 'desc'>('desc');

// Derived stores
export const filteredNotes = derived(
	[notes, searchTerm, sortBy, sortOrder],
	([$notes, $searchTerm, $sortBy, $sortOrder]) => {
		let filtered = $notes;

		// Apply search filter
		if ($searchTerm) {
			filtered = NoteService.searchNotes(filtered, $searchTerm);
		}

		// Apply sorting
		filtered = NoteService.sortNotes(filtered, $sortBy, $sortOrder);

		return filtered;
	}
);

// Store for managing subscriptions
let notesUnsubscribe: Unsubscribe | null = null;

// Note store actions
export const noteStore = {
	/**
	 * Load all notes
	 */
	async loadNotes() {
		const currentUser = get(user);

		if (!currentUser) {
			error.set('User not authenticated');
			return;
		}

		loading.set(true);
		error.set(null);

		try {
			// Unsubscribe from previous listener if exists
			if (notesUnsubscribe) {
				notesUnsubscribe();
			}

			// Subscribe to notes
			notesUnsubscribe = NoteService.subscribeToNotes(
				(fetchedNotes) => {
					notes.set(fetchedNotes);
					loading.set(false);
				},
				(err) => {
					error.set(`Failed to load notes: ${err.message}`);
					loading.set(false);
				}
			);
		} catch (err) {
			error.set(`Failed to load notes: ${err instanceof Error ? err.message : 'Unknown error'}`);
			loading.set(false);
		}
	},

	/**
	 * Add a new note
	 */
	async addNote(data: NoteFormData) {
		const currentUser = get(user);

		if (!currentUser) {
			throw new Error('User not authenticated');
		}

		loading.set(true);
		error.set(null);

		try {
			await NoteService.createNote(data);

			// Notes will be updated via the subscription
			loading.set(false);
		} catch (err) {
			const errorMessage = `Failed to add note: ${err instanceof Error ? err.message : 'Unknown error'}`;
			error.set(errorMessage);
			loading.set(false);
			throw new Error(errorMessage);
		}
	},

	/**
	 * Update an existing note
	 */
	async updateNote(noteId: string, data: Partial<NoteFormData>) {
		loading.set(true);
		error.set(null);

		try {
			await NoteService.updateNote(noteId, data);
			// Notes will be updated via the subscription
			loading.set(false);
		} catch (err) {
			const errorMessage = `Failed to update note: ${err instanceof Error ? err.message : 'Unknown error'}`;
			error.set(errorMessage);
			loading.set(false);
			throw new Error(errorMessage);
		}
	},

	/**
	 * Delete a note
	 */
	async deleteNote(noteId: string) {
		loading.set(true);
		error.set(null);

		try {
			await NoteService.deleteNote(noteId);
			// Notes will be updated via the subscription
			loading.set(false);
		} catch (err) {
			const errorMessage = `Failed to delete note: ${err instanceof Error ? err.message : 'Unknown error'}`;
			error.set(errorMessage);
			loading.set(false);
			throw new Error(errorMessage);
		}
	},

	/**
	 * Clear error message
	 */
	clearError() {
		error.set(null);
	},

	/**
	 * Cleanup subscription
	 */
	cleanup() {
		if (notesUnsubscribe) {
			notesUnsubscribe();
			notesUnsubscribe = null;
		}
		notes.set([]);
		error.set(null);
		loading.set(false);
	}
};