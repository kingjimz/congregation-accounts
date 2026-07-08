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

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
		onchange?.(target.value);
	}
</script>

{#if label}
	<label for={id} class="select-label">
		{label}
		{#if required}
			<span class="select-required">*</span>
		{/if}
	</label>
{/if}

<select
	{id}
	{required}
	{disabled}
	bind:value
	class="select-field {error ? 'select-error' : ''}"
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
	<p class="select-error-text">{error}</p>
{/if}

<style>
	.select-label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin-bottom: 0.375rem;
	}

	.select-required {
		color: var(--color-error);
	}

	.select-field {
		display: block;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text-primary);
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: 0.375rem;
		transition: border-color 0.15s, box-shadow 0.15s;
		cursor: pointer;
	}

	.select-field:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px var(--color-accent-alpha);
	}

	.select-field:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.select-error {
		border-color: var(--color-error);
	}

	.select-error-text {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-error);
	}
</style>
