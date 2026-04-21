<<<<<<< HEAD
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import Script from "next/script"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/shared/ThemeProvider"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
})

// Runs synchronously in <head> before first paint — sets .dark on <html> from
// localStorage (key: mg-theme) or system preference. No React involvement.
const themeScript = `(function(){try{var t=localStorage.getItem('mg-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

export const metadata: Metadata = {
  title: { default: "MobiGrade Portal", template: "%s | MobiGrade Portal" },
  description: "B2B Mobile Marketplace — Admin & Seller Portal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MobiGrade",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2F3567" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1D2E" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head />
      <body className="min-h-full flex flex-col bg-background" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
=======
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MobiGrade Portal",
  description: "B2B Seller Platform — MobiGrade",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: { fontFamily: "'Poppins', sans-serif", fontSize: "0.875rem" },
          }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
>>>>>>> 607b0b216c834b27ddb27ee7dbf87bdd6a4e98c8
}
