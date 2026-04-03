import type { Metadata } from "next";
import { calculatorManifest } from "@/features/clinical-calculators/manifests/manifest";
import "./globals.css";

export const metadata: Metadata = {
  title: calculatorManifest.seoTitle,
  description: calculatorManifest.seoDescription,
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
