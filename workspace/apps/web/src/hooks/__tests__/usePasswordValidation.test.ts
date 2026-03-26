import { renderHook, act } from '@testing-library/react';
import { usePasswordValidation } from '../usePasswordValidation';

describe('usePasswordValidation', () => {
  it('returns invalid for weak passwords', () => {
    const { result } = renderHook(() => usePasswordValidation());
    const validation = result.current.validate('Ab1');
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('returns valid for strong passwords', () => {
    const { result } = renderHook(() => usePasswordValidation());
    const validation = result.current.validate('Abcdefg1');
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('setPassword updates password and returns validation', () => {
    const { result } = renderHook(() => usePasswordValidation());
    let validation: ReturnType<typeof result.current.setPassword>;
    act(() => {
      validation = result.current.setPassword('Abcdefg1');
    });
    expect(result.current.password).toBe('Abcdefg1');
    expect(validation!.isValid).toBe(true);
    expect(result.current.isValid).toBe(true);
  });

  it('errors is derived state, not recalculated on every render', () => {
    const { result } = renderHook(() => usePasswordValidation());
    act(() => {
      result.current.setPassword('Abcdefg1');
    });
    const errorsBefore = result.current.errors;
    result.current.validate('x'); // doesn't update hook state
    expect(result.current.errors).toBe(errorsBefore);
  });
});
