"use client";

import { useState, useTransition } from "react";
import { useRouter }                from "next/navigation";
import Link                         from "next/link";
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, Rocket,
} from "lucide-react";
import {
  approveDraftAction,
  rejectDraftAction,
  requestChangesDraftAction,
} from "@/actions/review-actions";
import s from "../../admin.module.css";

interface Props {
  draftId:    string;
  status:     string;
  isApproved: boolean;
}

export default function ReviewActions({ draftId, status, isApproved }: Props) {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast]            = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [rejectReason, setRejectReason]   = useState("");
  const [changesReason, setChangesReason] = useState("");

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  function handleApprove() {
    startTransition(async () => {
      const res = await approveDraftAction(draftId);
      if (res.success) {
        showToast("success", "Draft approved.");
        router.refresh();
      } else {
        showToast("error", res.error);
      }
    });
  }

  function handleReject() {
    if (!rejectReason.trim()) { showToast("error", "Rejection reason is required."); return; }
    startTransition(async () => {
      const res = await rejectDraftAction(draftId, rejectReason);
      if (res.success) {
        showToast("success", "Draft rejected.");
        setRejectReason("");
        router.refresh();
      } else {
        showToast("error", res.error);
      }
    });
  }

  function handleRequestChanges() {
    if (!changesReason.trim()) { showToast("error", "Please specify what changes are needed."); return; }
    startTransition(async () => {
      const res = await requestChangesDraftAction(draftId, changesReason);
      if (res.success) {
        showToast("success", "Changes requested.");
        setChangesReason("");
        router.refresh();
      } else {
        showToast("error", res.error);
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Toast */}
      {toast && (
        <div
          className={s.alert}
          style={
            toast.type === "success"
              ? { background: "rgba(0,162,103,0.10)", border: "1px solid rgba(0,162,103,0.25)", color: "#007a50" }
              : { background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626" }
          }
        >
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* ── PENDING: review actions ── */}
      {status === "PENDING_REVIEW" && (
        <div className={s.reviewPanel}>
          <p className={s.reviewPanelTitle}>Review Decision</p>

          <div className={s.reviewActions}>
            {/* Approve */}
            <button
              type="button"
              className={s.btnPrimary}
              onClick={handleApprove}
              disabled={isPending}
            >
              {isPending ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
              Approve
            </button>

            {/* Reject */}
            <div className={s.rejectBlock}>
              <textarea
                className={s.textarea}
                rows={2}
                placeholder="Rejection reason (required)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={isPending}
              />
              <button
                type="button"
                className={s.btnDanger}
                onClick={handleReject}
                disabled={isPending}
              >
                {isPending ? <Loader2 size={14} className="spin" /> : <XCircle size={14} />}
                Reject
              </button>
            </div>

            {/* Request Changes */}
            <div className={s.rejectBlock}>
              <textarea
                className={s.textarea}
                rows={2}
                placeholder="What changes are needed? (required)"
                value={changesReason}
                onChange={(e) => setChangesReason(e.target.value)}
                disabled={isPending}
              />
              <button
                type="button"
                className={s.btnGhost}
                onClick={handleRequestChanges}
                disabled={isPending}
              >
                {isPending ? <Loader2 size={14} className="spin" /> : <AlertCircle size={14} />}
                Request Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVED: publish CTA ── */}
      {isApproved && (
        <div className={s.reviewPanel} style={{ background: "rgba(0,162,103,0.04)", border: "1px solid rgba(0,162,103,0.2)" }}>
          <p className={s.reviewPanelTitle} style={{ color: "#007a50" }}>
            Ready to Publish
          </p>
          <p style={{ fontSize: "0.8375rem", color: "var(--color-muted-foreground)", lineHeight: 1.6 }}>
            This draft has been approved. Add title, description, highlights, and listing price to publish it to the website.
          </p>
          <div>
            <Link
              href={`/admin/publish/${draftId}`}
              className={s.btnPrimary}
              style={{ display: "inline-flex", textDecoration: "none" }}
            >
              <Rocket size={14} />
              Enrich &amp; Publish to Website
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
