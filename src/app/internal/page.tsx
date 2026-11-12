import type { Metadata } from 'next';
import SiteChrome from '@/components/SiteChrome';
import ErrorBoundary from '@/components/ErrorBoundary';
import JobEstimator from '@/components/JobEstimator';

export const metadata: Metadata = {
  title: 'Job estimator | IDW3D shop tools',
  robots: { index: false, follow: false },
};

export default function InternalPage() {
  return (
    <SiteChrome wide>
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#B85C38]">
          Shop tools · not public
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl">
          Job estimator
        </h1>
        <p className="mt-3 max-w-2xl text-[#3A5060]">
          Cost a custom job from first principles: design time, plastic, machine hours, finishing,
          hardware. Drop an STL to fill in the print numbers, or type them in from your slicer.
        </p>
      </header>
      <ErrorBoundary>
        <JobEstimator />
      </ErrorBoundary>
    </SiteChrome>
  );
}
