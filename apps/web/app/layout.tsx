import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "B2B+ Platform",
  description: "Food service disposables ordering platform with container optimization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

