import { testUtil } from '@b2b-plus/shared';
import { Card, Button } from '@/components/b2b';
import Link from 'next/link';
import { FiArrowRight, FiPackage, FiTrendingUp, FiUsers, FiCheckCircle } from 'react-icons/fi';

export default function Home() {
  return (
    <div className="min-h-screen bg-b2b-gray-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto mb-16 max-w-4xl animate-fade-in text-center">
          <h1 className="mb-6 text-5xl md:text-6xl font-bold text-b2b-dark">
            B2B+ Platform
          </h1>
          <p className="mb-8 text-xl md:text-2xl text-b2b-gray-500">
            Food Service Disposables Ordering with Container Optimization
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/products">
              <Button variant="primary" size="lg" icon={<FiArrowRight />}>
                Browse Products
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          <Card padding="lg" hover className="group">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-b2b-yellow bg-opacity-10 transition-transform group-hover:scale-110">
              <FiPackage className="h-8 w-8 text-b2b-yellow" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-b2b-dark">
              Smart Ordering
            </h3>
            <p className="text-b2b-gray-500">
              Streamlined ordering process with intelligent product recommendations
            </p>
          </Card>

          <Card padding="lg" hover className="group">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100 transition-transform group-hover:scale-110">
              <FiTrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-b2b-dark">
              Container Optimization
            </h3>
            <p className="text-b2b-gray-500">
              Maximize efficiency with our advanced container optimization system
            </p>
          </Card>

          <Card padding="lg" hover className="group">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-green-100 transition-transform group-hover:scale-110">
              <FiUsers className="h-8 w-8 text-b2b-green" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-b2b-dark">
              Multi-Organization
            </h3>
            <p className="text-b2b-gray-500">
              Manage multiple locations and teams from a single platform
            </p>
          </Card>
        </div>

        {/* Status Card */}
        <Card padding="lg" className="mx-auto max-w-md">
          <h3 className="mb-4 text-center text-xl font-bold text-b2b-dark">
            System Status
          </h3>
          <div className="text-center">
            <p className="mb-2 text-sm text-b2b-gray-500">Monorepo Status:</p>
            <div className="flex items-center justify-center gap-2">
              <FiCheckCircle className="h-6 w-6 text-b2b-green" />
              <p className="text-lg font-semibold text-b2b-green">
                {testUtil()}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
