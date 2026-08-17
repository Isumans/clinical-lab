import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="login-page">
      <Link href="/" className="back-home">Back to home</Link>
      <section className="login-card" aria-label="LabSync staff login">
        <div className="brand-panel">
          <div className="brand-copy">
            <span className="eyebrow">Laboratory operations</span>
            <h1>Secure laboratory work, synchronized.</h1>
            <p>One workspace for your reception, laboratory, and administration teams.</p>
          </div>
          <div className="lab-illustration" aria-hidden="true">
            <div className="orb orb-one" /><div className="orb orb-two" />
            <svg viewBox="0 0 360 310" role="presentation">
              <path d="M137 34h86M159 34v76l-68 124c-12 22 4 49 29 49h120c25 0 41-27 29-49l-68-124V34" />
              <path className="liquid" d="M116 216c39-22 87 23 128-7l25 46c7 13-2 28-17 28H108c-15 0-24-16-17-29l25-38Z" />
              <circle cx="149" cy="184" r="8" /><circle cx="205" cy="160" r="6" /><circle cx="187" cy="202" r="5" />
            </svg>
            <span className="status-pill status-pill-top">Protected access</span>
            <span className="status-pill status-pill-bottom"><i /> Systems ready</span>
          </div>
        </div>
        <div className="form-panel">
          <div className="form-wrap">
            <BrandLogo className="login-logo" />
            <div className="form-heading"><span className="eyebrow dark">Staff portal</span><h2>Login to your account</h2><p>Enter your staff credentials to continue.</p></div>
            <LoginForm />
            <p className="access-note">Accounts are created by a LabSync administrator.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
