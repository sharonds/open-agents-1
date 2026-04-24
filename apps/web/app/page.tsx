import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session/get-server-session";
import { HomePage } from "./home-page";

const pageDescription =
  "Evaluate Sharon Sciammas' live Vercel Open Agents deployment: a reference app with documented setup fixes, GitHub automation, and sandboxed execution.";

export const metadata: Metadata = {
  title: "Vercel Open Agents deployment",
  description: pageDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Open Agents for real-world evaluation",
    description: pageDescription,
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Sharon Sciammas' Open Agents deployment",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vercel Open Agents deployment",
    description: pageDescription,
    images: ["/opengraph-image"],
  },
};

const landingJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Sharon Sciammas' Open Agents deployment",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: "https://agents.sharonsciammas.com",
  author: {
    "@type": "Person",
    name: "Sharon Sciammas",
    url: "https://sharonsciammas.com",
  },
  codeRepository: "https://github.com/sharonds/open-agents-1",
  sameAs: [
    "https://github.com/sharonds/open-agents-1",
    "https://github.com/sharonds/open-agents-deploy-guide",
    "https://sharonsciammas.com/blog/deploying-vercel-open-agents",
  ],
  description: pageDescription,
};

export default async function Home() {
  const session = await getServerSession();
  if (session?.user) {
    redirect("/sessions");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />
      <HomePage hasSessionCookie={false} lastRepo={null} />
    </>
  );
}
