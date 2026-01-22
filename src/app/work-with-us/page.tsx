import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Work With Us - IDW3D',
  description: 'Partner with Intelligent Design Works for your engineering and 3D printing projects',
};

export default function WorkWithUsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Work With Us
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Got a project in mind? Reach out to our team of engineers to start a conversation about making your concepts into reality.
            </p>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
              <h2 className="text-3xl font-bold mb-3">Let&apos;s Build Something Amazing</h2>
              <p className="text-blue-100 text-lg">
                Whether you need 3D printing services, engineering consultation, or custom design work,
                we&apos;re here to help bring your ideas to life.
              </p>
            </div>

            {/* Contact Information */}
            <div className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 mb-10">
                {/* Email Contact */}
                <div className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-100 rounded-full p-3 flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg">Email Us</h3>
                      <a
                        href="mailto:support@idw3d.com"
                        className="text-blue-600 hover:text-blue-700 font-medium text-lg break-all"
                      >
                        support@idw3d.com
                      </a>
                      <p className="text-gray-600 text-sm mt-2">
                        We typically respond within 24 hours
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone Contact */}
                <div className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="bg-green-100 rounded-full p-3 flex-shrink-0">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg">Call Us</h3>
                      <a
                        href="tel:+16102557282"
                        className="text-green-600 hover:text-green-700 font-medium text-lg"
                      >
                        (610) 255-7282
                      </a>
                      <p className="text-gray-600 text-sm mt-2">
                        Monday - Friday, 9am - 5pm EST
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* What We Offer */}
              <div className="border-t border-gray-200 pt-10">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">What We Offer</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">3D Printing Services</h4>
                    <p className="text-gray-600 text-sm">
                      Professional quality prints with fast turnaround times
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Engineering Design</h4>
                    <p className="text-gray-600 text-sm">
                      Custom CAD design and product development services
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Prototyping</h4>
                    <p className="text-gray-600 text-sm">
                      Rapid prototyping to test and refine your concepts
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Section */}
              <div className="mt-10 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Ready to Get Started?</h3>
                <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                  Whether you have detailed specifications or just an initial concept,
                  we&apos;d love to hear about your project and discuss how we can help.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="mailto:support@idw3d.com"
                    className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Us an Email
                  </a>
                  <a
                    href="/quote"
                    className="inline-flex items-center justify-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Get a Quick Quote
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Back to Home Link */}
          <div className="text-center mt-8">
            <a
              href="/"
              className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
