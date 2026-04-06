"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { LogIn, Mail, Lock, AlertCircle } from "lucide-react";
import campusTitle from "@/src/assets/aex_campus_transparent.webp";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: unknown) {
      console.error("[Login] Firebase auth error:", err);
      const code = (err as { code?: string }).code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Invalid email or password. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <Image
            src={campusTitle}
            alt="AI Extension Campus"
            priority
            className="mx-auto h-11 w-auto object-contain mb-4"
          />
          <h1 className="text-[2rem] font-semibold tracking-tight">Welcome back</h1>
          <p className="neo-text-secondary mt-1">Sign in to your AI Extension Campus account</p>
        </div>

        <div className="neo-card p-7 sm:p-8">
          {error && (
            <div role="alert" className="neo-alert mb-4 py-3 px-3.5 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium neo-text-secondary mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 neo-text-muted" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@university.edu"
                  className="neo-input pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium neo-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 neo-text-muted" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="neo-input pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" className="neo-btn neo-btn-primary w-full h-11 mt-1" disabled={loading}>
              {loading ? <span className="neo-spinner neo-spinner-sm" /> : <LogIn className="w-4 h-4" />}
              Sign In
            </button>
          </form>

          <div className="my-5 h-px bg-[var(--neo-card-border)]" />

          <Link href="/signup" className="neo-btn neo-btn-ghost w-full h-11">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
