import Quoter from '@/components/Quoter';
import ErrorBoundary from '@/components/ErrorBoundary';
import SiteChrome from '@/components/SiteChrome';

export default function Home() {
  return (
    <SiteChrome>
      <header className="mb-10 max-w-3xl">
        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[#B85C38]">
          Custom 3D printing
        </p>
        <h1 className="font-heading text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          Instant print quote
        </h1>
        <p className="mt-4 max-w-xl text-[#3A5060]">
          Drop in an STL and see a real price, worked out from the geometry: how much plastic, how
          long on the machine, whether it needs supports.
        </p>
      </header>
      <ErrorBoundary>
        <Quoter />
      </ErrorBoundary>
    </SiteChrome>
  );
}
