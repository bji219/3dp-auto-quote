import { ReactNode } from 'react';

/** Shared header and footer, matching idw3d.com. */
export default function SiteChrome({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="blueprint min-h-screen">
      <div className={'mx-auto px-5 md:px-8 ' + (wide ? 'max-w-[1400px]' : 'max-w-6xl')}>
        <nav className="flex items-center justify-between border-b border-[#C5BFAE] py-5">
          <a
            href="https://idw3d.com"
            className="font-heading text-xl font-bold tracking-tight text-[#0C2030]"
          >
            IDW3D<span className="text-[#B85C38]">.</span>
          </a>
          <div className="flex gap-6 text-xs uppercase tracking-[0.12em] text-[#3A5060]">
            <a href="https://idw3d.com/#products" className="hover:text-[#0C2030]">
              Products
            </a>
            <a href="mailto:hello@idw3d.com" className="hover:text-[#0C2030]">
              Contact
            </a>
          </div>
        </nav>
        <main className="py-10 md:py-14">{children}</main>
        <footer className="flex flex-wrap justify-between gap-3 border-t border-[#C5BFAE] py-6 text-xs text-[#3A5060]">
          <p>© {new Date().getFullYear()} Intelligent Design Works Limited</p>
          <p>
            <a href="/terms" className="underline-offset-2 hover:underline">
              Terms
            </a>
            {' · '}
            <a href="mailto:hello@idw3d.com" className="underline-offset-2 hover:underline">
              hello@idw3d.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
