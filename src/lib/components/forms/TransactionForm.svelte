<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button, Input, Select } from '$lib/components/ui';
	import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '$lib/constants';
	import { validateTransaction, getTodayLocalDate } from '$lib/utils';
	import type { TransactionFormData, ValidationError } from '$lib/types';

	interface Props {
		loading?: boolean;
		initialData?: Partial<TransactionFormData>;
		onsubmit?: (data: TransactionFormData) => void;
		oncancel?: () => void;
	}

	let { 
		loading = false,
		initialData = {},
		onsubmit,
		oncancel
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		submit: TransactionFormData;
		cancel: void;
	}>();

	// Form state
	let formData: TransactionFormData = $state({
		description: initialData.description || '',
		category: initialData.category || '',
		amount: initialData.amount || 0,
		type: initialData.type || 'income',
		date: initialData.date || getTodayLocalDate()
	});

	let errors: Record<string, string> = $state({});

	// Get available categories based on transaction type
	const availableCategories = $derived(
		formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
	);

	// Convert categories to options for select component
	const categoryOptions = $derived(
		availableCategories.map(category => ({
			value: category,
			label: category
		}))
	);

	// Reset category when type changes if it's not valid for the new type
	$effect(() => {
		if (formData.type === 'income' && !INCOME_CATEGORIES.includes(formData.category as any)) {
			formData.category = '';
		} else if (formData.type === 'expense' && !EXPENSE_CATEGORIES.includes(formData.category as any)) {
			formData.category = '';
		}
	});

	function handleSubmit() {
		// Ensure date is set
		if (!formData.date) {
			formData.date = getTodayLocalDate();
		}

		// Validate form
		const validation = validateTransaction(formData);
		
		if (!validation.isValid) {
			// Convert validation errors to error object
			errors = validation.errors.reduce((acc, error) => {
				acc[error.field] = error.message;
				return acc;
			}, {} as Record<string, string>);
			return;
		}

		// Clear errors and submit
		errors = {};
		onsubmit?.(formData);
		dispatch('submit', formData);
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

	// Handle input changes
	function updateCategory(value: string) {
		formData.category = value;
		clearFieldError('category');
	}

	function updateDescription(value: string | number) {
		formData.description = String(value);
		clearFieldError('description');
	}

	function updateAmount(value: string | number) {
		formData.amount = Number(value);
		clearFieldError('amount');
	}

	function updateDate(value: string | number) {
		formData.date = String(value);
		clearFieldError('date');
	}
</script>

<div class="space-y-4">
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
		<!-- Transaction Type -->
		<div class="grid grid-cols-2 gap-4">
			<label class="flex items-center">
				<input
					type="radio"
					bind:group={formData.type}
					value="income"
					class="mr-2"
					disabled={loading}
				/>
				<span class="text-sm font-medium" style="color: var(--color-text-secondary);">Donations</span>
			</label>
			<label class="flex items-center">
				<input
					type="radio"
					bind:group={formData.type}
					value="expense"
					class="mr-2"
					disabled={loading}
				/>
				<span class="text-sm font-medium" style="color: var(--color-text-secondary);">Expense</span>
			</label>
		</div>

		<!-- Category -->
		<Select
			label="Category"
			value={formData.category}
			options={categoryOptions}
			placeholder="Select a category..."
			required
			disabled={loading}
			error={errors.category}
			onchange={updateCategory}
		/>

		<!-- Description -->
		<Input
			type="text"
			label="Description"
			value={formData.description}
			placeholder="Enter transaction description..."
			required
			disabled={loading}
			error={errors.description}
			oninput={updateDescription}
		/>

		<!-- Amount -->
		<Input
			type="number"
			label="Amount"
			value={formData.amount}
			placeholder="0.00"
			min={0.01}
			step={0.01}
			required
			disabled={loading}
			error={errors.amount}
			oninput={updateAmount}
		/>

		<!-- Date -->
		<Input
			type="date"
			label="Date"
			value={formData.date}
			required
			disabled={loading}
			error={errors.date}
			onchange={updateDate}
		/>

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
				disabled={loading}
			>
				Add Transaction
			</Button>
		</div>
	</form>
</div>
