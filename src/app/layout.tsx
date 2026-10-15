import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { Providers } from "@/components/layout/Providers";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { siteUrl } from "@/lib/site";
import { fr } from "@/messages/fr";
import "./globals.css";

// next/font self-hosts the fonts at build time: no request to Google at runtime.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute URLs for Open Graph images and links.
  metadataBase: new URL(siteUrl()),
  title: { default: fr.app.name, template: `%s · ${fr.app.name}` },
  description: fr.app.tagline,
  applicationName: fr.app.name,
  // iOS "Add to Home Screen": full screen, espresso status bar, Jaay icon.
  appleWebApp: { capable: true, title: fr.app.name, statusBarStyle: "black-translucent" },
  icons: { apple: [{ url: "/icons/apple-180.png", sizes: "180x180" }] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Lets the bottom tab bar use the iPhone safe area (env(safe-area-inset-bottom)).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F2EF" },
    { media: "(prefers-color-scheme: dark)", color: "#12100E" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: ThemeScript adds `.dark` before React hydrates.
    <html lang="fr" className={`${bricolage.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
