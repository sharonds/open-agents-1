import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
const metadataBase =
  process.env.VERCEL_ENV === "production" &&
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : process.env.VERCEL_URL
      ? new URL(`https://${process.env.VERCEL_URL}`)
      : new URL("https://open-agents.dev");

const siteDescription =
  "Sharon's deployment of Vercel Open Agents: a fork of the reference AI agent app with 4 deployment bugs patched and a deploy guide for builders.";

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Sharon's Open Agents Deployment",
    template: "%s | Sharon's Open Agents Deployment",
  },
  description: siteDescription,
  openGraph: {
    title: "Sharon's deployment of Vercel Open Agents",
    description: siteDescription,
    type: "website",
  },
  icons: {
    icon: faviconPath,
    shortcut: faviconPath,
  },
  twitter: {
    card: "summary_large_image",
    title: "Sharon's deployment of Vercel Open Agents",
    description: siteDescription,
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
