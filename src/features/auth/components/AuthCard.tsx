"use client"

import { motion } from "framer-motion"

interface AuthCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full bg-card rounded-2xl border border-border/60 shadow-sm px-8 py-9"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-foreground leading-[1.2] tracking-[-0.025em]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[14px] text-muted-foreground leading-[1.6]">
            {subtitle}
          </p>
        )}
      </div>

      {/* Form */}
      <div>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="mt-7 pt-6 border-t border-border text-center text-[13px] text-muted-foreground">
          {footer}
        </div>
      )}
    </motion.div>
  )
}
