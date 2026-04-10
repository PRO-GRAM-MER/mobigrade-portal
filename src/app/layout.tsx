import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
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
      </body>
    </html>
  );
}
