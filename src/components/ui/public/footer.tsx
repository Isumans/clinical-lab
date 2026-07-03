import Link from "next/link";
import { ChevronUp } from "lucide-react";
import { Oswald } from "next/font/google";

import { cn } from "@/lib/utils";

const footerFont = Oswald({
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const primaryLinks = [
  { label: "Home", href: "/public" },
  { label: "Tests", href: "/public#tests" },
  { label: "How it works", href: "/public#how-it-works" },
  { label: "About", href: "/public/about" },
  { label: "Admin", href: "/public/login" },
];

const secondaryLinks = [
  { label: "Contact", href: "/public#contact" },
  { label: "Blog", href: "/public#blog" },
  { label: "Reports", href: "/public#reports" },
  { label: "Support", href: "/public#support" },
];

const socialLinks = [
  { label: "Facebook", text: "f", href: "https://facebook.com" },
  { label: "Pinterest", text: "p", href: "https://pinterest.com" },
  { label: "Instagram", text: "ig", href: "https://instagram.com" },
  { label: "Twitter", text: "x", href: "https://twitter.com" },
];

export function Footer() {
  return (
    <footer
      className={cn(
        footerFont.className,
        "relative w-full border-t border-[#43bff2]/30 bg-[#222322] px-5 py-10 text-white sm:px-8"
      )}
    >
      <Link
        href="#top"
        aria-label="Back to top"
        className="absolute right-6 top-5 hidden size-9 items-center justify-center border border-white/35 bg-white/5 text-white transition hover:border-[#43bff2] hover:text-[#43bff2] sm:flex"
      >
        <ChevronUp className="size-6 stroke-[3]" />
      </Link>

      <div className="mx-auto flex max-w-[960px] flex-col items-center text-center">
        <div className="mb-5 flex items-center justify-center gap-4">
          {socialLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              className="flex size-10 items-center justify-center rounded-full bg-[#3DBDEC] text-sm font-bold uppercase text-[#071831] transition hover:bg-white"
            >
              {item.text}
            </Link>
          ))}
        </div>

        <nav
          aria-label="Footer primary navigation"
          className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-3"
        >
          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:text-[#43bff2]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <nav
          aria-label="Footer secondary navigation"
          className="flex flex-wrap items-center justify-center gap-y-2 text-xs font-normal uppercase tracking-[0.12em] text-white/70"
        >
          {secondaryLinks.map((item, index) => (
            <span key={item.href} className="flex items-center">
              {index > 0 && <span className="mx-3 text-white/35">|</span>}
              <Link href={item.href} className="transition hover:text-[#43bff2]">
                {item.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
