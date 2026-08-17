"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/services/auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response=await login({ email, password });
      router.replace(response.user.must_change_password?"/change-password":"/");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to log in.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <Label htmlFor="email">Email</Label>
      <Input id="email" name="email" type="email" autoComplete="username" placeholder="name@labsync.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLoading} />
      <Label htmlFor="password">Password</Label>
      <div className="password-field">
        <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLoading} />
        <Button variant="ghost" size="sm" type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</Button>
      </div>
      <Button className="login-button" type="submit" disabled={isLoading}>
        {isLoading ? <span className="button-spinner" aria-hidden="true" /> : null}
        {isLoading ? "Signing in..." : "Login"}
      </Button>
    </form>
  );
}
