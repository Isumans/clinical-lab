"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Bell, LogOut, Search } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { getCurrentUser, logout } from "@/services/auth";
import type { AuthUser } from "@/types/auth";

const mainLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "D" },
  { href: "/dashboard/appointments", label: "Appointments", icon: "A" },
  { href: "/dashboard/patients", label: "Patients", icon: "P", patientStaffOnly: true },
  { href: "/dashboard/tests", label: "Test Catalog", icon: "T" },
  { href: "/dashboard/reports", label: "Reports", icon: "R" },
  { href: "/dashboard/settings", label: "Settings", icon: "S", adminOnly: true },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    getCurrentUser().then((currentUser)=>{if(currentUser.must_change_password){router.replace("/change-password");return;}setUser(currentUser);}).catch(() => {
      sessionStorage.removeItem("labsync_access_token");
      router.replace("/login");
    });
  }, [router]);

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const term = globalSearch.trim();
    router.push(term ? `/dashboard/appointments?search=${encodeURIComponent(term)}` : "/dashboard/appointments");
  }

  if (!user) return <main className="dashboard-loading"><span className="page-spinner" />Verifying session...</main>;

  const links = mainLinks.filter((link) => (!link.patientStaffOnly || user.role !== "TECHNICIAN")&&(!link.adminOnly||user.role==="ADMIN"));

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <BrandLogo href="/dashboard" className="dashboard-logo" />
        <div className="dashboard-topbar-actions">
          <form className="dashboard-search" onSubmit={handleSearch} role="search">
            <span className="sr-only">Search</span>
            <input type="search" value={globalSearch} onChange={(event)=>setGlobalSearch(event.target.value)} placeholder="Search appointments" />
            <button type="submit" aria-label="Search appointments"><Search aria-hidden="true" /></button>
          </form>
          <button className="topbar-icon-button" type="button" aria-label="No new notifications" title="No new notifications"><Bell aria-hidden="true" /></button>
          <button className="topbar-icon-button" type="button" onClick={handleLogout} aria-label="Logout"><LogOut aria-hidden="true" /></button>
        </div>
      </header>
      <aside className={`app-sidebar ${menuOpen ? "open" : ""}`}>
        <nav aria-label="Application navigation">
          {links.map((link) => {
            const active = link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href);
            return <Link className={`sidebar-link ${active ? "active" : ""}`} href={link.href} key={link.href} onClick={() => setMenuOpen(false)}><b>{link.icon}</b>{link.label}</Link>;
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip"><span>{user.name.charAt(0).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.role.replaceAll("_", " ")}</small></div></div>
          <button type="button" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <div className="app-workspace">
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation">Menu</button>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
