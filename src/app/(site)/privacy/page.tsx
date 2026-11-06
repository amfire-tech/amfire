import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What amfire collects when you visit, book a call or work with us, why, who we share it with and how to have it deleted.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="6 November 2026"
      intro={
        <p>
          This explains what {site.legalName} (&ldquo;amfire&rdquo;, &ldquo;we&rdquo;), based in {site.location}, collects when you visit {site.url.replace(/^https?:\/\//, "")},
          book a call or work with us, and what we do with it. The short version: we collect only what we need to talk to you and do the work, we don&apos;t sell it,
          and you can ask us to delete it at any time.
        </p>
      }
    >
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>What you tell us:</strong> your name, email, phone or WhatsApp number, business name and your answers on our booking form, and anything you write
            to us.
          </li>
          <li>
            <strong>Calls you book:</strong> the time you choose and the notes you add when you book through our calendar.
          </li>
          <li>
            <strong>How you found us:</strong> the site or campaign that brought you (for example a LinkedIn post or an email), the first page you visited and your
            chosen currency, kept in small first-party cookies.
          </li>
          <li>
            <strong>How the site is used:</strong> pages visited and buttons clicked, through Google Analytics, without your name.
          </li>
          <li>
            <strong>If you become a client:</strong> the project information, files, approvals and invoices you share with us in the Client Hub.
          </li>
        </ul>
      </section>

      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To reply to you, arrange the call you asked for and prepare for it.</li>
          <li>To write a proposal, deliver the work and send invoices.</li>
          <li>To understand which pages and campaigns help people, so we can improve them.</li>
          <li>To meet legal, tax and accounting duties.</li>
        </ul>
        <p>
          We use your answers only with your consent, which you give on the booking form, and you can withdraw it at any time. We may use AI tools to summarise
          your answers and draft a first recommendation; a person reviews it before anything is proposed to you.
        </p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>We never sell your information. We share it only with the services that run our business, and only what each one needs:</p>
        <ul>
          <li>Hosting and database (Vercel and Supabase; our database is in Mumbai, India).</li>
          <li>Email delivery (Resend) and our business mailbox (Hostinger).</li>
          <li>Calendar booking (Cal.com) and Google Calendar.</li>
          <li>Website analytics (Google Analytics).</li>
          <li>AI model providers, to summarise answers and draft recommendations.</li>
          <li>Payment providers, when you pay an invoice.</li>
        </ul>
        <p>Some of these services process data outside India. Each is bound by its own data-protection terms.</p>
      </section>

      <section>
        <h2>Your clients&apos; data (for agencies and businesses we build for)</h2>
        <p>
          When we build or run a system for you, your customers&apos; data stays in your accounts or your client&apos;s. We use the access a build needs, keep no copies,
          and hand back every login when the work ends. We sign an NDA or a data-processing agreement on request.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          Enquiries we don&apos;t take forward are deleted within 24 months. Client records and invoices are kept as long as the law requires for tax and accounting,
          usually 8 years in India.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can ask to see the information we hold about you, correct it, or have it deleted, and you can withdraw your consent at any time. This applies under
          India&apos;s Digital Personal Data Protection Act, 2023, and we extend the same rights to visitors from everywhere else. Email{" "}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and we&apos;ll act on it within 30 days.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We use a few first-party cookies to remember your currency and how you found us, and Google Analytics cookies to count visits. We don&apos;t use advertising
          cookies. You can block cookies in your browser; the site still works.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions or complaints about your data go to <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>, {site.location}. See also our{" "}
          <Link href="/terms">terms</Link>. We&apos;ll post any change to this policy on this page with a new date.
        </p>
      </section>
    </LegalPage>
  );
}
