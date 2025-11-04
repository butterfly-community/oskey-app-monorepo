import { useState } from "react";
import { Link } from "react-router";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: "Settings", to: "/settings", type: "internal" as const },
    { label: "Blog", to: "/blog", type: "internal" as const },
    {
      label: "Documentation",
      href: "https://github.com/butterfly-community/oskey-firmware/tree/master/doc/start",
      type: "external" as const,
    },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="text-xl font-semibold tracking-tight text-gray-900">
            OSKey
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-gray-600 sm:flex">
            {navItems.map((item) =>
              item.type === "internal" ? (
                <Link key={item.label} to={item.to} className="transition hover:text-gray-900">
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-gray-900"
                >
                  {item.label}
                </a>
              )
            )}
            <a
              href="https://github.com/butterfly-community/oskey-firmware/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-gray-900 px-4 py-2 text-gray-900 transition hover:bg-gray-900 hover:text-white"
            >
              Firmware
            </a>
          </div>
          <button
            type="button"
            onClick={() => setIsMenuOpen((previous) => !previous)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-900 hover:text-gray-900 sm:hidden"
            aria-label="Toggle navigation"
            aria-expanded={isMenuOpen}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {isMenuOpen ? (
                <path d="M6 6l12 12M18 6l-12 12" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
        {isMenuOpen && (
          <div className="mt-4 flex flex-col gap-4 rounded-[12px] border border-black/10 bg-white/95 p-4 text-sm font-medium text-gray-700 shadow-sm sm:hidden">
            {navItems.map((item) =>
              item.type === "internal" ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="w-full rounded-full bg-gray-100 px-4 py-2 text-gray-800 transition hover:bg-gray-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-full bg-gray-100 px-4 py-2 text-gray-800 transition hover:bg-gray-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              )
            )}
            <a
              href="https://github.com/butterfly-community/oskey-firmware/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-full border border-gray-900 px-4 py-2 text-gray-900 transition hover:bg-gray-900 hover:text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              Firmware
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col gap-6 text-center text-sm text-gray-500 sm:text-base md:flex-row md:items-center md:justify-between md:text-left">
          <div className="space-y-1 text-gray-600">
            <p className="text-base font-semibold text-gray-900">
              © {new Date().getFullYear()} OSKey
            </p>
            <p>Open hardware wallet infrastructure for a trustless future.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-gray-600 md:justify-end md:gap-6">
            <a
              href="https://github.com/butterfly-community/oskey-firmware"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-gray-900"
            >
              GitHub
            </a>
            <a
              href="https://github.com/butterfly-community/oskey-firmware/tree/master/doc/start"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-gray-900"
            >
              Quick Start
            </a>
            <a
              href="https://x.com/OSKeyHW"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-gray-900"
            >
              X
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f5f7]">
      <Header />
      <main className="flex-grow pt-20">{children}</main>
      <Footer />
    </div>
  );
}
