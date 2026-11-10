/**
 * Dane administratora serwisu. Uzupełnij przed publicznym udostępnieniem (plik .env.local w apps/web):
 *   VITE_OPERATOR_NAME=Imię i nazwisko lub nazwa firmy
 *   VITE_CONTACT_EMAIL=adres@do-kontaktu.pl
 * Bez tych zmiennych strony prawne nie pokazują danych kontaktowych.
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const OPERATOR_NAME = env.VITE_OPERATOR_NAME?.trim() || '';
export const CONTACT_EMAIL = env.VITE_CONTACT_EMAIL?.trim() || '';
export const LAST_UPDATED = '10 listopada 2026';
