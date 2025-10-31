import { testUtil } from '@b2b-plus/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Package, TrendingUp, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50 to-accent-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-6xl font-bold text-secondary-500 mb-6 animate-fade-in">
            B2B+ Platform
          </h1>
          <p className="text-2xl text-neutral-600 mb-8 animate-fade-in">
            Food Service Disposables Ordering with Container Optimization
          </p>
          <div className="flex gap-4 justify-center animate-fade-in">
            <Button asChild size="lg" className="gap-2">
              <Link href="/products">
                Browse Products <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Package className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Smart Ordering</CardTitle>
              <CardDescription>
                Streamlined ordering process with intelligent product recommendations
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Container Optimization</CardTitle>
              <CardDescription>
                Maximize efficiency with our advanced container optimization system
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Multi-Organization</CardTitle>
              <CardDescription>
                Manage multiple locations and teams from a single platform
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Status Card */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Monorepo Status:</p>
              <p className="text-success font-semibold text-lg">{testUtil()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
