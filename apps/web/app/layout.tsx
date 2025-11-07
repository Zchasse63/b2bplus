import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FloatingCartButton } from "@/components/FloatingCartButton";
import { SkipToContent } from "@/components/ui/AccessibleComponents";

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
      <body className="antialiased flex flex-col min-h-screen">
        <SkipToContent />
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <FloatingCartButton />
        <Toaster />
      </body>
    </html>
  );
}
