"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ChevronDown } from "lucide-react";
import { approveKycAction, rejectKycAction } from "@/actions/admin-actions";
import s from "../../admin.module.css";

interface Props {
  kycId: string;
}

export default function KycReviewActions({ kycId }: Props) {
  const router = useRouter();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleApprove() {
    if (approving) return;
    setApproving(true);
    const fd = new FormData();
    fd.append("kycId", kycId);
    await approveKycAction(fd);
    router.push("/admin/kyc-review");
  }

  function handleRejectToggle() {
    setShowReject(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function handleRejectConfirm() {
    if (rejecting || !reason.trim()) return;
    setRejecting(true);
    const fd = new FormData();
    fd.append("kycId", kycId);
    fd.append("reason", reason.trim());
    await rejectKycAction(fd);
    router.push("/admin/kyc-review");
  }

  return (
    <div className={s.reviewPanel}>
      <p className={s.reviewPanelTitle}>Review Decision</p>

      {!showReject ? (
        <div className={s.reviewActions}>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={handleApprove}
            disabled={approving}
          >
            <CheckCircle size={15} />
            {approving ? "Approving…" : "Approve KYC"}
          </button>

          <button
            type="button"
            className={s.btnDanger}
            onClick={handleRejectToggle}
          >
            <XCircle size={15} />
            Reject KYC
            <ChevronDown size={13} />
          </button>
        </div>
      ) : (
        <div className={s.rejectBlock}>
          <textarea
            ref={textareaRef}
            className={s.textarea}
            rows={3}
            placeholder="Reason for rejection (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className={s.reviewActions}>
            <button
              type="button"
              className={s.btnDanger}
              onClick={handleRejectConfirm}
              disabled={rejecting || !reason.trim()}
              style={{ opacity: !reason.trim() ? 0.5 : 1 }}
            >
              <XCircle size={15} />
              {rejecting ? "Rejecting…" : "Confirm Rejection"}
            </button>
            <button
              type="button"
              className={s.btnGhost}
              onClick={() => { setShowReject(false); setReason(""); }}
              disabled={rejecting}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
