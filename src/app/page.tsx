import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            3D Print Quote System
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12">
            Get instant, accurate quotes for your 3D printing projects
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-blue-600 text-4xl mb-4">📤</div>
              <h3 className="text-xl font-semibold mb-2">Upload STL</h3>
              <p className="text-gray-600">
                Simply drag and drop your 3D model file
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-blue-600 text-4xl mb-4">✉️</div>
              <h3 className="text-xl font-semibold mb-2">Verify Email</h3>
              <p className="text-gray-600">
                Quick email verification for security
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-blue-600 text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">Get Quote</h3>
              <p className="text-gray-600">
                Receive detailed pricing instantly
              </p>
            </div>
          </div>

          <Link
            href="/quote"
            className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors shadow-lg"
          >
            Get Started →
          </Link>

          <div className="mt-16 bg-white rounded-lg p-8 shadow-md text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Features</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Support for 7 different materials (PLA, ABS, PETG, TPU, Nylon, Carbon Fiber, Resin)</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Detailed cost breakdown including materials, labor, and shipping</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Real-time 3D model preview with Three.js</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Automatic print time and complexity analysis</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Email verification and session management</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
