import type { Metadata, Viewport } from "next";
import { Archivo_Black, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Archivo_Black({ subsets: ["latin"], variable: "--font-display", weight: "400" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Tungston AI",
  description: "A durable, long-context AI chat assistant.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`} style={{ ["--font-body" as string]: "var(--font-mono)" }}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
