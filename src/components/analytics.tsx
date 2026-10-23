// Google Analytics on the public website. The setup script is part of the
// server-rendered page, so events fired while the page hydrates (a booked demo,
// say) wait in the queue until gtag.js arrives instead of being lost.

import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
import { LinkTracking } from "./analytics-client";

export function Analytics() {
  if (!GA_MEASUREMENT_ID) return null;
  const setup = `window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',${JSON.stringify(GA_MEASUREMENT_ID)});`;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: setup }} />
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <LinkTracking />
    </>
  );
}
