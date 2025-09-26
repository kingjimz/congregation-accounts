<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button, Input } from '$lib/components/ui';
	import type { NoteFormData } from '$lib/types/notes';

	interface Props {
		loading?: boolean;
		initialData?: Partial<NoteFormData>;
		onsubmit?: (data: NoteFormData) => void;
		oncancel?: () => void;
		submitLabel?: string;
	}

	let {
		loading = false,
		initialData = {},
		onsubmit,
		oncancel,
		submitLabel = 'Save Note'
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		submit: NoteFormData;
		cancel: void;
	}>();

	// Form state
	let formData: NoteFormData = $state({
		title: initialData.title || '',
		content: initialData.content || ''
	});

	let errors: Record<string, string> = $state({});

	function validateForm(): boolean {
		const newErrors: Record<string, string> = {};

		if (!formData.title.trim()) {
			newErrors.title = 'Title is required';
		} else if (formData.title.length > 100) {
			newErrors.title = 'Title must be less than 100 characters';
		}

		if (!formData.content.trim()) {
			newErrors.content = 'Content is required';
		} else if (formData.content.length > 5000) {
			newErrors.content = 'Content must be less than 5000 characters';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		// Clear errors and submit
		errors = {};
		onsubmit?.({
			title: formData.title.trim(),
			content: formData.content.trim()
		});
		dispatch('submit', {
			title: formData.title.trim(),
			content: formData.content.trim()
		});
	}

	function handleCancel() {
		oncancel?.();
		dispatch('cancel');
	}

	function clearFieldError(field: string) {
		if (errors[field]) {
			errors = { ...errors };
			delete errors[field];
		}
	}

	function updateTitle(value: string | number) {
		formData.title = String(value);
		clearFieldError('title');
	}

	function updateContent(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		formData.content = target.value;
		clearFieldError('content');
	}
</script>

<div class="space-y-4">
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
		<!-- Title -->
		<Input
			type="text"
			label="Title"
			value={formData.title}
			placeholder="Enter note title..."
			required
			disabled={loading}
			error={errors.title}
			oninput={updateTitle}
		/>

		<!-- Content -->
		<div>
			<label for="note-content" class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">
				Content <span style="color: var(--color-error);">*</span>
			</label>
			<textarea
				id="note-content"
				bind:value={formData.content}
				oninput={updateContent}
				placeholder="Enter note content..."
				rows="8"
				disabled={loading}
				class="block w-full rounded-lg border px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
				style="background: var(--color-bg-primary); border-color: {errors.content ? 'var(--color-error)' : 'var(--color-border-primary)'}; color: var(--color-text-primary);"
			></textarea>
			{#if errors.content}
				<p class="mt-1 text-sm" style="color: var(--color-error);">{errors.content}</p>
			{/if}
			<p class="mt-1 text-xs" style="color: var(--color-text-tertiary);">
				{formData.content.length} / 5000 characters
			</p>
		</div>

		<!-- Actions -->
		<div class="flex justify-end space-x-3 pt-4">
			<Button
				variant="secondary"
				onclick={handleCancel}
				disabled={loading}
			>
				Cancel
			</Button>
			<Button
				type="submit"
				variant="primary"
				loading={loading}
				disabled={loading || !formData.title.trim() || !formData.content.trim()}
			>
				{submitLabel}
			</Button>
		</div>
	</form>
</div>