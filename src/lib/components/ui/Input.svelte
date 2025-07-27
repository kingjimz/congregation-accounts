<script lang="ts">
	interface Props {
		type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'month';
		value?: string | number;
		placeholder?: string;
		label?: string;
		id?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		min?: number;
		max?: number;
		step?: number;
		onchange?: (value: string | number) => void;
		oninput?: (value: string | number) => void;
	}

	let { 
		type = 'text',
		value = '',
		placeholder = '',
		label = '',
		id = '',
		required = false,
		disabled = false,
		error = '',
		min,
		max,
		step,
		onchange,
		oninput
	}: Props = $props();

	const baseClasses = 'block w-full rounded-lg border px-3 py-2 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed sm:text-sm';
	const errorClasses = 'border-red-300 focus:border-red-500 focus:ring-red-500';
	const normalClasses = 'focus:border-indigo-500 focus:ring-indigo-500';
	
	const inputClasses = $derived(`${baseClasses} ${error ? errorClasses : normalClasses}`);

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const newValue = type === 'number' ? Number(target.value) : target.value;
		value = newValue;
		oninput?.(newValue);
	}

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const newValue = type === 'number' ? Number(target.value) : target.value;
		onchange?.(newValue);
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

<input
	{id}
	{type}
	{placeholder}
	{required}
	{disabled}
	{min}
	{max}
	{step}
	bind:value
	class={inputClasses}
	style="background: var(--color-bg-primary); border-color: var(--color-border-primary); color: var(--color-text-primary);"
	oninput={handleInput}
	onchange={handleChange}
/>

{#if error}
	<p class="mt-1 text-sm" style="color: var(--color-error);">{error}</p>
{/if}
