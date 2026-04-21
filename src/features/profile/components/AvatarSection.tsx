"use client"

import { useRef, useState, useTransition } from "react"
import { Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateAvatarAction } from "../actions"

function getInitials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()
}

interface AvatarSectionProps {
  user: {
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    avatarUrl?: string | null
  }
}

export function AvatarSection({ user }: AvatarSectionProps) {
  const [preview, setPreview] = useState<string | null>(user.avatarUrl ?? null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))

    const fd = new FormData()
    fd.append("avatar", file)

    startTransition(async () => {
      const result = await updateAvatarAction(fd)
      if (result.success) {
        toast.success("Avatar updated")
      } else {
        toast.error(result.error ?? "Upload failed")
        setPreview(user.avatarUrl ?? null)
      }
    })
  }

  const initials = getInitials(user.firstName, user.lastName)

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {/* Avatar with edit button */}
      <div className="relative">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-[24px] font-bold overflow-hidden border-4 border-background shadow-md"
          style={{ background: "oklch(0.28 0.12 265 / 12%)", color: "oklch(0.28 0.12 265)" }}
        >
          {preview
            ? <img src={preview} alt={user.firstName} className="w-full h-full object-cover" />
            : initials
          }
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          aria-label="Change avatar"
          className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center shadow-md hover:bg-accent/90 transition-colors disabled:opacity-60"
        >
          {isPending
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <Camera className="h-3 w-3" />
          }
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Name */}
      <div className="space-y-0.5">
        <p className="text-[16px] font-bold text-foreground leading-tight">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-[13px] text-muted-foreground">{user.email}</p>
        {user.phone && (
          <p className="text-[12px] text-muted-foreground/70">{user.phone}</p>
        )}
      </div>
    </div>
  )
}
