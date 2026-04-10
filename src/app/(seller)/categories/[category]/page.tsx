import { notFound, redirect } from "next/navigation";
import { getCategoryConfig, ALL_CATEGORY_SLUGS, toClientConfig } from "@/lib/categories";
import type { Metadata } from "next";
import CategoryShell     from "./CategoryShell";
import {
  listCategoryDraftsAction,
  getDraftUploadDatesAction,
} from "@/actions/category-actions";

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
  return { title: `${config.label} — MobiGrade Portal` };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  // Spare parts has its own dedicated section — keep backward compat
  if (category === "spare-parts-legacy") redirect("/spare-parts");

  const config = getCategoryConfig(category);
  if (!config) notFound();

  const [draftsResult, datesResult] = await Promise.all([
    listCategoryDraftsAction(category),
    getDraftUploadDatesAction(category),
  ]);

  return (
    <CategoryShell
      config={toClientConfig(config)}
      drafts={draftsResult.success ? draftsResult.data : []}
      uploadDates={datesResult.success ? datesResult.data : []}
      backHref="/dashboard"
    />
  );
}
