import { testUtil } from '@b2b-plus/shared';
import Card from '@/components/horizon/card';
import Button from '@/components/horizon/button/Button';
import Link from 'next/link';
import { MdArrowForward, MdInventory, MdTrendingUp, MdPeople, MdCheckCircle } from 'react-icons/md';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50 dark:from-navy-900 dark:via-navy-800 dark:to-navy-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto mb-16 max-w-4xl animate-fadeIn text-center">
          <h1 className="mb-6 bg-gradient-to-r from-brand-500 via-purple-600 to-blue-600 bg-clip-text text-6xl font-bold text-transparent">
            B2B+ Platform
          </h1>
          <p className="mb-8 text-2xl text-gray-700 dark:text-gray-300">
            Food Service Disposables Ordering with Container Optimization
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/products">
              <Button variant="primary" size="lg" icon={<MdArrowForward />}>
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
          <Card extra="group p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 transition-transform group-hover:rotate-6">
              <MdInventory className="h-8 w-8 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-navy-700 dark:text-white">
              Smart Ordering
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Streamlined ordering process with intelligent product recommendations
            </p>
          </Card>

          <Card extra="group p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 transition-transform group-hover:rotate-6">
              <MdTrendingUp className="h-8 w-8 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-navy-700 dark:text-white">
              Container Optimization
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Maximize efficiency with our advanced container optimization system
            </p>
          </Card>

          <Card extra="group p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-green-600 transition-transform group-hover:rotate-6">
              <MdPeople className="h-8 w-8 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-navy-700 dark:text-white">
              Multi-Organization
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Manage multiple locations and teams from a single platform
            </p>
          </Card>
        </div>

        {/* Status Card */}
        <Card extra="mx-auto max-w-md p-6">
          <h3 className="mb-4 text-center text-xl font-bold text-navy-700 dark:text-white">
            System Status
          </h3>
          <div className="text-center">
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">Monorepo Status:</p>
            <div className="flex items-center justify-center gap-2">
              <MdCheckCircle className="h-6 w-6 text-green-500" />
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {testUtil()}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
