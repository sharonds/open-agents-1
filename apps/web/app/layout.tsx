import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { getSiteUrlObject } from "@/lib/site-url";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeInitializationScript = `
(() => {
  const storageKey = "open-agents-theme";
  const darkModeMediaQuery = "(prefers-color-scheme: dark)";
  const storedTheme = window.localStorage.getItem(storageKey);

  const theme =
    storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : "system";

  const resolvedTheme =
    theme === "system"
      ? window.matchMedia(darkModeMediaQuery).matches
        ? "dark"
        : "light"
      : theme;

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
})();
`;

const isPreviewDeployment = process.env.VERCEL_ENV === "preview";
const faviconPath = isPreviewDeployment
  ? "/favicon-preview.svg"
  : "/favicon.ico";
const metadataBase = getSiteUrlObject();

const siteDescription =
  "Sharon Sciammas' live Vercel Open Agents deployment: a refined reference AI agent app with documented setup fixes, sandboxed execution, and GitHub PR automation.";
const ogImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Sharon Sciammas' Open Agents deployment for real-world evaluation",
};

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Sharon Sciammas' Open Agents Deployment",
    template: "%s | Sharon Sciammas' Open Agents Deployment",
  },
  description: siteDescription,
  keywords: [
    "Open Agents",
    "Vercel Open Agents",
    "Vercel Sandbox",
    "AI coding agent",
    "GitHub pull request agent",
    "Sharon Sciammas",
  ],
  authors: [{ name: "Sharon Sciammas", url: "https://sharonsciammas.com" }],
  creator: "Sharon Sciammas",
  openGraph: {
    title: "Sharon Sciammas' Vercel Open Agents deployment",
    description: siteDescription,
    type: "website",
    url: "/",
    siteName: "Sharon Sciammas Open Agents",
    images: [ogImage],
  },
  icons: {
    icon: faviconPath,
    shortcut: faviconPath,
  },
  twitter: {
    card: "summary_large_image",
    title: "Sharon Sciammas' Vercel Open Agents deployment",
    description: siteDescription,
    images: [ogImage.url],
  },
  robots: {
    index: !isPreviewDeployment,
    follow: !isPreviewDeployment,
    googleBot: {
      index: !isPreviewDeployment,
      follow: !isPreviewDeployment,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans overflow-x-hidden antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
        />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
