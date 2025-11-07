'use client';

import { testUtil } from '@b2b-plus/shared';
import { motion } from 'framer-motion';
import { Card, Button, Badge } from '@/components/b2b';
import Link from 'next/link';
import { FiArrowRight, FiPackage, FiTrendingUp, FiUsers, FiCheckCircle, FiShield, FiAward, FiStar } from 'react-icons/fi';
import { LeadCaptureForm } from '@/components/LeadCaptureForm';
import PublicChatbotWidget from '@/components/PublicChatbotWidget';
import { fadeIn, fast } from '@/lib/animations';

export default function Home() {
  return (
    <div className="min-h-screen bg-b2b-gray-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          className="mx-auto mb-16 max-w-4xl text-center"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={fast}
        >
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
        </motion.div>

        {/* Trust Badges */}
        <div className="mb-16 flex flex-wrap justify-center gap-6 items-center">
          <div className="flex items-center gap-2 text-b2b-gray-600">
            <FiShield className="h-5 w-5 text-b2b-green" />
            <span className="text-sm font-medium">SSL Secured</span>
          </div>
          <div className="flex items-center gap-2 text-b2b-gray-600">
            <FiAward className="h-5 w-5 text-b2b-green" />
            <span className="text-sm font-medium">FDA Certified</span>
          </div>
          <div className="flex items-center gap-2 text-b2b-gray-600">
            <FiCheckCircle className="h-5 w-5 text-b2b-green" />
            <span className="text-sm font-medium">ISO 9001 Certified</span>
          </div>
          <div className="flex items-center gap-2 text-b2b-gray-600">
            <FiStar className="h-5 w-5 text-b2b-orange" />
            <span className="text-sm font-medium">4.9/5 Rating</span>
          </div>
        </div>

        {/* Statistics Banner */}
        <div className="mb-16">
          <Card padding="lg" className="bg-gradient-to-r from-b2b-blue-50 to-b2b-green-50">
            <div className="grid gap-8 md:grid-cols-3 text-center">
              <div>
                <p className="text-4xl font-bold text-b2b-blue mb-2">10,000+</p>
                <p className="text-b2b-gray-600">Products Available</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-b2b-blue mb-2">500+</p>
                <p className="text-b2b-gray-600">Trusted Customers</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-b2b-blue mb-2">99.9%</p>
                <p className="text-b2b-gray-600">On-Time Delivery</p>
              </div>
            </div>
          </Card>
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

        {/* Customer Logos */}
        <div className="mb-16">
          <h2 className="text-center text-2xl font-bold text-b2b-text mb-8">
            Trusted by Leading Food Service Providers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-60">
            {/* Placeholder logos - replace with actual customer logos */}
            <div className="text-center">
              <div className="h-16 w-32 bg-b2b-gray-200 rounded flex items-center justify-center">
                <span className="text-b2b-gray-500 font-semibold">Restaurant A</span>
              </div>
            </div>
            <div className="text-center">
              <div className="h-16 w-32 bg-b2b-gray-200 rounded flex items-center justify-center">
                <span className="text-b2b-gray-500 font-semibold">Catering Co</span>
              </div>
            </div>
            <div className="text-center">
              <div className="h-16 w-32 bg-b2b-gray-200 rounded flex items-center justify-center">
                <span className="text-b2b-gray-500 font-semibold">Food Chain</span>
              </div>
            </div>
            <div className="text-center">
              <div className="h-16 w-32 bg-b2b-gray-200 rounded flex items-center justify-center">
                <span className="text-b2b-gray-500 font-semibold">Hospitality</span>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-center text-2xl font-bold text-b2b-text mb-8">
            What Our Customers Say
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card padding="lg" className="bg-white">
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <FiStar key={i} className="h-5 w-5 fill-b2b-orange text-b2b-orange" />
                ))}
              </div>
              <p className="text-b2b-gray-600 mb-4 italic">
                "B2B+ has streamlined our ordering process. The container optimization tool alone has saved us thousands in shipping costs."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-b2b-blue-100 flex items-center justify-center">
                  <span className="text-b2b-blue font-semibold">JD</span>
                </div>
                <div>
                  <p className="font-semibold text-b2b-text">John Doe</p>
                  <p className="text-sm text-b2b-gray-500">Operations Manager</p>
                </div>
              </div>
            </Card>

            <Card padding="lg" className="bg-white">
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <FiStar key={i} className="h-5 w-5 fill-b2b-orange text-b2b-orange" />
                ))}
              </div>
              <p className="text-b2b-gray-600 mb-4 italic">
                "The platform is incredibly user-friendly. We can manage all our locations from one dashboard. Highly recommended!"
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-b2b-green-100 flex items-center justify-center">
                  <span className="text-b2b-green font-semibold">SM</span>
                </div>
                <div>
                  <p className="font-semibold text-b2b-text">Sarah Miller</p>
                  <p className="text-sm text-b2b-gray-500">Procurement Director</p>
                </div>
              </div>
            </Card>

            <Card padding="lg" className="bg-white">
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <FiStar key={i} className="h-5 w-5 fill-b2b-orange text-b2b-orange" />
                ))}
              </div>
              <p className="text-b2b-gray-600 mb-4 italic">
                "Outstanding customer service and product quality. The bulk ordering features have made our operations much more efficient."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-b2b-orange-100 flex items-center justify-center">
                  <span className="text-b2b-orange font-semibold">RJ</span>
                </div>
                <div>
                  <p className="font-semibold text-b2b-text">Robert Johnson</p>
                  <p className="text-sm text-b2b-gray-500">Supply Chain Manager</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Lead Capture CTA Section */}
        <div className="mb-16 bg-gradient-to-br from-b2b-blue to-b2b-blue-dark rounded-2xl p-8 md:p-12 text-white">
          <div className="mx-auto max-w-4xl text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Food Service Ordering?
            </h2>
            <p className="text-lg md:text-xl text-b2b-blue-100">
              Join hundreds of food service businesses that have streamlined their operations with B2B+.
              Get a personalized demo and see how we can help you save time and money.
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <LeadCaptureForm />
          </div>
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

      {/* Public Chatbot Widget */}
      <PublicChatbotWidget />
    </div>
  );
}
