import type { MetadataRoute } from "next";
import { fr } from "@/messages/fr";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: fr.app.name,
    short_name: fr.app.name,
    description: fr.app.tagline,
    lang: "fr",
    // Opens the last used shop (or sign-in) when launched from the home screen.
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#211A15",
    background_color: "#F2F2EF",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
