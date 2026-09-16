/**
 * Pure image-host parsing shared by next.config.ts and server-side URL
 * validation. Keep this module free of Next runtime imports: next.config.ts is
 * evaluated before the application bundle is built.
 */
export interface ImageHostEnvironment {
  readonly [name: string]: string | undefined;
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly ALLOWED_IMAGE_HOSTS?: string;
}

const HOST_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeExactHostname(value: string): string | null {
  const hostname = value.trim().toLowerCase();
  if (
    !hostname ||
    hostname.length > 253 ||
    hostname.startsWith(".") ||
    hostname.endsWith(".")
  ) {
    return null;
  }
  return hostname.split(".").every((label) => HOST_LABEL_RE.test(label))
    ? hostname
    : null;
}

export function configuredSupabaseHost(
  env: ImageHostEnvironment = process.env,
): string | null {
  const value = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) {
      return null;
    }
    return normalizeExactHostname(url.hostname);
  } catch {
    return null;
  }
}

/** Exact DNS hostnames only: schemes, paths, ports, and wildcards are invalid. */
export function allowedImageHosts(
  env: ImageHostEnvironment = process.env,
): ReadonlySet<string> {
  const hosts = new Set<string>();
  for (const entry of (env.ALLOWED_IMAGE_HOSTS ?? "").split(",")) {
    const hostname = normalizeExactHostname(entry);
    if (hostname) hosts.add(hostname);
  }

  const supabaseHost = configuredSupabaseHost(env);
  if (supabaseHost) hosts.add(supabaseHost);
  return hosts;
}

/** CSP host-sources for HTTPS images; never returns a scheme-wide source. */
export function allowedImageOrigins(
  env: ImageHostEnvironment = process.env,
): readonly string[] {
  return Array.from(allowedImageHosts(env), (host) => `https://${host}`);
}
