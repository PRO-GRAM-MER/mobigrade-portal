import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listDraftsAction, listBatchesAction, type DraftListItem } from "@/actions/catalog-actions";
import CsvUploader from "./CsvUploader";
import ManualEntryForm from "./ManualEntryForm";

// shadcn component suggestions (install as needed):
//   npx shadcn@latest add tabs table badge alert

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const { tab = "products" } = await searchParams;

  // Gate: only KYC-approved sellers can access catalog
  if (session!.user.verificationStatus !== "KYC_APPROVED") {
    redirect("/profile");
  }

  const [draftsResult, batches] = await Promise.all([
    listDraftsAction(1),
    listBatchesAction(),
  ]);

  const drafts = draftsResult.success ? draftsResult.data.drafts : [];
  const total = draftsResult.success ? draftsResult.data.total : 0;

  const TABS = [
    { key: "products", label: "My Products" },
    { key: "upload", label: "Upload CSV" },
    { key: "manual", label: "Add Manually" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--fg]">Spare Parts Catalog</h1>
          <p className="mt-1 text-sm text-[--fg-muted]">
            {total} product{total !== 1 ? "s" : ""} listed
          </p>
        </div>
        <a
          href="/catalog?tab=upload"
          className="rounded-lg bg-[--brand] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Upload CSV
        </a>
      </div>

      {/* Tab bar — shadcn <Tabs> replaces this */}
      <div className="mb-6 flex gap-1 border-b border-[--border]">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={`/catalog?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-[--brand] text-[--brand]"
                : "text-[--fg-muted] hover:text-[--fg]"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* Tab content */}
      {tab === "products" && (
        <DraftsTable drafts={drafts} total={total} batches={batches ?? []} />
      )}
      {tab === "upload" && <CsvUploader />}
      {tab === "manual" && <ManualEntryForm />}
    </div>
  );
}

// ─── DraftsTable ──────────────────────────────────────────────────────────────
// shadcn <Table>, <Badge> ideal here

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  NEEDS_CHANGES: "bg-orange-100 text-orange-700",
};

function DraftsTable({
  drafts,
  total,
  batches,
}: {
  drafts: DraftListItem[];
  total: number;
  batches: NonNullable<Awaited<ReturnType<typeof listBatchesAction>>>;
}) {
  if (drafts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[--border] py-16 text-center">
        <p className="text-sm text-[--fg-muted]">No products yet.</p>
        <p className="mt-1 text-xs text-[--fg-subtle]">
          Upload a CSV or add a product manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recent batches summary */}
      {batches.length > 0 && (
        <div className="rounded-xl border border-[--border] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[--fg]">Recent Uploads</h3>
          <div className="space-y-2">
            {batches.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate text-[--fg]">{b.filename}</span>
                <div className="flex items-center gap-4 text-xs text-[--fg-muted]">
                  <span className="text-green-600">{b.validRows} valid</span>
                  {b.errorRows > 0 && (
                    <span className="text-red-500">{b.errorRows} errors</span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      STATUS_STYLES[b.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {b.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products table — shadcn <Table> replaces <table> */}
      <div className="overflow-x-auto rounded-xl border border-[--border]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[--border] bg-[--bg]">
              {["Brand", "Model", "Part", "Condition", "Price", "Qty", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[--fg-muted]"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => (
              <tr
                key={d.id}
                className="border-b border-[--border] last:border-0 hover:bg-[--bg]"
              >
                <td className="px-4 py-3 font-medium text-[--fg]">{d.brand}</td>
                <td className="px-4 py-3 text-[--fg-muted]">{d.modelName}</td>
                <td className="px-4 py-3 text-[--fg]">{d.partName}</td>
                <td className="px-4 py-3 text-[--fg-muted]">
                  <ConditionBadge condition={d.condition} />
                </td>
                <td className="px-4 py-3 text-[--fg]">₹{d.price}</td>
                <td className="px-4 py-3 text-[--fg-muted]">{d.quantity}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[d.status] ?? ""
                    }`}
                  >
                    {d.status.replace(/_/g, " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[--fg-subtle]">
        Showing {drafts.length} of {total} products
      </p>
    </div>
  );
}

function ConditionBadge({ condition }: { condition: string | null }) {
  const map: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-700",
    OEM: "bg-purple-100 text-purple-700",
    AFTERMARKET: "bg-orange-100 text-orange-700",
    REFURBISHED: "bg-teal-100 text-teal-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${condition ? (map[condition] ?? "") : ""}`}>
      {condition ?? "—"}
    </span>
  );
}
