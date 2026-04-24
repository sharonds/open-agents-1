import type { MetadataRoute } from "next";

const siteUrl = "https://agents.sharonsciammas.com";

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/sessions/", "/settings/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
