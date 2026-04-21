"use client"

interface PasswordStrengthProps {
  password: string
}

function getStrength(password: string): { score: number; label: string; color: string; textColor: string } {
  if (!password) return { score: 0, label: "", color: "", textColor: "" }

  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: "Too weak", color: "bg-red-500",    textColor: "text-red-500" }
  if (score === 2) return { score, label: "Fair",     color: "bg-amber-400",  textColor: "text-amber-600" }
  if (score === 3) return { score, label: "Good",     color: "bg-blue-500",   textColor: "text-blue-600" }
  return              { score, label: "Strong",    color: "bg-emerald-500", textColor: "text-emerald-600" }
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, color, textColor } = getStrength(password)

  if (!password) return null

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= score ? color : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className={`text-[12px] font-medium ${textColor}`}>{label}</p>
    </div>
  )
}
