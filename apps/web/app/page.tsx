import { testUtil } from '@b2b-plus/shared';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          B2B+ Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Food Service Disposables Ordering with Container Optimization
        </p>
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <p className="text-sm text-gray-500 mb-2">Monorepo Status:</p>
          <p className="text-green-600 font-semibold">{testUtil()}</p>
        </div>
      </div>
    </div>
  );
}

