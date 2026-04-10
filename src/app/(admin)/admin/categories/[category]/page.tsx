import { auth }              from "@/auth";
import { notFound, redirect } from "next/navigation";
import { getCategoryConfig, ALL_CATEGORY_SLUGS, toClientConfig } from "@/lib/categories";
import type { Metadata } from "next";
import CategoryShell        from "@/app/(seller)/categories/[category]/CategoryShell";
import { listAdminCategoryDraftsAction } from "@/actions/category-actions";
import { prisma } from "@/lib/prisma";

export function generateStaticParams() {
  return ALL_CATEGORY_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) return { title: "Not Found" };
  return { title: `${config.label} — Admin Catalog` };
}

const SLUG_TO_ENUM: Record<string, string> = {
  "spare-parts": "SPARE_PARTS",
  "vrp":         "VRP",
  "new-phones":  "NEW_PHONES",
  "prexo":       "PREXO",
  "open-box":    "OPEN_BOX",
};

export default async function AdminCategoryPage({
  params,
  searchParams,
}: {
  params:       Promise<{ category: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { category } = await params;
  const { status }   = await searchParams;

  const config = getCategoryConfig(category);
  if (!config) notFound();

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/admin/dashboard");

  const draftsResult = await listAdminCategoryDraftsAction(category, status);

  // Collect all upload dates for this category (across all sellers)
  const catEnum = SLUG_TO_ENUM[category];

  const uploadDateRows = catEnum
    ? await prisma.catalogProductDraft.findMany({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where:  { categoryType: catEnum as any },
        select: { createdAt: true },
      })
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadDates: string[] = [
    ...new Set((uploadDateRows as any[]).map((r) => (r.createdAt as Date).toISOString().slice(0, 10))),
  ];

  return (
    <CategoryShell
      config={toClientConfig(config)}
      drafts={draftsResult.success ? draftsResult.data : []}
      uploadDates={uploadDates}
      isAdmin
      backHref="/admin/dashboard"
    />
  );
}
