import type { NightRoleStep } from './types';

export const DEFAULT_NIGHT_ROLE_ORDER: readonly NightRoleStep[] = [
  'guard',
  'wolf',
  'seer',
  'witch',
  'hunter',
];

const NIGHT_ROLE_STEPS = new Set<NightRoleStep>(DEFAULT_NIGHT_ROLE_ORDER);

/**
 * Dữ liệu lưu trên máy hoặc trong ván cũ có thể thiếu/hỏng. Chỉ chấp nhận
 * đúng một hoán vị đầy đủ để luật gọi vai không vô tình bỏ mất lượt.
 */
export function normalizeNightRoleOrder(value: unknown): NightRoleStep[] {
  if (!Array.isArray(value) || value.length !== DEFAULT_NIGHT_ROLE_ORDER.length) {
    return [...DEFAULT_NIGHT_ROLE_ORDER];
  }

  const uniqueSteps = new Set(value);
  const isValid = uniqueSteps.size === DEFAULT_NIGHT_ROLE_ORDER.length
    && value.every((step): step is NightRoleStep => typeof step === 'string' && NIGHT_ROLE_STEPS.has(step as NightRoleStep));

  return isValid ? [...value] : [...DEFAULT_NIGHT_ROLE_ORDER];
}

export function moveNightRoleStep(
  order: readonly NightRoleStep[],
  step: NightRoleStep,
  offset: -1 | 1,
): NightRoleStep[] {
  const normalized = normalizeNightRoleOrder(order);
  const currentIndex = normalized.indexOf(step);
  const targetIndex = currentIndex + offset;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= normalized.length) return normalized;

  const next = [...normalized];
  [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
  return next;
}
