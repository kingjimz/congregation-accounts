import type { TransactionFormData, OpeningBalanceFormData, ValidationError, FormValidationResult } from '$lib/types';
import { VALIDATION_RULES } from '$lib/constants';

/**
 * Validates transaction form data
 */
export function validateTransaction(data: TransactionFormData): FormValidationResult {
  const errors: ValidationError[] = [];

  // Validate description
  if (!data.description?.trim()) {
    errors.push({ field: 'description', message: 'Description is required' });
  } else if (data.description.trim().length < VALIDATION_RULES.MIN_DESCRIPTION_LENGTH) {
    errors.push({ 
      field: 'description', 
      message: `Description must be at least ${VALIDATION_RULES.MIN_DESCRIPTION_LENGTH} characters` 
    });
  } else if (data.description.trim().length > VALIDATION_RULES.MAX_DESCRIPTION_LENGTH) {
    errors.push({ 
      field: 'description', 
      message: `Description must be less than ${VALIDATION_RULES.MAX_DESCRIPTION_LENGTH} characters` 
    });
  }

  // Validate category
  if (!data.category?.trim()) {
    errors.push({ field: 'category', message: 'Category is required' });
  }

  // Validate amount
  const amountValidation = validateAmount(data.amount);
  if (!amountValidation.isValid) {
    errors.push(...amountValidation.errors);
  }

  // Validate type
  if (!data.type || !['income', 'expense'].includes(data.type)) {
    errors.push({ field: 'type', message: 'Valid transaction type is required' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates opening balance form data
 */
export function validateOpeningBalance(data: OpeningBalanceFormData): FormValidationResult {
  const errors: ValidationError[] = [];

  // Validate balance amount
  const amountValidation = validateAmount(data.balance);
  if (!amountValidation.isValid) {
    errors.push(...amountValidation.errors.map((error: ValidationError) => ({ 
      ...error, 
      field: 'balance' 
    })));
  }

  // Validate note length (optional field)
  if (data.note && data.note.length > VALIDATION_RULES.MAX_NOTE_LENGTH) {
    errors.push({ 
      field: 'note', 
      message: `Note must be less than ${VALIDATION_RULES.MAX_NOTE_LENGTH} characters` 
    });
  }

  // Validate month format
  if (!data.month || !/^\d{4}-\d{2}$/.test(data.month)) {
    errors.push({ field: 'month', message: 'Valid month is required (YYYY-MM format)' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an amount value
 */
export function validateAmount(amount: number): FormValidationResult {
  const errors: ValidationError[] = [];

  if (amount === null || amount === undefined || isNaN(amount)) {
    errors.push({ field: 'amount', message: 'Amount is required' });
  } else if (amount < VALIDATION_RULES.MIN_AMOUNT) {
    errors.push({ 
      field: 'amount', 
      message: `Amount must be at least ${VALIDATION_RULES.MIN_AMOUNT}` 
    });
  } else if (amount > VALIDATION_RULES.MAX_AMOUNT) {
    errors.push({ 
      field: 'amount', 
      message: `Amount cannot exceed ${VALIDATION_RULES.MAX_AMOUNT}` 
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a description field
 */
export function validateDescription(description: string): FormValidationResult {
  const errors: ValidationError[] = [];

  if (!description?.trim()) {
    errors.push({ field: 'description', message: 'Description is required' });
  } else if (description.trim().length < VALIDATION_RULES.MIN_DESCRIPTION_LENGTH) {
    errors.push({ 
      field: 'description', 
      message: `Description must be at least ${VALIDATION_RULES.MIN_DESCRIPTION_LENGTH} characters` 
    });
  } else if (description.trim().length > VALIDATION_RULES.MAX_DESCRIPTION_LENGTH) {
    errors.push({ 
      field: 'description', 
      message: `Description must be less than ${VALIDATION_RULES.MAX_DESCRIPTION_LENGTH} characters` 
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
