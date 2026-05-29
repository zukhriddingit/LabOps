import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LabOps Guardian — Command Center",
  description: "Protocol-aware lab coworker — 3D demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
