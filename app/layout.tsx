import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeelSorted",
  description: "AI-assisted payroll reconciliation for clean journal entries.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({
  children,
}: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
