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
		onkeydown?: (event: KeyboardEvent) => void;
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
		oninput,
		onkeydown
	}: Props = $props();

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
	<label for={id} class="input-label">
		{label}
		{#if required}
			<span class="input-required">*</span>
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
	class="input-field {error ? 'input-error' : ''}"
	oninput={handleInput}
	onchange={handleChange}
	{onkeydown}
/>

{#if error}
	<p class="input-error-text">{error}</p>
{/if}

<style>
	.input-label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin-bottom: 0.375rem;
	}

	.input-required {
		color: var(--color-error);
	}

	.input-field {
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
	}

	.input-field::placeholder {
		color: var(--color-text-tertiary);
	}

	.input-field:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px var(--color-accent-alpha);
	}

	.input-field:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.input-error {
		border-color: var(--color-error);
	}

	.input-error:focus {
		border-color: var(--color-error);
		box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.1);
	}

	.input-error-text {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-error);
	}
</style>
