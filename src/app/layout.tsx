import type { Metadata, Viewport } from "next";
import { Poppins, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/navigation/AppShell";

const poppins = Poppins({ 
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-poppins"
});

const hankenGrotesk = Hanken_Grotesk({
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-hanken-grotesk"
});

export const metadata: Metadata = {
  title: "Liela",
  description: "La méditation qu'il vous faut, maintenant.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Liela",
  },
};

export const viewport: Viewport = {
  themeColor: "#FDF9F0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${poppins.variable} ${hankenGrotesk.variable}`}>
      <body className="font-sans text-encre bg-creme antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
