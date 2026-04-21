"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface KYCConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  isSubmitting: boolean
}

export function KYCConfirmDialog({ open, onConfirm, onCancel, isSubmitting }: KYCConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
          >
            <div className="relative w-full max-w-[440px] bg-card border border-border rounded-2xl shadow-2xl p-6">
              {/* Close */}
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>

              <h2 className="text-[18px] font-bold text-foreground mb-2">
                Review before submitting
              </h2>
              <p className="text-[14px] text-muted-foreground leading-relaxed mb-1">
                Once submitted, your KYC details{" "}
                <span className="font-semibold text-foreground">cannot be edited</span>{" "}
                until an admin reviews and rejects the application.
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
                Please double-check that your Aadhaar number, PAN number, GST number,
                and uploaded documents are correct before proceeding.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Go Back & Review
                </Button>
                <Button
                  variant="accent"
                  className="flex-1"
                  onClick={onConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                    : "Yes, Submit KYC"
                  }
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
