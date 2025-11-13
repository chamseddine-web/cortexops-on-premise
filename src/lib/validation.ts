/**
 * Form Validation System
 * Comprehensive validation utilities for forms
 */

export type ValidationRule<T = any> = {
  validate: (value: T, formData?: any) => boolean;
  message: string;
};

export type FieldValidation = {
  [key: string]: ValidationRule[];
};

export type ValidationErrors = {
  [key: string]: string[];
};

export class Validator {
  static required(message: string = 'Ce champ est requis'): ValidationRule {
    return {
      validate: (value) => {
        if (typeof value === 'string') {
          return value.trim().length > 0;
        }
        return value !== null && value !== undefined && value !== '';
      },
      message
    };
  }

  static email(message: string = 'Email invalide'): ValidationRule {
    return {
      validate: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !value || emailRegex.test(String(value));
      },
      message
    };
  }

  static minLength(min: number, message?: string): ValidationRule {
    return {
      validate: (value) => {
        return !value || String(value).length >= min;
      },
      message: message || `Minimum ${min} caractères requis`
    };
  }

  static maxLength(max: number, message?: string): ValidationRule {
    return {
      validate: (value) => {
        return !value || String(value).length <= max;
      },
      message: message || `Maximum ${max} caractères autorisés`
    };
  }

  static pattern(regex: RegExp, message: string = 'Format invalide'): ValidationRule {
    return {
      validate: (value) => {
        return !value || regex.test(String(value));
      },
      message
    };
  }

  static url(message: string = 'URL invalide'): ValidationRule {
    return {
      validate: (value) => {
        try {
          if (!value) return true;
          new URL(String(value));
          return true;
        } catch {
          return false;
        }
      },
      message
    };
  }

  static number(message: string = 'Doit être un nombre'): ValidationRule {
    return {
      validate: (value) => {
        return !value || !isNaN(Number(value));
      },
      message
    };
  }

  static min(min: number, message?: string): ValidationRule {
    return {
      validate: (value) => {
        return !value || Number(value) >= min;
      },
      message: message || `Valeur minimale: ${min}`
    };
  }

  static max(max: number, message?: string): ValidationRule {
    return {
      validate: (value) => {
        return !value || Number(value) <= max;
      },
      message: message || `Valeur maximale: ${max}`
    };
  }

  static match(fieldName: string, message?: string): ValidationRule {
    return {
      validate: (value, formData) => {
        return !value || value === formData?.[fieldName];
      },
      message: message || `Les champs ne correspondent pas`
    };
  }

  static custom(
    validationFn: (value: any, formData?: any) => boolean,
    message: string
  ): ValidationRule {
    return {
      validate: validationFn,
      message
    };
  }

  static password(message?: string): ValidationRule {
    return {
      validate: (value) => {
        if (!value) return true;
        const hasMinLength = String(value).length >= 8;
        const hasUpperCase = /[A-Z]/.test(String(value));
        const hasLowerCase = /[a-z]/.test(String(value));
        const hasNumber = /[0-9]/.test(String(value));
        return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
      },
      message: message || 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
    };
  }

  static alpha(message: string = 'Seules les lettres sont autorisées'): ValidationRule {
    return {
      validate: (value) => {
        return !value || /^[a-zA-Z]+$/.test(String(value));
      },
      message
    };
  }

  static alphanumeric(message: string = 'Seuls les lettres et chiffres sont autorisés'): ValidationRule {
    return {
      validate: (value) => {
        return !value || /^[a-zA-Z0-9]+$/.test(String(value));
      },
      message
    };
  }

  static phone(message: string = 'Numéro de téléphone invalide'): ValidationRule {
    return {
      validate: (value) => {
        if (!value) return true;
        const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
        return phoneRegex.test(String(value).replace(/\s/g, ''));
      },
      message
    };
  }
}

export function validateField(
  value: any,
  rules: ValidationRule[],
  formData?: any
): string[] {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validate(value, formData)) {
      errors.push(rule.message);
    }
  }

  return errors;
}

export function validateForm(
  formData: Record<string, any>,
  validation: FieldValidation
): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const [field, rules] of Object.entries(validation)) {
    const fieldErrors = validateField(formData[field], rules, formData);
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  }

  return errors;
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function getFirstError(errors: ValidationErrors): string | null {
  const firstField = Object.keys(errors)[0];
  return firstField ? errors[firstField][0] : null;
}

export function clearFieldError(
  errors: ValidationErrors,
  field: string
): ValidationErrors {
  const newErrors = { ...errors };
  delete newErrors[field];
  return newErrors;
}

export class FormValidator {
  private validation: FieldValidation;
  private errors: ValidationErrors = {};

  constructor(validation: FieldValidation) {
    this.validation = validation;
  }

  validate(formData: Record<string, any>): boolean {
    this.errors = validateForm(formData, this.validation);
    return !hasErrors(this.errors);
  }

  validateField(field: string, value: any, formData?: any): boolean {
    if (!this.validation[field]) {
      return true;
    }

    const fieldErrors = validateField(value, this.validation[field], formData);

    if (fieldErrors.length > 0) {
      this.errors[field] = fieldErrors;
      return false;
    } else {
      this.errors = clearFieldError(this.errors, field);
      return true;
    }
  }

  getErrors(): ValidationErrors {
    return this.errors;
  }

  getFieldErrors(field: string): string[] {
    return this.errors[field] || [];
  }

  hasErrors(): boolean {
    return hasErrors(this.errors);
  }

  clearErrors() {
    this.errors = {};
  }

  clearFieldError(field: string) {
    this.errors = clearFieldError(this.errors, field);
  }
}

export function createValidator(validation: FieldValidation): FormValidator {
  return new FormValidator(validation);
}

export const commonValidations = {
  email: [Validator.required(), Validator.email()],
  password: [Validator.required(), Validator.password()],
  name: [Validator.required(), Validator.minLength(2), Validator.maxLength(50)],
  username: [
    Validator.required(),
    Validator.minLength(3),
    Validator.maxLength(20),
    Validator.alphanumeric('Seuls les lettres et chiffres sont autorisés')
  ],
  url: [Validator.required(), Validator.url()],
  phone: [Validator.phone()]
};
