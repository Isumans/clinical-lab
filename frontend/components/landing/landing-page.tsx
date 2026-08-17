"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { getCurrentUser } from "@/services/auth";
import type { AuthUser } from "@/types/auth";

export function LandingPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => sessionStorage.removeItem("labsync_access_token")).finally(() => setChecking(false));
  }, []);

  return (
    <main className="landing-page">
      <header className="landing-header">
        <BrandLogo />
        <nav aria-label="Main navigation"><a href="#services">Tests</a><a href="#workflow">How it works</a><a href="#about">About</a></nav>
        <div className="landing-action">
          {!checking && (user ? <Link className="nav-cta" href="/dashboard">{user.role === "ADMIN" ? "Admin Panel" : "Open Workspace"}</Link> : <Link className="nav-cta" href="/login">Login</Link>)}
        </div>
      </header>
      <section className="landing-hero" id="about">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-pills"><span>LabSync laboratory services</span><span><i /> Precision diagnostics</span></div>
          <h1>Your health,<strong>clearly connected.</strong></h1>
          <p>A reliable laboratory experience backed by synchronized teams, accurate workflows, and secure digital records.</p>
          <div className="test-search" id="services"><span>Search tests after the Test Catalog stage</span><button type="button" disabled>Search Tests</button></div>
          <small id="workflow">Staff members can sign in to manage daily laboratory operations.</small>
        </div>
      </section>
    </main>
  );
}
