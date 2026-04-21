"use client"

import { useTransition } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Wand2, ExternalLink, Send } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ColorInput } from "./ColorInput"
import { ModelSelect } from "./ModelSelect"
import { SpecsInput } from "./SpecsInput"
import { HighlightsInput } from "./HighlightsInput"
import { adminUpdateSparePartSchema, type AdminUpdateSparePartInput, PART_CATEGORIES, QUALITY_GRADES } from "../schemas"
import { adminUpdateSparePartAction, enrichSparePartAction, deploySparePartAction } from "../admin-actions"

type SparePartDetail = {
  id: string
  sellerId: string
  name: string
  category: string
  qualityGrade: string
  price: unknown
  discountedPrice: unknown
  quantity: number
  isGenericColor: boolean
  colors: string[]
  specs: unknown
  shortDescription: string | null
  productDetails: string | null
  highlights: string[]
  includesItems: string[]
  tags: string[]
  slug: string | null
  warrantyDays: number | null
  returnDays: number | null
  weightGrams: number | null
  adminNotes: string | null
  enrichedAt: Date | null
  deployedAt: Date | null
  status: string
  uploadType: string
  createdAt: Date
  updatedAt: Date
  seller: { id: string; firstName: string; lastName: string; email: string; phone: string | null }
  models: { id: string; name: string; brand: { id: string; name: string } }[]
  images: { id: string; url: string; isPrimary: boolean; order: number }[]
}

type BrandWithModels = {
  id: string
  name: string
  type: string
  models: { id: string; name: string }[]
}

const STATUS_OPTIONS = [
  { value: "DRAFT",          label: "Draft" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "ACTIVE",         label: "Active" },
  { value: "REJECTED",       label: "Rejected" },
]

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[13px] text-foreground">
        {value ?? <span className="text-muted-foreground/50 italic">—</span>}
      </p>
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-[13px] font-medium text-foreground/80 tracking-wide">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </span>
  )
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
      <div className="mb-5">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// Inline tag/item editor — same UX as HighlightsInput but for string[]
function StringArrayInput({ values, onChange, placeholder }: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  function add() { onChange([...values, ""]) }
  function update(i: number, v: string) { const a = [...values]; a[i] = v; onChange(a) }
  function remove(i: number) { onChange(values.filter((_, j) => j !== i)) }

  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={v}
            placeholder={placeholder}
            onChange={(e) => update(i, e.target.value)}
            className="text-[13px] h-9"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-muted-foreground hover:text-destructive transition-colors text-[12px] px-2 flex-shrink-0"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-[12px] font-medium text-primary hover:underline"
      >
        + Add item
      </button>
    </div>
  )
}

// Convert DB specs (object or array) → form array
function parseSpecs(raw: unknown): { key: string; value: string }[] {
  if (Array.isArray(raw)) return raw as { key: string; value: string }[]
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
      key,
      value: String(value),
    }))
  }
  return []
}

interface AdminSparePartDetailProps {
  sparePart: SparePartDetail
  brands: BrandWithModels[]
}

