import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, caseStudyJsonLd } from "@/config/structured-data";
import { CASE_STUDIES, caseStudyBySlug } from "@/knowledge/case-studies";
import { CaseStudyView } from "./case-study";

// /work/{slug}: real client case studies only. The old illustrative examples were
// retired on 7 Nov 2026 and their addresses redirect to /work (next.config.ts).
export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const study = caseStudyBySlug(slug);
  return study
    ? {
        title: study.searchTitle ?? `${study.client} case study`,
        description: study.searchDescription ?? study.summary,
        alternates: { canonical: `/work/${slug}` },
      }
    : {};
}

export default async function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const study = caseStudyBySlug(slug);
  if (!study) notFound();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Work", path: "/work" }, { name: study.client, path: `/work/${study.slug}` }])} />
      <JsonLd data={caseStudyJsonLd(study)} />
      <CaseStudyView study={study} />
    </>
  );
}
