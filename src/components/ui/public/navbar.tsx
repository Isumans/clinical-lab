import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { label: "Tests", href: "/public#tests" },
  { label: "How it works", href: "/public#how-it-works" },
  { label: "About", href: "/public/about" },
];

function LabSyncLogo() {
  return (
    <span className="flex items-center gap-4" aria-label="LabSync">
      <span className="relative flex size-10 shrink-0 items-center justify-center">
        <span className="absolute left-1 top-1 size-6 rounded-full border-2 border-[#1b2d57]" />
        <span className="absolute right-1 top-1.5 size-6 rounded-full border-2 border-[#44bff2]" />
        <span className="absolute bottom-1 h-4 w-7 rounded-b-full border-x-2 border-b-2 border-[#44bff2]" />
        <span className="absolute bottom-2 text-[6px] font-bold tracking-[0.04em] text-[#1b2d57]">
          LABSYNC
        </span>
      </span>
      <span className="text-[2rem] font-extrabold leading-none tracking-normal md:text-[2.45rem]">
        <span className="text-[#182b59]">Lab</span>
        <span className="text-[#3DBDEC]">Sync</span>
      </span>
    </span>
  );
}

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      {navItems.map((item) => {
        const link = (
          <Link
            key={item.href}
            href={item.href}
            className={
              mobile
                ? "block rounded-md px-3 py-3 text-base font-semibold text-[#273247] transition hover:bg-slate-100 hover:text-[#182b59]"
                : "text-[1.25rem] font-semibold text-[#273247] transition hover:text-[#43bff2]"
            }
          >
            {item.label}
          </Link>
        );

        if (!mobile) {
          return link;
        }

        return (
          <SheetClose asChild key={item.href}>
            {link}
          </SheetClose>
        );
      })}
    </>
  );
}

export function Navbar() {
  return (
    <header className="w-full bg-[#f5f6f8]">
      <div className="mx-auto flex h-20 w-full max-w-[1460px] items-center justify-between px-5 sm:px-8 lg:h-[88px] lg:px-14">
        <Link href="/public" className="shrink-0">
          <LabSyncLogo />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-14 lg:flex"
        >
          <NavLinks />
        </nav>

        <div className="flex items-center gap-3 lg:gap-8">
          <div className="hidden h-9 w-px bg-slate-200 lg:block" />
          <Button
            asChild
            className="h-10 rounded-lg bg-[#071831] px-5 text-base font-bold text-white hover:bg-[#10284f] md:h-11 md:px-6 md:text-lg"
          >
            <Link href="/public/login">Admin Panel</Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-[#182b59] hover:bg-slate-200 lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#f8fafc] p-0">
              <SheetHeader className="border-b border-slate-200 p-5">
                <SheetTitle>
                  <LabSyncLogo />
                </SheetTitle>
              </SheetHeader>
              <nav
                aria-label="Mobile navigation"
                className="flex flex-col gap-1 p-4"
              >
                <NavLinks mobile />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
