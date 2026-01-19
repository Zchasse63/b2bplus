import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FloatingCartButton } from "@/components/FloatingCartButton";
import { SkipLink } from "@/components/SkipLink";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { validateStartup } from "@/lib/startup";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { AuthErrorToast } from "@/components/auth/AuthErrorToast";
import { SessionExpiryWarning } from "@/components/auth/SessionExpiryWarning";
import { AuthLoadingSpinner } from "@/components/auth/AuthLoadingSpinner";
import { SentryProvider } from "@/components/SentryProvider";

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
        <SentryProvider>
          <AuthErrorBoundary>
            <AuthProvider>
              <SkipLink />
              <Header />
              {/* Add padding-bottom on mobile for bottom nav */}
              <main id="main-content" className="flex-1 pb-20 md:pb-0">
                {children}
              </main>
              <Footer />
              <FloatingCartButton />
              <MobileBottomNav />
              <AuthErrorToast />
              <SessionExpiryWarning />
              <AuthLoadingSpinner />
            </AuthProvider>
          </AuthErrorBoundary>
        </SentryProvider>
      </body>
    </html>
  );
}

