import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Privacy notes for Sharon Sciammas' Open Agents deployment, including authentication, repository access, analytics, and sandboxed agent work.",
  alternates: {
    canonical: "/privacy",
  },
};

const sections = [
  {
    title: "What this deployment collects",
    body: [
      "When you sign in, the app receives basic profile information from the provider you choose, such as your name, email, avatar, provider account id, and OAuth tokens needed to keep your session working.",
      "When you connect GitHub, the app stores the account and installation information required to list repositories, create branches, push commits, and open pull requests you request through the agent.",
      "When you create a session, the app stores session metadata, selected repository details, chat messages, sandbox state, and generated outputs needed to resume or review that work.",
    ],
  },
  {
    title: "How the data is used",
    body: [
      "Authentication data is used to sign you in and maintain your account session.",
      "GitHub and Vercel access is used to run the product workflow you initiate, including repository selection, sandbox creation, branch creation, commits, and pull requests.",
      "Analytics may be used to understand whether the public landing page and product routes are working, but private repository content is not used for marketing analytics.",
    ],
  },
  {
    title: "Third-party services",
    body: [
      "This deployment relies on providers such as Vercel, better-auth, GitHub, Neon Postgres, Upstash Redis, Vercel Sandbox, AI Gateway, and configured model providers.",
      "Repository work runs in isolated sandbox infrastructure. Do not connect repositories that contain secrets, regulated data, or material you are not authorized to share with these services.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You control whether to sign in with Vercel or GitHub, whether to install or connect GitHub access, and which repository a session uses.",
      "You can revoke provider access from your Vercel or GitHub account settings. You can also avoid connecting sensitive repositories and use a test repository for evaluation.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-20 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to Open Agents
        </Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">
          Privacy notes
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          These are basic product privacy notes for Sharon Sciammas&apos; Open
          Agents deployment. They are written for clarity, not as legal advice.
          Last updated April 24, 2026.
        </p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold tracking-tight">
                {section.title}
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
