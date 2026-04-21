"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ColorInput } from "./ColorInput"
import { ModelSelect } from "./ModelSelect"
import { SpecsInput } from "./SpecsInput"
import { HighlightsInput } from "./HighlightsInput"
import { sparePartSchema, type SparePartInput, PART_CATEGORIES, QUALITY_GRADES } from "../schemas"
import { createSparePartAction } from "../actions"

interface BrandWithModels {
  id: string
  name: string
  type: string
  models: { id: string; name: string }[]
}

interface SparePartFormProps {
  brands: BrandWithModels[]
}

function SectionCard({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
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

export function SparePartForm({ brands }: SparePartFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<SparePartInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(sparePartSchema) as any,
    defaultValues: {
      name: "",
      category: undefined,
      qualityGrade: undefined,
      modelIds: [],
      price: "" as unknown as number,
      discountedPrice: "" as unknown as number,
      quantity: "" as unknown as number,
      isGenericColor: false,
      colors: [],
      warrantyDays: undefined,
      specs: [],
      productDetails: "",
      highlights: [],
    },
  })

  function onSubmit(data: SparePartInput) {
    startTransition(async () => {
      const result = await createSparePartAction(data)
      if (result.success) {
        toast.success(result.message ?? "Spare part submitted!")
        router.push("/marketplace/spare-parts")
      } else {
        toast.error(result.error ?? "Submission failed")
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Section 1: Basic Info ── */}
        <SectionCard title="Basic Information" description="Core details about the spare part">
          <div className="space-y-5">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel><FieldLabel required>Spare Part Name</FieldLabel></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Back Cover, Screen Protector, Battery" {...field} />
                  </FormControl>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )}
            />

            {/* Category + Quality row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel required>Category</FieldLabel></FormLabel>
                    <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select category">
                          {PART_CATEGORIES.find((c) => c.value === field.value)?.label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} align="start">
                        {PART_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="qualityGrade"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel required>Quality Grade</FieldLabel></FormLabel>
                    <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select grade">
                          {QUALITY_GRADES.find((g) => g.value === field.value)?.label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} align="start" className="min-w-[220px]">
                        {QUALITY_GRADES.map((g) => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* Price row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel required>Price (₹)</FieldLabel></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">₹</span>
                        <Input placeholder="0.00" className="pl-7" type="number" step="0.01" min="0" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discountedPrice"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel required>Discounted Price (₹)</FieldLabel></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">₹</span>
                        <Input placeholder="0.00" className="pl-7" type="number" step="0.01" min="0" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel><FieldLabel required>Quantity</FieldLabel></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input placeholder="0" type="number" min="1" className="pr-16" {...field} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">
                          pieces
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* Warranty */}
            <FormField
              control={form.control}
              name="warrantyDays"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel><FieldLabel>Warranty</FieldLabel></FormLabel>
                  <FormControl>
                    <div className="relative w-full sm:w-48">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="pr-12"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">days</span>
                    </div>
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">Leave blank or 0 for no warranty</p>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )}
            />
          </div>
        </SectionCard>

        {/* ── Section 2: Compatible Models ── */}
        <SectionCard
          title="Compatible Models"
          description="Select all phone models this part fits — across any brand"
        >
          <FormField
            control={form.control}
            name="modelIds"
            render={({ field }) => (
              <FormItem>
                <ModelSelect
                  brands={brands}
                  selected={field.value}
                  onChange={field.onChange}
                  error={form.formState.errors.modelIds?.message}
                />
                <FormMessage className="text-[12px]" />
              </FormItem>
            )}
          />
        </SectionCard>

        {/* ── Section 3: Colors ── */}
        <SectionCard
          title="Color"
          description="Specify available colors, or mark as Generic if color doesn't apply"
        >
          <div className="space-y-4">
            {/* Generic toggle */}
            <Controller
              control={form.control}
              name="isGenericColor"
              render={({ field }) => (
                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                  <div
                    role="checkbox"
                    aria-checked={field.value}
                    onClick={() => {
                      field.onChange(!field.value)
                      if (!field.value) form.setValue("colors", [])
                    }}
                    className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors cursor-pointer
                      ${field.value ? "bg-primary" : "bg-muted border border-border"}
                    `}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150
                        ${field.value ? "translate-x-4" : "translate-x-0.5"}
                      `}
                    />
                  </div>
                  <span className="text-[13px] font-medium text-foreground select-none">
                    Generic (no specific color)
                  </span>
                </label>
              )}
            />

            {!form.watch("isGenericColor") && (
              <Controller
                control={form.control}
                name="colors"
                render={({ field }) => (
                  <ColorInput
                    colors={field.value}
                    onChange={field.onChange}
                    error={form.formState.errors.colors?.message}
                  />
                )}
              />
            )}
          </div>
        </SectionCard>

        {/* ── Section 4: Specs (optional) ── */}
        <SectionCard
          title="Specifications"
          description="Technical specs as key-value pairs (optional)"
        >
          <Controller
            control={form.control}
            name="specs"
            render={({ field }) => (
              <SpecsInput
                specs={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </SectionCard>

        {/* ── Section 5: Product Details (optional) ── */}
        <SectionCard title="Product Details" description="Detailed description of the spare part (optional)">
          <FormField
            control={form.control}
            name="productDetails"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Describe the spare part in detail — material, compatibility notes, installation tips…"
                    rows={5}
                    maxLength={2000}
                    className="text-[13px] resize-none"
                    {...field}
                  />
                </FormControl>
                <p className="text-[11px] text-muted-foreground text-right mt-1">
                  {(field.value ?? "").length}/2000
                </p>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )}
          />
        </SectionCard>

        {/* ── Section 6: Highlights (optional) ── */}
        <SectionCard
          title="Highlights"
          description="Key selling points — shown as bullet points (optional, max 8)"
        >
          <Controller
            control={form.control}
            name="highlights"
            render={({ field }) => (
              <HighlightsInput
                highlights={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </SectionCard>

        {/* ── Submit ── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="submit"
            size="lg"
            className="flex-1 sm:flex-none sm:min-w-48"
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit for Review
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push("/marketplace/spare-parts")}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
