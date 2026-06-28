import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kansa Agent — ERC-8004 Registration Auditor",
  description:
    "Audit ERC-8004 agent registration files for completeness, endpoint health, and on-chain activity honesty on Mantle.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-kansa-bg text-zinc-200 antialiased">
        {children}
      </body>
    </html>
  );
}
