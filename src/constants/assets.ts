import type { Role } from '../game/types';

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
  wolf_demon: '/assets/icons/icon_wolf_paw_fire.webp',
  seer: '/assets/icons/icon_eye.webp',
  witch: '/assets/icons/icon_potion_heal.webp',
  guard: '/assets/icons/icon_shield.webp',
  hunter: '/assets/icons/icon_swords.webp',
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
