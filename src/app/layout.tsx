import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Katalog SOP dan IK - BASARNAS",
  description: "Sistem Informasi Dokumen SOP dan IK - Direktorat Kesiapsiagaan Badan Nasional Pencarian dan Pertolongan",
  keywords: ["SOP", "IK", "BASARNAS", "Kesiapsiagaan", "Dokumen", "Search and Rescue"],
  authors: [{ name: "Direktorat Kesiapsiagaan BASARNAS" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Katalog SOP dan IK - BASARNAS",
    description: "Sistem Informasi Dokumen SOP dan IK - Direktorat Kesiapsiagaan",
    url: "https://sop-katalog-basarnas.vercel.app",
    siteName: "Katalog SOP BASARNAS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Katalog SOP dan IK - BASARNAS",
    description: "Sistem Informasi Dokumen SOP dan IK - Direktorat Kesiapsiagaan",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
