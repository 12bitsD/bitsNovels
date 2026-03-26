import { useState, useCallback } from 'react';

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export function usePasswordValidation() {
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState<PasswordValidation>({ isValid: false, errors: [] });

  const validate = useCallback((pwd: string): PasswordValidation => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('至少 8 个字符');
    if (!/[A-Z]/.test(pwd)) errors.push('包含大写字母');
    if (!/[a-z]/.test(pwd)) errors.push('包含小写字母');
    if (!/[0-9]/.test(pwd)) errors.push('包含数字');
    return { isValid: errors.length === 0, errors };
  }, []);

  const validateAndSet = useCallback((pwd: string) => {
    setPassword(pwd);
    const result = validate(pwd);
    setValidation(result);
    return result;
  }, [validate]);

  return {
    password,
    setPassword: validateAndSet,
    validate,
    isValid: validation.isValid,
    errors: validation.errors,
  };
}
