"use client"

import { useRef, useState, useTransition, useEffect } from "react"
import { createPortal } from "react-dom"
import { Upload, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { uploadSparePartsCSVAction, type CSVUploadResult } from "../actions"

function ErrorModal({ result, onClose }: { result: CSVUploadResult; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Upload Failed</p>
              <p className="text-[12px] text-muted-foreground">
                {result.errors.length} error{result.errors.length !== 1 ? "s" : ""} — fix all rows and re-upload
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr>
                <th className="text-left text-[11px] font-medium text-muted-foreground py-2.5 px-6 w-20">Row</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground py-2.5 px-4">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.errors.map((e) => (
                <tr key={e.row} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-6 font-mono text-[12px] text-muted-foreground">{e.row}</td>
                  <td className="py-2.5 px-4 text-destructive">{e.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function CSVUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [errorResult, setErrorResult] = useState<CSVUploadResult | null>(null)

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) { toast.error("Upload a .csv file"); return }
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large — max 10 MB"); return }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      startTransition(async () => {
        setErrorResult(null)
        const res = await uploadSparePartsCSVAction(text)
        if (!res.success) {
          toast.error(res.error ?? "Upload failed")
          return
        }
        const data = res.data!
        if (data.errors.length > 0) {
          setErrorResult(data)
        } else {
          toast.success(`${data.created} part(s) uploaded successfully`)
        }
      })
    }
    reader.readAsText(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {isPending ? "Uploading…" : "Upload CSV"}
      </Button>

      {errorResult && (
        <ErrorModal result={errorResult} onClose={() => setErrorResult(null)} />
      )}
    </>
  )
}
