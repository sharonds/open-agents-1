"use client";

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

const featureStrip = [
  {
    label: "Durable workflow",
    description: "Multi-step, resumable, persisted state",
  },
  {
    label: "Isolated sandbox",
    description: "The agent can't hurt anything",
  },
  {
    label: "Real PRs",
    description: "Branches, commits, GitHub push, the whole flow",
  },
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
          <div className="mx-auto grid max-w-[1320px] gap-10 px-6 md:grid-cols-[minmax(0,0.92fr)_minmax(380px,1fr)] md:items-end">
            <div className="max-w-[780px] pb-0 md:pb-10">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-(--l-fg-3)">
                Forked from Vercel Labs · 4 bugs patched · April 2026
              </p>
              <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.03] tracking-tighter sm:text-5xl md:text-6xl">
                Sharon&apos;s deployment of Vercel Open Agents
              </h1>
              <p className="mt-4 max-w-[680px] text-pretty text-base leading-relaxed text-(--l-fg-2) sm:mt-6 sm:text-xl">
                I forked Vercel&apos;s reference AI agent app, patched 4
                upstream bugs in my fork, and deployed it end-to-end. An agent
                here can open a real PR on a real repo. Try it, or read how it
                was built.
              </p>

              <div
                ref={heroButtonsRef}
                className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center"
              >
                <SignInButton size="lg" callbackUrl="/sessions" />
                <Button variant="ghost" size="lg" asChild>
                  <a href={DEPLOY_STORY_URL}>Read the deploy story →</a>
                </Button>
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
                <p className="max-w-[760px] text-pretty text-lg leading-relaxed text-(--l-fg-2)">
                  <strong className="font-medium text-(--l-fg)">
                    Open Agents is Vercel&apos;s open-source reference
                    implementation of the autonomous coding agent pattern.
                  </strong>{" "}
                  You chat with an AI. It runs as a durable workflow in an
                  isolated Vercel Sandbox VM. It can clone your GitHub repos,
                  create branches, push commits, and open PRs, all on its own.
                </p>
                <p className="mt-5 max-w-[760px] text-pretty text-base leading-relaxed text-(--l-fg-2)">
                  This instance is my fork. I hit 4 real bugs deploying it. I
                  patched them in my fork, opened the PRs upstream, and
                  published a deploy guide so you don&apos;t hit the same wall.
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
                    <h2 className="mt-5 text-lg font-semibold tracking-tight">
                      {feature.label}
                    </h2>
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
                  What I fixed
                </p>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tighter sm:text-4xl">
                  Four deployment blockers, patched in the fork.
                </h2>
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

        <footer>
          <div className="mx-auto max-w-[1320px] border-t border-(--l-border) px-6 py-8 sm:px-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                  → My fork (source)
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

              <GitHubLink href={FORK_SOURCE_URL} variant="outline" size="sm">
                Source
              </GitHubLink>
            </div>

            <p className="mt-5 max-w-[720px] text-xs leading-relaxed text-(--l-fg-3)">
              Not affiliated with Vercel. MIT licensed. Attribution:
              vercel-labs/open-agents.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
