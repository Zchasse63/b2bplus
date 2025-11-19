import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FloatingCartButton } from "@/components/FloatingCartButton";
import { SkipLink } from "@/components/SkipLink";
import { validateStartup } from "@/lib/startup";
import { AuthProvider } from "@/contexts/AuthContext";

// Validate environment on startup
validateStartup();

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
        <AuthProvider>
          <SkipLink />
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <FloatingCartButton />
        </AuthProvider>
      </body>
    </html>
  );
}
