import type { NightRoleStep } from './types';

export const DEFAULT_NIGHT_ROLE_ORDER: readonly NightRoleStep[] = [
  'guard',
  'half_wolf',
  'wolf',
  'wolf_seer',
  'seer',
  'detective',
  'witch',
  'hunter',
];

const NIGHT_ROLE_STEPS = new Set<NightRoleStep>(DEFAULT_NIGHT_ROLE_ORDER);

/**
 * Dữ liệu lưu trên máy hoặc trong ván cũ có thể thiếu/hỏng. Chỉ chấp nhận
 * đúng một hoán vị đầy đủ để luật gọi vai không vô tình bỏ mất lượt.
 */
export function normalizeNightRoleOrder(value: unknown): NightRoleStep[] {
  const legacySteps = DEFAULT_NIGHT_ROLE_ORDER.filter(step => step !== 'half_wolf');
  const legacyStepSet = new Set<NightRoleStep>(legacySteps);
  if (Array.isArray(value) && value.length === legacySteps.length) {
    const legacySet = new Set(value);
    const isLegacyOrder = legacySet.size === legacySteps.length
      && value.every(step => typeof step === 'string' && legacyStepSet.has(step as NightRoleStep));
    if (isLegacyOrder) {
      const migrated = [...value] as NightRoleStep[];
      migrated.splice(migrated.indexOf('wolf'), 0, 'half_wolf');
      return migrated;
    }
  }
  if (!Array.isArray(value) || value.length !== DEFAULT_NIGHT_ROLE_ORDER.length) {
    return [...DEFAULT_NIGHT_ROLE_ORDER];
  }

  const uniqueSteps = new Set(value);
  const isValid = uniqueSteps.size === DEFAULT_NIGHT_ROLE_ORDER.length
    && value.every((step): step is NightRoleStep => typeof step === 'string' && NIGHT_ROLE_STEPS.has(step as NightRoleStep));

  if (!isValid) return [...DEFAULT_NIGHT_ROLE_ORDER];
  const order = [...value] as NightRoleStep[];
  return order.indexOf('half_wolf') < order.indexOf('wolf')
    ? order
    : [...DEFAULT_NIGHT_ROLE_ORDER];
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
  return next.indexOf('half_wolf') < next.indexOf('wolf') ? next : normalized;
}
