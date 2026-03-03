import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Force rebuild trigger 2

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Katalog SOP/IK Direktorat Kesiapsiagaan - BASARNAS",
  description: "Sistem Katalog SOP dan IK Direktorat Kesiapsiagaan BASARNAS - Manajemen dokumen Standar Operasional Prosedur dan Instruksi Kerja",
  keywords: ["SOP", "IK", "BASARNAS", "Kesiapsiagaan", "Katalog", "Dokumen", "Standar Operasional Prosedur"],
  authors: [{ name: "BASARNAS" }],
  icons: {
    icon: [
      { url: "https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev/logo.png", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev/logo.png" },
      { url: "/logo.png" },
    ],
  },
  openGraph: {
    title: "Katalog SOP/IK Direktorat Kesiapsiagaan",
    description: "Sistem Katalog SOP dan IK Direktorat Kesiapsiagaan BASARNAS",
    url: "https://basarnas.go.id",
    siteName: "Katalog SOP/IK BASARNAS",
    type: "website",
    images: [
      {
        url: "https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev/logo.png",
        width: 512,
        height: 512,
        alt: "BASARNAS Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Katalog SOP/IK Direktorat Kesiapsiagaan",
    description: "Sistem Katalog SOP dan IK Direktorat Kesiapsiagaan BASARNAS",
    images: ["https://pub-a6302a3a22854799b35a15cd40f9c728.r2.dev/logo.png"],
  },
};

// Running text title component
function RunningTitle() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var title = "Katalog SOP/IK Direktorat Kesiapsiagaan - BASARNAS ";
            var pos = 0;
            function scrollTitle() {
              document.title = title.substring(pos) + title.substring(0, pos);
              pos = (pos + 1) % title.length;
            }
            setInterval(scrollTitle, 300);
          })();
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <RunningTitle />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
