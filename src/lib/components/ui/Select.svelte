<script lang="ts">
	interface Option {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		value?: string;
		options: Option[];
		placeholder?: string;
		label?: string;
		id?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		onchange?: (value: string) => void;
	}

	let { 
		value = '',
		options = [],
		placeholder = 'Select an option...',
		label = '',
		id = '',
		required = false,
		disabled = false,
		error = '',
		onchange
	}: Props = $props();

	const baseClasses = 'block w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed sm:text-sm';
	const errorClasses = 'border-red-300 focus:border-red-500 focus:ring-red-500';
	const normalClasses = 'focus:border-indigo-500 focus:ring-indigo-500';
	
	const selectClasses = $derived(`${baseClasses} ${error ? errorClasses : normalClasses}`);

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
		onchange?.(target.value);
	}
</script>

{#if label}
	<label for={id} class="block text-sm font-medium mb-1" style="color: var(--color-text-secondary);">
		{label}
		{#if required}
			<span style="color: var(--color-error);">*</span>
		{/if}
	</label>
{/if}

<select
	{id}
	{required}
	{disabled}
	bind:value
	class={selectClasses}
	style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);"
	onchange={handleChange}
>
	{#if placeholder}
		<option value="" disabled>{placeholder}</option>
	{/if}
	{#each options as option}
		<option value={option.value} disabled={option.disabled}>
			{option.label}
		</option>
	{/each}
</select>

{#if error}
	<p class="mt-1 text-sm" style="color: var(--color-error);">{error}</p>
{/if}
