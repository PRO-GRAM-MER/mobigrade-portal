"use client"

import { useState, useTransition } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { deletePendingCSVUploadsAction } from "../actions"

export function DeletePendingCSVButton() {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm) { setConfirm(true); return }
    startTransition(async () => {
      const res = await deletePendingCSVUploadsAction()
      setConfirm(false)
      if (res.success) {
        toast.success(res.message ?? "Deleted")
      } else {
        toast.error(res.error ?? "Delete failed")
      }
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      onBlur={() => setConfirm(false)}
      className={confirm ? "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}
    >
      {isPending
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <Trash2 className="h-4 w-4" />
      }
      {confirm ? "Confirm delete?" : "Clear CSV Uploads"}
    </Button>
  )
}
