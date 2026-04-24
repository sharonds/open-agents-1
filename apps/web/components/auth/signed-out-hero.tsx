"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignInButton } from "@/components/auth/sign-in-button";
import { AppMockup } from "@/components/landing/app-mockup";
import { GitHubLink } from "@/components/landing/github-link";
import { LandingNav } from "@/components/landing/nav";
import { Stage } from "@/components/landing/stage";
import { Button } from "@/components/ui/button";

const DEPLOY_GUIDE_URL = "https://github.com/sharonds/open-agents-deploy-guide";
const FORK_SOURCE_URL = "https://github.com/sharonds/open-agents-1";
const UPSTREAM_SOURCE_URL = "https://github.com/vercel-labs/open-agents";
const DEPLOY_STORY_URL =
  "https://sharonsciammas.com/blog/deploying-vercel-open-agents";
const LABS_STORY_URL = "https://sharonsciammas.com/labs/open-agents";
const SHARON_HOME_URL = "https://sharonsciammas.com";

const featureStrip = [
  {
    label: "Production deployed",
    description: "Reference architecture running on a live stack",
  },
  {
    label: "4 blockers resolved",
    description: "Auth, sandbox, clone flow, and setup documentation",
  },
  {
    label: "GitHub workflow",
    description: "Branch, commit, push, and pull-request automation",
  },
] as const;

const proofPoints = [
  ["Deployment", "Live agent environment"],
  ["Engineering", "4 production blockers resolved"],
  ["Stack", "Sandbox, Workflow, Neon, Upstash"],
  ["Documentation", "Public deploy guide + source"],
] as const;

const fixes = [
  {
    title: "README stale",
    body: "Uses JWE_SECRET, but the app actually needs BETTER_AUTH_SECRET and BETTER_AUTH_URL.",
    href: `${DEPLOY_GUIDE_URL}#bug-1--readme-is-stale-better_auth_secret--better_auth_url-missing`,
  },
  {
    title: "unable_to_create_user on first sign-in",
    body: "The better-auth social provider config was missing mapProfileToUser.",
    href: `${DEPLOY_GUIDE_URL}#bug-2--unable_to_create_user-on-first-sign-in`,
  },
  {
    title: "Sandbox returns Snapshot not found",
    body: "The app referenced a hardcoded snapshot ID scoped to the Vercel Labs team.",
    href: `${DEPLOY_GUIDE_URL}#bug-3--sandbox-returns-404-snapshot-not-found`,
  },
  {
    title: "Sandbox has .git but no checked-out files",
    body: 'SDK source: { type: "git" } mode left no origin remote and nothing useful to work with.',
    href: `${DEPLOY_GUIDE_URL}#bug-4--agent-has-files-visible-but-nothing-to-work-with`,
  },
] as const;

