import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you use the amfire website and when amfire builds, runs or automates something for your business.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="7 November 2026"
      intro={
        <p>
          These terms apply when you use this website and when {site.legalName} (&ldquo;amfire&rdquo;, &ldquo;we&rdquo;), based in {site.location}, works for you. For
          each project, the written proposal you accept sets out the scope, price and timeline. Where a proposal or a signed agreement says something different, the
          proposal or agreement wins.
        </p>
      }
    >
      <section>
        <h2>1. Free conversations and audits</h2>
        <p>
          First conversations and the Lead Response Audit are free and carry no obligation. They are our honest opinion based on what you tell us and
          what we observe; they are not a guarantee of results.
        </p>
      </section>

      <section>
        <h2>2. Proposals and prices</h2>
        <ul>
          <li>Nothing is agreed until you accept a written proposal. Its price is fixed for the scope it describes.</li>
          <li>Work outside that scope is quoted separately, and we don&apos;t start it until you approve it in writing.</li>
          <li>Prices exclude taxes, which are added where the law requires.</li>
        </ul>
      </section>

      <section>
        <h2>3. Paying</h2>
        <ul>
          <li>Projects are paid milestone by milestone. Each milestone is invoiced only after you approve the work.</li>
          <li>Monthly plans are billed monthly in advance, and either side can end them with 30 days&apos; written notice.</li>
          <li>Invoices are due within 7 days unless the proposal says otherwise. We may pause work on overdue accounts after a written reminder.</li>
        </ul>
      </section>

      <section>
        <h2>4. What you own</h2>
        <p>
          Once a project is paid in full, you own what we built for you: the code, designs and content made for your project. We keep the right to reuse our general
          know-how, tools and building blocks that aren&apos;t specific to you. Third-party software and services stay under their own licences, in your name wherever
          possible.
        </p>
      </section>

      <section>
        <h2>5. Confidentiality</h2>
        <p>
          We keep your business information and your customers&apos; data confidential and use it only to do your work. We sign your NDA, or ours, on request. See the{" "}
          <Link href="/privacy">privacy policy</Link> for how we handle personal data.
        </p>
      </section>

      <section>
        <h2>6. After launch</h2>
        <p>
          Changes you ask for in the 30 days after launch are included. After that, we fix bugs in what we built at no cost for 90 days. Problems caused by changes
          made by others, or by outside services changing how they work, are covered under a monthly plan or quoted separately.
        </p>
      </section>

      <section>
        <h2>7. Agencies and white-label partners</h2>
        <p>
          When we build for an agency&apos;s client, the agency is our client. We work under the agency&apos;s brand, never contact its clients without its written
          permission, and both sides agree not to solicit each other&apos;s clients. A separate partner agreement sets out partner pricing and terms.
        </p>
      </section>

      <section>
        <h2>8. Limits</h2>
        <ul>
          <li>
            AI systems can make mistakes. Where a decision matters (money, contracts, anything sent in your name), we design the system so a person approves it, and
            you remain responsible for those decisions.
          </li>
          <li>
            Our total liability for any claim is limited to the amount you paid us in the three months before the claim. We aren&apos;t liable for indirect losses such as
            lost profit or lost business.
          </li>
          <li>Nothing here limits liability that the law doesn&apos;t allow to be limited.</li>
        </ul>
      </section>

      <section>
        <h2>9. Using this website</h2>
        <p>
          Content on this site is for general information. Examples marked illustrative are scenarios, not client work. Please don&apos;t misuse the site, its forms or
          its demos.
        </p>
      </section>

      <section>
        <h2>10. Law and disputes</h2>
        <p>
          These terms are governed by the laws of India. We&apos;ll always try to resolve a disagreement by talking first; if that fails, the courts of Pune,
          Maharashtra have jurisdiction.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> · {site.contactPhone} · {site.location}
        </p>
      </section>
    </LegalPage>
  );
}
