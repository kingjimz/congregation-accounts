import {
	collection,
	doc,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	orderBy,
	onSnapshot,
	type Unsubscribe
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import type { Note, CreateNoteData, UpdateNoteData } from '$lib/types/notes';

export class NoteService {
	private static COLLECTION_NAME = 'notes';

	/**
	 * Create a new note
	 */
	static async createNote(data: CreateNoteData): Promise<string> {
		const notesCollection = collection(db, this.COLLECTION_NAME);

		const noteData = {
			...data,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		const docRef = await addDoc(notesCollection, noteData);
		return docRef.id;
	}

	/**
	 * Update an existing note
	 */
	static async updateNote(noteId: string, data: UpdateNoteData): Promise<void> {
		const noteDoc = doc(db, this.COLLECTION_NAME, noteId);

		const updateData = {
			...data,
			updatedAt: new Date().toISOString()
		};

		await updateDoc(noteDoc, updateData);
	}

	/**
	 * Delete a note
	 */
	static async deleteNote(noteId: string): Promise<void> {
		const noteDoc = doc(db, this.COLLECTION_NAME, noteId);
		await deleteDoc(noteDoc);
	}

	/**
	 * Subscribe to all notes
	 */
	static subscribeToNotes(
		callback: (notes: Note[]) => void,
		errorCallback?: (error: Error) => void
	): Unsubscribe {
		const notesQuery = query(
			collection(db, this.COLLECTION_NAME),
			orderBy('updatedAt', 'desc')
		);

		return onSnapshot(
			notesQuery,
			(snapshot) => {
				const notes: Note[] = [];
				snapshot.forEach((doc) => {
					notes.push({
						id: doc.id,
						...doc.data()
					} as Note);
				});
				callback(notes);
			},
			(error) => {
				console.error('Error fetching notes:', error);
				errorCallback?.(error);
			}
		);
	}

	/**
	 * Search notes by title or content
	 */
	static searchNotes(notes: Note[], searchTerm: string): Note[] {
		const term = searchTerm.toLowerCase();
		return notes.filter(note =>
			note.title.toLowerCase().includes(term) ||
			note.content.toLowerCase().includes(term)
		);
	}

	/**
	 * Sort notes by different criteria
	 */
	static sortNotes(notes: Note[], sortBy: 'title' | 'createdAt' | 'updatedAt', order: 'asc' | 'desc' = 'asc'): Note[] {
		const sorted = [...notes].sort((a, b) => {
			let comparison = 0;

			switch (sortBy) {
				case 'title':
					comparison = a.title.localeCompare(b.title);
					break;
				case 'createdAt':
					comparison = a.createdAt.localeCompare(b.createdAt);
					break;
				case 'updatedAt':
					comparison = a.updatedAt.localeCompare(b.updatedAt);
					break;
			}

			return order === 'asc' ? comparison : -comparison;
		});

		return sorted;
	}
}