import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session/get-server-session";
import { HomePage } from "./home-page";

const pageDescription =
  "Sign in with Vercel or GitHub to try Sharon Sciammas' Open Agents fork, a deployed Vercel reference AI agent with 4 blockers fixed and documented.";

export const metadata: Metadata = {
  title: "Working Open Agents fork",
  description: pageDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "A working Open Agents fork, documented by Sharon Sciammas",
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
    title: "A working Open Agents fork",
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
