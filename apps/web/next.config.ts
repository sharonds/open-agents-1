import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/automations",
        destination: "/settings/automations",
        permanent: true,
      },
      {
        source: "/automations/:id",
        destination: "/settings/automations/:id",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "vercel.com",
      },
      {
        protocol: "https",
        hostname: "*.vercel.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default withWorkflow(withBotId(nextConfig));
