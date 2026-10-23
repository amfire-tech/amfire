import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

// One typeface across the platform — the same family as the wordmark.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  metadataBase: new URL(site.url),
  openGraph: { siteName: site.name, images: ["/brand/amfire-logo.png"], locale: "en_IN", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

// Applies the saved or system theme before first paint, so there is no flash.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})()`;

// Applies the visitor's price currency before first paint: their choice from the currency switch,
// or on a first visit rupees in India (by time zone) and US dollars elsewhere. A first-visit guess
// is saved like a choice, so the booking form records the currency the visitor actually saw.
const currencyScript = `(function(){var d=document.documentElement,m=document.cookie.match(/(?:^|; )currency=(INR|USD)(?:;|$)/);if(m){d.dataset.currency=m[1];return}var c='INR';try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(z&&z!=='Asia/Kolkata'&&z!=='Asia/Calcutta')c='USD'}catch(e){}d.dataset.currency=c;document.cookie='currency='+c+'; path=/; max-age=31536000; samesite=lax'})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${poppins.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: currencyScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-page font-sans text-fg">{children}</body>
    </html>
  );
}
