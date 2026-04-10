import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getCategoryConfig, ALL_CATEGORY_SLUGS } from "@/lib/categories";
import type { Metadata } from "next";
import PageHeader from "@/components/shared/PageHeader";

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
  return { title: `Upload ${config.label} CSV — MobiGrade Portal` };
}

export default async function CategoryUploadPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) notFound();

  const session = await auth();
  if (session!.user.verificationStatus !== "KYC_APPROVED") {
    redirect("/profile");
  }

  return (
    <div className="page">
      <PageHeader
        backHref={`/categories/${category}`}
        title={`Upload ${config.label} CSV`}
      />

      {/* CSV format spec */}
      <div className="info-card">
        <h2 className="info-card-title">Required columns ({config.requiredCsvHeaders.length})</h2>
        <div className="chip-group">
          {config.requiredCsvHeaders.map((col) => (
            <code key={col} className="chip chip--required">{col}</code>
          ))}
        </div>
        {config.fields.filter((f) => !f.required && f.csvHeader).length > 0 && (
          <>
            <h3 className="info-card-subtitle">Optional columns</h3>
            <div className="chip-group">
              {config.fields
                .filter((f) => !f.required && f.csvHeader)
                .map((f) => (
                  <code key={f.key} className="chip">{f.csvHeader ?? f.key}</code>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Example CSV row */}
      <div className="info-card">
        <h2 className="info-card-title">Example row</h2>
        <div className="csv-preview">
          <div className="csv-preview-row csv-preview-row--header">
            {Object.keys(config.csvExampleRow).join(",")}
          </div>
          <div className="csv-preview-row">
            {Object.values(config.csvExampleRow).join(",")}
          </div>
        </div>
      </div>

      {/* Upload area — client component placeholder */}
      <div className="upload-zone">
        <div className="upload-zone-inner">
          <span className="upload-icon">↑</span>
          <p className="upload-label">Drag & drop your CSV file here</p>
          <p className="upload-sublabel">or</p>
          <label className="btn btn--primary">
            Choose file
            <input type="file" accept=".csv" className="sr-only" />
          </label>
          <p className="upload-hint">Max 5 MB · UTF-8 encoded · .csv only</p>
        </div>
      </div>

      <p className="form-helper">
        Need a template?{" "}
        <a href="#" className="link">
          Download blank CSV for {config.label}
        </a>
      </p>
    </div>
  );
}
