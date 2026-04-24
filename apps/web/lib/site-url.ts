const FALLBACK_SITE_URL = "https://agents.sharonsciammas.com";

function normalizeSiteUrl(value?: string | null): URL | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const candidate =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    return new URL(new URL(candidate).origin);
  } catch {
    return null;
  }
}

export function getSiteUrl(): string {
  return getSiteUrlObject().origin;
}

export function getSiteUrlObject(): URL {
  const configuredUrl =
    process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl =
    process.env.VERCEL_ENV === "production"
      ? (process.env.VERCEL_PROJECT_PRODUCTION_URL ??
        process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
        process.env.VERCEL_URL)
      : process.env.VERCEL_URL;

  const candidates = [configuredUrl, vercelUrl, FALLBACK_SITE_URL];

  for (const candidate of candidates) {
    const siteUrl = normalizeSiteUrl(candidate);
    if (siteUrl) {
      return siteUrl;
    }
  }

  return new URL(FALLBACK_SITE_URL);
}
