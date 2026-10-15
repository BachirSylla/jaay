import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Sets the `.dark` class on <html> before the first paint, from the saved choice or the OS
 * preference. Inline on purpose: a client component would run after paint and flash.
 */
const script = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
