export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left brand panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #2F3567 0%, #1e2248 60%, #141836 100%)" }}>

        {/* Dot grid texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }} />

        {/* Glow orbs */}
        <div className="absolute top-[-80px] right-[-80px] w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,111,63,0.18) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(47,53,103,0.8) 0%, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, #FF6F3F 0%, #e85c2a 100%)" }}>
              <span className="text-white font-bold text-xl tracking-tight">M</span>
            </div>
            <div>
              <p className="font-bold text-[17px] text-white leading-none tracking-tight">MobiGrade</p>
              <p className="text-white/50 text-[11px] mt-0.5 tracking-widest uppercase">Portal</p>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-[3px] rounded-full bg-[#FF6F3F]" />
              <span className="text-white/60 text-[12px] tracking-widest uppercase font-medium">B2B Marketplace</span>
            </div>
            <h2 className="text-[34px] xl:text-[38px] font-bold text-white leading-[1.15] tracking-[-0.02em]">
              India's Trusted<br />Mobile Trade<br />Platform
            </h2>
            <p className="text-white/60 text-[14px] leading-[1.7] max-w-[320px]">
              Buy and sell refurbished phones, spare parts, VRP, and Prexo inventory — all verified, all in one place.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Verified Sellers", value: "2,400+", icon: "👥" },
              { label: "Products Listed", value: "18,000+", icon: "📦" },
              { label: "Monthly Orders", value: "9,500+", icon: "🚚" },
              { label: "Cities Covered", value: "320+", icon: "📍" },
            ].map((stat) => (
              <div key={stat.label}
                className="rounded-2xl p-4 border"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderColor: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(8px)",
                }}>
                <p className="text-[11px] mb-1">{stat.icon}</p>
                <p className="text-[22px] font-bold text-white leading-none tracking-tight">{stat.value}</p>
                <p className="text-white/50 text-[11px] mt-1 leading-none">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {["GST Verified", "KYC Protected", "Instant Payouts"].map((badge) => (
              <span key={badge}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
                style={{
                  color: "rgba(255,255,255,0.7)",
                  borderColor: "rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.06)",
                }}>
                ✓ {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-white/30 text-[12px]">© 2025 MobiGrade Technologies Pvt. Ltd.</p>
        </div>
      </div>

      {/* ── Right form area ── */}
      <div className="flex-1 flex flex-col text-foreground">

        {/* Mobile logo bar */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-8 pb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
            style={{ background: "linear-gradient(135deg, #FF6F3F 0%, #e85c2a 100%)" }}>
            <span className="text-white font-bold text-base">M</span>
          </div>
          <span className="font-bold text-[16px] text-foreground tracking-tight">MobiGrade</span>
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 sm:py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>

        {/* Mobile footer */}
        <div className="lg:hidden pb-6 text-center">
          <p className="text-[11px] text-muted-foreground/60">© 2025 MobiGrade Technologies</p>
        </div>
      </div>

    </div>
  )
}
