import type { Metadata } from "next";
import { PageBackground } from "@/components/ui/PageBackground";
import "./globals.css";

/**
 * Resolve the public base URL for absolute metadata URLs (OG images, etc.).
 *
 *   1. NEXT_PUBLIC_SITE_URL — set this in production for a stable canonical URL.
 *   2. VERCEL_URL — auto-set by Vercel for previews and prod.
 *   3. localhost:3000 — dev fallback.
 */
function resolveSiteUrl(): URL {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return new URL(env);
  const vercel = process.env.VERCEL_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: "QuestBoard — Turn invites into tiny RPG quests",
  description:
    "Send friends a playful quest invite. Build your card, share the link, watch them accept the quest.",
  openGraph: {
    title: "QuestBoard — Turn invites into tiny RPG quests",
    description:
      "Send friends a playful quest invite. Build your card, share the link, watch them accept the quest.",
    type: "website",
    images: ["/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "QuestBoard — Turn invites into tiny RPG quests",
    description:
      "Send friends a playful quest invite. Build your card, share the link, watch them accept the quest.",
    images: ["/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Fonts loaded via the browser at runtime — keeps the build offline-friendly. */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <PageBackground />
        {children}
      </body>
    </html>
  );
}
