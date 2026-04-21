"use client"

import { useState, useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  sellerListingSchema, type SellerListingInput,
  COMMON_RAM_OPTIONS, COMMON_STORAGE_OPTIONS, CONDITION_OPTIONS, WARRANTY_TYPE_OPTIONS,
  normalizeColor,
} from "../schemas"
import { createPhoneListingAction } from "../seller-actions"

type BrandOption = { id: string; name: string }
type PhoneOption = { id: string; name: string; variants: VariantOption[] }
type VariantOption = { id: string; ram: number; storage: number; color: string; colorHex: string | null }

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-[13px] font-medium text-foreground/80">
      {children}{required && <span className="text-destructive ml-0.5">*</span>}
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

interface Props {
  brands: BrandOption[]
  defaultCondition?: "SEALED" | "OPEN_BOX"
}

export function PhoneListingForm({ brands, defaultCondition = "SEALED" }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [phones, setPhones]       = useState<PhoneOption[]>([])
  const [loadingPhones, setLoadingPhones] = useState(false)
  const [existingColors, setExistingColors] = useState<string[]>([])

  const form = useForm<SellerListingInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(sellerListingSchema) as any,
    defaultValues: {
      phoneId: "",
      ram: undefined as unknown as number,
      storage: undefined as unknown as number,
      condition: defaultCondition,
      color: "",
      colorHex: "",
      condition: "SEALED",
      price: 0,
      stock: 1,
      sku: "",
      warrantyMonths: undefined,
      warrantyType: "",
    },
  })

  const phoneId = form.watch("phoneId")
  const ram     = form.watch("ram")
  const storage = form.watch("storage")

  // Load phones when brand changes
  useEffect(() => {
    if (!selectedBrandId) { setPhones([]); form.setValue("phoneId", ""); return }
    setLoadingPhones(true)
    fetch(`/api/phones?brandId=${selectedBrandId}`)
      .then(r => r.json())
      .then(data => { setPhones(data); setLoadingPhones(false) })
      .catch(() => setLoadingPhones(false))
  }, [selectedBrandId, form])

  // Show existing colors when RAM + Storage selected
  useEffect(() => {
    if (!phoneId || !ram || !storage) { setExistingColors([]); return }
    const phone = phones.find(p => p.id === phoneId)
    if (!phone) return
    const colors = phone.variants
      .filter(v => v.ram === ram && v.storage === storage)
      .map(v => v.color)
    setExistingColors(colors)
  }, [phoneId, ram, storage, phones])

  function onSubmit(data: SellerListingInput) {
    startTransition(async () => {
      const res = await createPhoneListingAction({ ...data, color: normalizeColor(data.color) })
      if (res.success) { toast.success(res.message ?? "Submitted"); router.push("/marketplace/new-phones") }
      else toast.error(res.error ?? "Failed")
    })
  }

  const selectedPhone = phones.find(p => p.id === phoneId)
  const availableRam = selectedPhone
    ? [...new Set(selectedPhone.variants.map(v => v.ram))].sort((a, b) => a - b)
    : COMMON_RAM_OPTIONS
  const availableStorage = selectedPhone
    ? [...new Set(selectedPhone.variants.filter(v => !ram || v.ram === ram).map(v => v.storage))].sort((a, b) => a - b)
    : COMMON_STORAGE_OPTIONS

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* Step 1: Select Phone */}
        <SectionCard title="Step 1 — Select Phone" subtitle="Choose the brand and exact model from our catalog">
          <div className="space-y-4">
            {/* Brand */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground/80">
                Brand <span className="text-destructive">*</span>
              </label>
              <Select value={selectedBrandId} onValueChange={(v) => {
                setSelectedBrandId(v)
                form.setValue("phoneId", "")
                form.setValue("ram", undefined as unknown as number)
                form.setValue("storage", undefined as unknown as number)
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select brand…" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start" className="min-w-[200px]">
                  {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <FormField control={form.control} name="phoneId" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel><FieldLabel required>Phone Model</FieldLabel></FormLabel>
                <Select value={field.value} onValueChange={(v) => {
                  field.onChange(v)
                  form.setValue("ram", undefined as unknown as number)
                  form.setValue("storage", undefined as unknown as number)
                  form.setValue("color", "")
                }} disabled={!selectedBrandId || loadingPhones}>
                  <SelectTrigger className="h-9">
                    {loadingPhones
                      ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</span>
                      : <SelectValue placeholder="Select phone…" />}
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} align="start" className="min-w-[260px]">
                    {phones.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    {phones.length === 0 && <p className="text-[12px] text-muted-foreground text-center py-4">No phones found for this brand</p>}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )} />
          </div>
        </SectionCard>

        {/* Step 2: Variant */}
        <SectionCard title="Step 2 — Select Variant" subtitle="RAM, storage, and color define this specific unit">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="ram" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel><FieldLabel required>RAM</FieldLabel></FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => { field.onChange(Number(v)); form.setValue("storage", undefined as unknown as number) }}
                    disabled={!phoneId}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select RAM…" /></SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} align="start">
                      {availableRam.map(r => <SelectItem key={r} value={String(r)}>{r} GB</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )} />

              <FormField control={form.control} name="storage" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel><FieldLabel required>Storage</FieldLabel></FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                    disabled={!ram}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select storage…" /></SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} align="start">
                      {availableStorage.map(s => (
                        <SelectItem key={s} value={String(s)}>
                          {s >= 1024 ? `${s / 1024} TB` : `${s} GB`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel><FieldLabel required>Color</FieldLabel></FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input placeholder="e.g. Black Titanium" {...field} />
                      {existingColors.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">Existing:</span>
                          {existingColors.map(c => (
                            <button key={c} type="button" onClick={() => field.onChange(c)}
                              className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                                field.value === c
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                              }`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )} />

              <FormField control={form.control} name="colorHex" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel><FieldLabel>Color Hex (optional)</FieldLabel></FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input placeholder="#2D2926" {...field} value={field.value ?? ""} className="font-mono" />
                      {field.value && /^#[0-9A-Fa-f]{6}$/.test(field.value) && (
                        <div className="h-9 w-9 rounded-lg border border-border flex-shrink-0" style={{ background: field.value }} />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="condition" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel><FieldLabel required>Condition</FieldLabel></FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9 w-full sm:w-52"><SelectValue /></SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} align="start">
                    {CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )} />
          </div>
        </SectionCard>

        {/* Step 3: Pricing */}
        <SectionCard title="Step 3 — Pricing & Stock">
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
            <FormField control={form.control} name="stock" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel><FieldLabel required>Stock</FieldLabel></FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input className="pr-8" type="number" min="1" {...field} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">pcs</span>
                  </div>
                </FormControl>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )} />
            <FormField control={form.control} name="sku" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel><FieldLabel>SKU (optional)</FieldLabel></FormLabel>
                <FormControl><Input placeholder="SKU-001" {...field} value={field.value ?? ""} className="font-mono text-[12px]" /></FormControl>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )} />
          </div>
        </SectionCard>

        {/* Warranty */}
        <SectionCard title="Warranty (optional)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="warrantyMonths" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel><FieldLabel>Warranty Period</FieldLabel></FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type="number" min="0" placeholder="12" className="pr-16"
                      value={field.value ?? ""}
                      onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">months</span>
                  </div>
                </FormControl>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )} />
            <FormField control={form.control} name="warrantyType" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel><FieldLabel>Warranty Type</FieldLabel></FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} align="start">
                    {WARRANTY_TYPE_OPTIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )} />
          </div>
        </SectionCard>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button type="submit" size="lg" className="sm:min-w-40" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Listing
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </Form>
  )
}
