import { notFound } from "next/navigation";
import { getCategoryConfig, ALL_CATEGORY_SLUGS, toClientConfig } from "@/lib/categories";
import type { Metadata } from "next";
import Link              from "next/link";
import { ArrowLeft }     from "lucide-react";
import PageHeader        from "@/components/shared/PageHeader";
import CategoryCreateForm from "./CategoryCreateForm";
import { getBrandsWithModelsAction } from "@/actions/category-actions";

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
  return { title: `Add ${config.label} — MobiGrade Portal` };
}

export default async function CategoryNewPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) notFound();

  const brandsResult = await getBrandsWithModelsAction();
  const brandsData   = brandsResult.success ? brandsResult.data : [];

  return (
    <div className="page">
      <PageHeader
        backHref={`/categories/${category}`}
        title={`Add ${config.label}`}
        subtitle="All fields marked * are required. Your listing will be sent to admin review."
      />

      <CategoryCreateForm config={toClientConfig(config)} brandsData={brandsData} />
    </div>
  );
}