export function SignedOutHero() {
  const heroButtonsRef = useRef<HTMLDivElement>(null);
  const [heroButtonsVisible, setHeroButtonsVisible] = useState(true);

  useEffect(() => {
    const el = heroButtonsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroButtonsVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing relative isolate min-h-screen bg-(--l-bg) text-(--l-fg) selection:bg-(--l-fg)/20">
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden md:block">
        <div className="mx-auto h-full max-w-[1320px] border-x border-x-(--l-border)" />
      </div>

      <div className="relative z-10">
        <LandingNav showSignIn={!heroButtonsVisible} />

        <section className="relative overflow-hidden pb-0 pt-24 md:pb-0 md:pt-36">
          <div className="mx-auto grid max-w-[1320px] gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(340px,1fr)] lg:items-end lg:gap-10">
            <div className="max-w-[780px] pb-0 md:pb-10">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-(--l-fg-3)">
                Sharon Sciammas Lab · Open Agents Deployment · April 2026
              </p>
              <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.03] tracking-tighter sm:text-5xl md:text-6xl">
                Open Agents for real-world evaluation.
              </h1>
              <p className="mt-4 max-w-[680px] text-pretty text-base leading-relaxed text-(--l-fg-2) sm:mt-6 sm:text-xl">
                A live deployment of Vercel&apos;s open-source AI coding agent
                reference app, refined by Sharon Sciammas with documented fixes
                for 4 deployment blockers. Sign in, connect a test repository,
                and evaluate the GitHub PR workflow.
              </p>

              <div
                ref={heroButtonsRef}
                className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-[auto_auto] sm:items-center"
              >
                <SignInButton size="lg" callbackUrl="/sessions" />
                <SignInButton
                  provider="github"
                  size="lg"
                  variant="secondary"
                  callbackUrl="/sessions"
                />
                <Button variant="ghost" size="lg" asChild>
                  <a href={DEPLOY_STORY_URL}>Read the deploy story →</a>
                </Button>
              </div>

              <div className="mt-7 grid gap-2 sm:grid-cols-2">
                {proofPoints.map(([label, value]) => (
                  <div
                    key={label}
                    className="border border-(--l-border-subtle) bg-(--l-surface) px-3 py-2"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--l-fg-4)">
                      {label}
                    </div>
                    <div className="mt-1 truncate text-sm text-(--l-fg-2)">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden md:pl-2">
              <Stage tone="slate">
                <AppMockup />
              </Stage>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1320px] border-t border-(--l-border-subtle) px-6 py-14 sm:px-10 md:py-20">
            <div className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(360px,1fr)]">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-(--l-fg-3)">
                  What this is
                </p>
                <h2 className="mt-4 max-w-[760px] text-balance text-3xl font-semibold tracking-tighter sm:text-4xl">
                  A working reference implementation with a clear setup path.
                </h2>
                <p className="mt-5 max-w-[760px] text-pretty text-lg leading-relaxed text-(--l-fg-2)">
                  <strong className="font-medium text-(--l-fg)">
                    Open Agents is Vercel&apos;s open-source reference
                    implementation of the autonomous coding agent pattern.
                  </strong>{" "}
                  It pairs a chat interface with durable workflows, isolated
                  sandbox execution, and GitHub automation.
                </p>
                <p className="mt-5 max-w-[760px] text-pretty text-base leading-relaxed text-(--l-fg-2)">
                  This deployment keeps the reference architecture intact while
                  documenting the fixes required to run it outside the original
                  environment.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                {featureStrip.map((feature, index) => (
                  <article
                    key={feature.label}
                    className="border border-(--l-border) bg-(--l-surface) p-4"
                  >
                    <div className="font-mono text-[11px] text-(--l-fg-4)">
                      00{index + 1}
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight">
                      {feature.label}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-(--l-fg-2)">
                      {feature.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1320px] border-t border-(--l-border) px-6 py-14 sm:px-10 md:py-20">
            <div className="grid gap-10 md:grid-cols-[320px_minmax(0,1fr)]">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-(--l-fg-3)">
                  Deployment fixes
                </p>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tighter sm:text-4xl">
                  Four blockers resolved and documented.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-(--l-fg-2)">
                  Each item links to the exact implementation note in the deploy
                  guide.
                </p>
              </div>

              <div className="divide-y divide-(--l-border)">
                {fixes.map((fix, index) => (
                  <article
                    key={fix.title}
                    className="grid gap-4 py-6 first:pt-0 sm:grid-cols-[4rem_minmax(0,1fr)]"
                  >
                    <div className="font-mono text-sm text-(--l-fg-4)">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium tracking-tight">
                        {fix.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-(--l-fg-2)">
                        {fix.body}
                      </p>
                      <a
                        href={fix.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex text-sm font-medium text-(--l-fg) underline-offset-4 hover:underline"
                      >
                        Details →
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto grid max-w-[1320px] gap-8 border-t border-(--l-border) px-4 py-14 sm:px-10 md:grid-cols-[320px_minmax(0,1fr)] md:py-20">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-(--l-fg-3)">
                Authentication
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tighter sm:text-4xl">
                Try the GitHub flow without a Vercel login.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="border border-(--l-border) bg-(--l-surface) p-5">
                <h3 className="text-lg font-medium tracking-tight">
                  Sign in with Vercel
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-(--l-fg-2)">
                  Use this path when you want project lookup and Vercel-linked
                  context for a selected repository.
                </p>
              </article>
              <article className="border border-(--l-border) bg-(--l-surface) p-5">
                <h3 className="text-lg font-medium tracking-tight">
                  Sign in with GitHub
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-(--l-fg-2)">
                  Use this path for a streamlined repo-connected evaluation. No
                  Vercel login is required. Email and Google auth are better
                  handled as a separate account-policy project.
                </p>
              </article>
            </div>
          </div>
        </section>

        <footer>
          <div className="mx-auto max-w-[1320px] border-t border-(--l-border) px-4 py-10 sm:px-10">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.22em] text-(--l-fg-4)">
                  Open Agents deployment lab
                </div>
                <p className="mt-3 max-w-[620px] text-sm leading-relaxed text-(--l-fg-2)">
                  A public technical lab by Sharon Sciammas, with source,
                  deployment notes, and evaluation paths in one place.
                </p>
              </div>

              <GitHubLink href={FORK_SOURCE_URL} variant="outline" size="sm">
                Source
              </GitHubLink>
            </div>

            <nav
              aria-label="Footer navigation"
              className="mt-8 grid gap-6 border-t border-(--l-border-subtle) pt-8 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div>
                <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-(--l-fg-4)">
                  Build notes
                </h2>
                <div className="mt-3 flex flex-col gap-2 text-sm text-(--l-fg-2)">
                  <a
                    href={DEPLOY_STORY_URL}
                    className="transition-colors hover:text-(--l-fg)"
                  >
                    Read the deploy story
                  </a>
                  <a
                    href={LABS_STORY_URL}
                    className="transition-colors hover:text-(--l-fg)"
                  >
                    Personal-site lab page
                  </a>
                  <a
                    href={SHARON_HOME_URL}
                    className="transition-colors hover:text-(--l-fg)"
                  >
                    SharonSciammas.com
                  </a>
                </div>
              </div>

              <div>
                <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-(--l-fg-4)">
                  Source
                </h2>
                <div className="mt-3 flex flex-col gap-2 text-sm text-(--l-fg-2)">
                  <a
                    href={FORK_SOURCE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-(--l-fg)"
                  >
                    Sharon&apos;s source repo
                  </a>
                  <a
                    href={DEPLOY_GUIDE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-(--l-fg)"
                  >
                    Deploy guide repo
                  </a>
                  <a
                    href={UPSTREAM_SOURCE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-(--l-fg)"
                  >
                    Vercel Labs upstream
                  </a>
                </div>
              </div>

              <div>
                <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-(--l-fg-4)">
                  Product
                </h2>
                <div className="mt-3 flex flex-col gap-2 text-sm text-(--l-fg-2)">
                  <Link
                    href="/sessions"
                    className="transition-colors hover:text-(--l-fg)"
                  >
                    Sessions
                  </Link>
                  <Link
                    href="/deploy-your-own"
                    className="transition-colors hover:text-(--l-fg)"
                  >
                    Deploy your own
                  </Link>
                  <Link
                    href="/"
                    className="transition-colors hover:text-(--l-fg)"
                  >
                    Sign in options
                  </Link>
                </div>
              </div>

              <div>
                <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-(--l-fg-4)">
                  Legal
                </h2>
                <div className="mt-3 flex flex-col gap-2 text-sm text-(--l-fg-2)">
                  <Link
                    href="/privacy"
                    className="transition-colors hover:text-(--l-fg)"
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/terms"
                    className="transition-colors hover:text-(--l-fg)"
                  >
                    Terms
                  </Link>
                </div>
              </div>
            </nav>

            <div className="mt-8 border-t border-(--l-border-subtle) pt-6">
              <div className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs text-(--l-fg-2)">
                <a
                  href={DEPLOY_GUIDE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-(--l-fg)"
                >
                  → Deploy guide repo
                </a>
                <span className="text-(--l-fg-4)">|</span>
                <a
                  href={FORK_SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-(--l-fg)"
                >
                  → Sharon&apos;s source repo
                </a>
                <span className="text-(--l-fg-4)">|</span>
                <a
                  href={UPSTREAM_SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-(--l-fg)"
                >
                  → Vercel&apos;s upstream original
                </a>
              </div>

              <p className="mt-5 max-w-[760px] text-xs leading-relaxed text-(--l-fg-3)">
                Not affiliated with Vercel. Open Agents is MIT licensed.
                Attribution: vercel-labs/open-agents. Use a test repository when
                evaluating automated branches, commits, and pull requests.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