export function AdminSparePartDetail({ sparePart, brands }: AdminSparePartDetailProps) {
  const router = useRouter()
  const [isSaving, startSave] = useTransition()
  const [isEnriching, startEnrich] = useTransition()
  const [isDeploying, startDeploy] = useTransition()

  const form = useForm<AdminUpdateSparePartInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(adminUpdateSparePartSchema) as any,
    defaultValues: {
      name: sparePart.name,
      category: sparePart.category as AdminUpdateSparePartInput["category"],
      qualityGrade: sparePart.qualityGrade as AdminUpdateSparePartInput["qualityGrade"],
      modelIds: sparePart.models.map((m) => m.id),
      price: Number(sparePart.price),
      discountedPrice: Number(sparePart.discountedPrice),
      quantity: sparePart.quantity,
      isGenericColor: sparePart.isGenericColor,
      colors: sparePart.colors,
      warrantyDays: sparePart.warrantyDays ?? undefined,
      returnDays: sparePart.returnDays ?? undefined,
      weightGrams: sparePart.weightGrams ?? undefined,
      specs: parseSpecs(sparePart.specs),
      shortDescription: sparePart.shortDescription ?? "",
      productDetails: sparePart.productDetails ?? "",
      highlights: sparePart.highlights,
      includesItems: sparePart.includesItems,
      tags: sparePart.tags,
      slug: sparePart.slug ?? "",
      adminNotes: sparePart.adminNotes ?? "",
      status: sparePart.status as AdminUpdateSparePartInput["status"],
    },
  })

  function onSubmit(data: AdminUpdateSparePartInput) {
    startSave(async () => {
      const result = await adminUpdateSparePartAction(sparePart.id, data)
      if (result.success) toast.success(result.message ?? "Saved")
      else toast.error(result.error ?? "Save failed")
    })
  }

  function handleEnrich() {
    startEnrich(async () => {
      const res = await enrichSparePartAction(sparePart.id, sparePart.sellerId)
      if (res.success) {
        toast.success(res.message ?? "Enriched")
        router.refresh()
      } else {
        toast.error(res.error ?? "Enrichment failed")
      }
    })
  }

  function handleDeploy() {
    startDeploy(async () => {
      const res = await deploySparePartAction(sparePart.id, sparePart.sellerId)
      if (res.success) { toast.success(res.message ?? "Deployed"); router.refresh() }
      else toast.error(res.error ?? "Deploy failed")
    })
  }

  return (
    <div className="space-y-6">

      {/* ── Seller info ─────────────────────────────────────────────────── */}
      <SectionCard title="Seller Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <ReadOnlyField label="First Name"    value={sparePart.seller.firstName} />
          <ReadOnlyField label="Last Name"     value={sparePart.seller.lastName} />
          <ReadOnlyField label="Email Address" value={sparePart.seller.email} />
          <ReadOnlyField label="Phone"         value={sparePart.seller.phone} />
        </div>
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-4 gap-5">
          <ReadOnlyField label="Upload Type"   value={sparePart.uploadType === "CSV" ? "CSV Upload" : "Manual"} />
          <ReadOnlyField label="Submitted"     value={new Date(sparePart.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
          <ReadOnlyField label="Enriched"      value={sparePart.enrichedAt ? new Date(sparePart.enrichedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null} />
          <ReadOnlyField label="Deployed"      value={sparePart.deployedAt ? new Date(sparePart.deployedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null} />
        </div>
      </SectionCard>

      {/* ── Images ──────────────────────────────────────────────────────── */}
      {sparePart.images.length > 0 && (
        <SectionCard title="Product Images">
          <div className="flex flex-wrap gap-3">
            {sparePart.images.map((img) => (
              <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer"
                className="group relative h-24 w-24 rounded-xl border border-border overflow-hidden">
                <img src={img.url} alt="Product" className="w-full h-full object-cover" />
                {img.isPrimary && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">Primary</span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                  <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Editable form ───────────────────────────────────────────────── */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Status + basic */}
          <SectionCard title="Spare Part Details">
            <div className="space-y-5">

              {/* Status */}
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel><FieldLabel required>Status</FieldLabel></FormLabel>
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "PENDING_REVIEW")}>
                    <SelectTrigger className="w-full sm:w-52 h-9">
                      <SelectValue>{STATUS_OPTIONS.find((o) => o.value === field.value)?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} align="start">
                      {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )} />

              {/* Name */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel><FieldLabel required>Spare Part Name</FieldLabel></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )} />

              {/* Category + Quality */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel required>Category</FieldLabel></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9">
                        <SelectValue>{PART_CATEGORIES.find((c) => c.value === field.value)?.label}</SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} align="start">
                        {PART_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="qualityGrade" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel required>Quality Grade</FieldLabel></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9">
                        <SelectValue>{QUALITY_GRADES.find((g) => g.value === field.value)?.label}</SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} align="start" className="min-w-[220px]">
                        {QUALITY_GRADES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )} />
              </div>

              {/* Price row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel required>MRP (₹)</FieldLabel></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">₹</span>
                        <Input className="pl-7" type="number" step="0.01" min="0" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="discountedPrice" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel required>Sale Price (₹)</FieldLabel></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">₹</span>
                        <Input className="pl-7" type="number" step="0.01" min="0" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel required>Quantity</FieldLabel></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input className="pr-16" type="number" min="1" {...field} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">pcs</span>
                      </div>
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )} />
              </div>

              {/* Warranty + Return + Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="warrantyDays" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel>Warranty</FieldLabel></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" min="0" placeholder="0" className="pr-12"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">days</span>
                      </div>
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="returnDays" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel>Return Window</FieldLabel></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" min="0" placeholder="0" className="pr-12"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">days</span>
                      </div>
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="weightGrams" render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel>Shipping Weight</FieldLabel></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" min="0" placeholder="0" className="pr-8"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">g</span>
                      </div>
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )} />
              </div>
            </div>
          </SectionCard>

          {/* Compatible Models */}
          <SectionCard title="Compatible Models">
            <FormField control={form.control} name="modelIds" render={({ field }) => (
              <FormItem>
                <ModelSelect brands={brands} selected={field.value} onChange={field.onChange}
                  error={form.formState.errors.modelIds?.message} />
                <FormMessage className="text-[12px]" />
              </FormItem>
            )} />
          </SectionCard>

          {/* Colors */}
          <SectionCard title="Color">
            <div className="space-y-4">
              <Controller control={form.control} name="isGenericColor" render={({ field }) => (
                <label className="flex items-center gap-3 cursor-pointer w-fit">
                  <div role="checkbox" aria-checked={field.value}
                    onClick={() => { field.onChange(!field.value); if (!field.value) form.setValue("colors", []) }}
                    className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors cursor-pointer ${field.value ? "bg-primary" : "bg-muted border border-border"}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${field.value ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-[13px] font-medium text-foreground select-none">Generic (no specific color)</span>
                </label>
              )} />
              {!form.watch("isGenericColor") && (
                <Controller control={form.control} name="colors" render={({ field }) => (
                  <ColorInput colors={field.value} onChange={field.onChange}
                    error={form.formState.errors.colors?.message} />
                )} />
              )}
            </div>
          </SectionCard>

          {/* Specifications */}
          <SectionCard title="Specifications" subtitle="Key-value pairs shown in the spec table on product page">
            <Controller control={form.control} name="specs" render={({ field }) => (
              <SpecsInput specs={field.value ?? []} onChange={field.onChange} />
            )} />
          </SectionCard>

          {/* E-commerce content */}
          <SectionCard title="E-Commerce Content" subtitle="Content shown on the product listing and detail page">
            <div className="space-y-5">

              {/* Short description */}
              <FormField control={form.control} name="shortDescription" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel><FieldLabel>Short Description</FieldLabel></FormLabel>
                  <p className="text-[11px] text-muted-foreground -mt-1">1–2 lines shown on listing cards. Max 300 characters.</p>
                  <FormControl>
                    <Textarea rows={2} maxLength={300} className="text-[13px] resize-none" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground text-right">{(field.value ?? "").length}/300</p>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )} />

              {/* Product details */}
              <FormField control={form.control} name="productDetails" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel><FieldLabel>Full Product Description</FieldLabel></FormLabel>
                  <p className="text-[11px] text-muted-foreground -mt-1">Long description shown in the product detail page body.</p>
                  <FormControl>
                    <Textarea rows={6} maxLength={2000} className="text-[13px] resize-none" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground text-right">{(field.value ?? "").length}/2000</p>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )} />
            </div>
          </SectionCard>

          {/* Highlights */}
          <SectionCard title="Highlights" subtitle="Bullet points shown at the top of the product page">
            <Controller control={form.control} name="highlights" render={({ field }) => (
              <HighlightsInput highlights={field.value ?? []} onChange={field.onChange} />
            )} />
          </SectionCard>

          {/* What's in the box */}
          <SectionCard title="What's in the Box" subtitle="Items included with the part (e.g. Display unit, Adhesive strip, Tools)">
            <Controller control={form.control} name="includesItems" render={({ field }) => (
              <StringArrayInput values={field.value ?? []} onChange={field.onChange} placeholder="e.g. Display unit" />
            )} />
          </SectionCard>

          {/* Tags */}
          <SectionCard title="Search Tags" subtitle="Keywords for search and filtering on the website">
            <Controller control={form.control} name="tags" render={({ field }) => (
              <StringArrayInput values={field.value ?? []} onChange={field.onChange} placeholder="e.g. iphone screen replacement" />
            )} />
          </SectionCard>

          {/* SEO / Publishing */}
          <SectionCard title="Publishing" subtitle="SEO slug for the product URL on the website">
            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel><FieldLabel>URL Slug</FieldLabel></FormLabel>
                <p className="text-[11px] text-muted-foreground -mt-1">Auto-generated on Enrich. Edit only if needed.</p>
                <FormControl>
                  <Input placeholder="e.g. apple-iphone-15-display-ab1c2d" {...field} value={field.value ?? ""} className="font-mono text-[12px]" />
                </FormControl>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )} />
          </SectionCard>

          {/* Admin Notes */}
          <SectionCard title="Admin Notes" subtitle="Internal only — not visible to sellers or buyers">
            <FormField control={form.control} name="adminNotes" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea rows={3} placeholder="Normalization decisions, review context, issues…"
                    className="text-[13px] resize-none" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )} />
          </SectionCard>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="submit" size="lg" className="sm:min-w-40" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>

            <Button type="button" variant="outline" size="lg" onClick={handleEnrich} disabled={isEnriching}
              className="sm:min-w-40">
              {isEnriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {isEnriching ? "Enriching…" : sparePart.enrichedAt ? "Re-enrich" : "Enrich from Web"}
            </Button>

            <Button type="button" variant="outline" size="lg" onClick={handleDeploy} disabled={isDeploying || !sparePart.enrichedAt}
              title={!sparePart.enrichedAt ? "Enrich first before deploying" : undefined}
              className={`sm:min-w-40 ${sparePart.enrichedAt ? "border-accent/40 text-accent hover:bg-accent/10" : ""}`}>
              {isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isDeploying ? "Deploying…" : sparePart.deployedAt ? "Re-deploy" : "Deploy to Website"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
