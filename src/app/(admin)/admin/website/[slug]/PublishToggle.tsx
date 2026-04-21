"use client";

import { useTransition } from "react";
import { useRouter }     from "next/navigation";
import { Loader2 }       from "lucide-react";
import { toggleLiveProductPublishAction } from "@/actions/inventory-actions";
import s from "../../admin.module.css";

interface Props {
  liveProductId: string;
  currentStatus: string;
}

export default function PublishToggle({ liveProductId, currentStatus }: Props) {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await toggleLiveProductPublishAction(liveProductId);
      router.refresh();
    });
  }

  const isPublished = currentStatus === "PUBLISHED";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={isPublished ? s.btnDanger : s.btnPrimary}
      style={{ padding: "5px 12px", fontSize: "0.75rem", gap: 4 }}
    >
      {isPending
        ? <Loader2 size={12} className="spin" />
        : isPublished ? "Unpublish" : "Publish"
      }
    </button>
  );
}
