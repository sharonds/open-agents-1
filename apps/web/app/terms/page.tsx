import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Basic terms for Sharon Sciammas' Open Agents deployment and sandboxed repository automation.",
  alternates: {
    canonical: "/terms",
  },
};

const sections = [
  {
    title: "Use a repository you control",
    body: "Only connect repositories you own or are authorized to modify. The agent can create branches, write commits, push code, and open pull requests in connected repositories.",
  },
  {
    title: "No sensitive repositories",
    body: "Do not connect repositories containing secrets, private keys, credentials, regulated data, customer data, or material you cannot share with the infrastructure and model providers used by this deployment.",
  },
  {
    title: "Generated work needs review",
    body: "Agent output is not guaranteed to be correct, secure, complete, or production-ready. Review every change before merging or deploying it.",
  },
  {
    title: "Acceptable use",
    body: "Do not use this deployment to attack systems, exfiltrate data, generate malware, spam, infringe rights, or perform activity that you are not legally allowed to perform.",
  },
  {
    title: "Availability",
    body: "This is a public lab deployment and may change, fail, rate limit, or be taken offline. It is provided without warranties.",
  },
] as const;

export default function TermsPage() {
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
          Terms of use
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Basic terms for using Sharon Sciammas&apos; Open Agents deployment.
          Last updated April 24, 2026.
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold tracking-tight">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
