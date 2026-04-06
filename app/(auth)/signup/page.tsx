"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserPlus, Mail, Lock, AlertCircle } from "lucide-react";
import campusTitle from "@/src/assets/aex_campus_transparent.webp";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: unknown) {
      console.error("[Signup] Firebase auth error:", err);
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setError("This email is already registered. Try logging in.");
      } else if (code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
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
          <h1 className="text-[2rem] font-semibold tracking-tight">Create account</h1>
          <p className="neo-text-secondary mt-1">Join AI Extension Campus and stay on track</p>
        </div>

        <div className="neo-card p-7 sm:p-8">
          {error && (
            <div role="alert" className="neo-alert mb-4 py-3 px-3.5 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium neo-text-secondary mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none" />
                <input
                  id="signup-email"
                  type="email"
                  placeholder="example@mail.com"
                  className="neo-input neo-auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium neo-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none" />
                <input
                  id="signup-password"
                  type="password"
                  placeholder="Min. 6 characters"
                  className="neo-input neo-auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-confirm" className="block text-sm font-medium neo-text-secondary mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none" />
                <input
                  id="signup-confirm"
                  type="password"
                  placeholder="Re-enter password"
                  className="neo-input neo-auth-input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" className="neo-btn neo-btn-primary w-full h-11 mt-1" disabled={loading}>
              {loading ? <span className="neo-spinner neo-spinner-sm" /> : <UserPlus className="w-4 h-4" />}
              Create Account
            </button>
          </form>

          <div className="my-5 h-px bg-[var(--neo-card-border)]" />

          <Link href="/login" className="neo-btn neo-btn-ghost w-full h-11">
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}
