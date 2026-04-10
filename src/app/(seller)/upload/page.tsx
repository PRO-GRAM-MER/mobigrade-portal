import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ALL_CATEGORY_SLUGS, getCategoryConfig } from "@/lib/categories";
import PageHeader from "@/components/shared/PageHeader";

export const metadata = { title: "Bulk Upload — MobiGrade Portal" };

export default async function UploadPage() {
  const session = await auth();

  // Gate: KYC must be approved before uploading products
  if (session!.user.verificationStatus !== "KYC_APPROVED") {
    redirect("/profile");
  }

  return (
    <div className="page">
      <PageHeader
        backHref="/dashboard"
        title="Bulk CSV Upload"
        subtitle="Choose a category to upload. Each category has its own CSV format."
      />

      <div className="card-grid">
        {ALL_CATEGORY_SLUGS.map((slug) => {
          const config = getCategoryConfig(slug)!;
          return (
            <div key={slug} className="card">
              <div className="card-header">
                <h3 className="card-title">{config.label}</h3>
              </div>
              <p className="card-description">{config.description}</p>
              <div className="card-footer">
                <span className="card-meta">
                  {config.requiredCsvHeaders.length} required columns
                </span>
                <Link
                  href={`/categories/${slug}/upload`}
                  className="btn btn--primary btn--sm"
                >
                  Upload CSV
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
