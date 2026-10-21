import type { Role } from '../game/types';
import type { NightRoleStep } from '../game/night';

export const ROLE_CARD_IMAGES: Record<Role, string> = {
  wolf: '/assets/cards/card_wolf.webp',
  wolf_demon: '/assets/cards/card_wolf_demon.webp',
  seer: '/assets/cards/card_seer.webp',
  witch: '/assets/cards/card_witch.webp',
  guard: '/assets/cards/card_guard.webp',
  hunter: '/assets/cards/card_hunter.webp',
  villager: '/assets/cards/card_villager.webp',
};

export const CARD_BACK_IMAGE = '/assets/cards/card_back.webp';

export const ROLE_MEDALLION_ICONS: Record<Role, string> = {
  wolf: '/assets/icons/icon_wolf_paw.webp',
  wolf_demon: '/assets/icons/icon_wolf_paw_fire_balanced.webp',
  seer: '/assets/icons/icon_eye_balanced.webp',
  witch: '/assets/icons/icon_potion_heal_balanced.webp',
  guard: '/assets/icons/icon_shield_balanced.webp',
  hunter: '/assets/icons/icon_swords_alt_balanced.webp',
  villager: '/assets/icons/icon_ballot.webp',
};

export const PHASE_MEDALLION_ICONS = {
  night: '/assets/icons/icon_moon.webp',
  day: '/assets/icons/icon_sun.webp',
  vote: '/assets/icons/icon_skull.webp',
  ended: '/assets/icons/icon_skull.webp',
  hourglass: '/assets/icons/icon_hourglass.webp',
  gear: '/assets/icons/icon_gear.webp',
};

export const NIGHT_ROLE_PROGRESS_ITEMS: Record<NightRoleStep, {
  label: string;
  iconUrl: string;
}> = {
  guard: { label: 'Bảo Vệ', iconUrl: ROLE_MEDALLION_ICONS.guard },
  wolf: { label: 'Ma Sói', iconUrl: ROLE_MEDALLION_ICONS.wolf },
  seer: { label: 'Tiên Tri', iconUrl: ROLE_MEDALLION_ICONS.seer },
  witch: { label: 'Phù Thủy', iconUrl: ROLE_MEDALLION_ICONS.witch },
  hunter: { label: 'Thợ Săn', iconUrl: ROLE_MEDALLION_ICONS.hunter },
};
