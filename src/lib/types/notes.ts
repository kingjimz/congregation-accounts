export interface Note {
	id: string;
	title: string;
	content: string;
	createdAt: string;
	updatedAt: string;
}

export interface NoteFormData {
	title: string;
	content: string;
}

export interface CreateNoteData extends NoteFormData {
	createdAt?: string;
	updatedAt?: string;
}

export interface UpdateNoteData extends Partial<NoteFormData> {
	updatedAt?: string;
}