/**
 * Dane administratora serwisu. Domyślnie: nick Madyn, kontakt przez Discord.
 * Link do Discorda można nadpisać w apps/web/.env.local (VITE_DISCORD_URL=...).
 * Można też nadpisać nick (VITE_OPERATOR_NAME) i dodać adres e-mail (VITE_CONTACT_EMAIL).
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const OPERATOR_NAME = env.VITE_OPERATOR_NAME?.trim() || 'Madyn';
export const DISCORD_URL = env.VITE_DISCORD_URL?.trim() || 'https://discord.gg/Wp5vmfWWMB';
export const CONTACT_EMAIL = env.VITE_CONTACT_EMAIL?.trim() || '';
export const LAST_UPDATED = '10 listopada 2026';
