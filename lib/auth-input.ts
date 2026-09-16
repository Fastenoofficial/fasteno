/** Shared client/server bounds for authentication inputs. */
export const AUTH_EMAIL_MAX_LENGTH = 254;
export const AUTH_LOGIN_PASSWORD_MAX_LENGTH = 128;
export const AUTH_NEW_PASSWORD_MIN_LENGTH = 12;
export const AUTH_NEW_PASSWORD_MAX_LENGTH = 128;
export const AUTH_NAME_MIN_LENGTH = 2;
export const AUTH_NAME_MAX_LENGTH = 100;

export const AUTH_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAuthEmail(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().toLowerCase()
    : "";
}
