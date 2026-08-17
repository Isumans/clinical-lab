import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandLogo({ href = "/", className }: { href?: string; className?: string }) {
  return <Link href={href} className={cn("brand-lockup", className)} aria-label="LabSync home"><Image src="/labsync-logo.png" alt="" width={52} height={52} priority /><span><strong>Lab</strong><em>Sync</em></span></Link>;
}
