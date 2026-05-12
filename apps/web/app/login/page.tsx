"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { GlassInput } from "../../components/ui/GlassInput";
import { GlassButton } from "../../components/ui/GlassButton";
import { Gem, Mail, Lock, AlertCircle } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9898";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Login failed");
      login(json.data.accessToken, json.data.user);
      router.replace("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in-scale">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400/70 to-violet-400/60 shadow-glow-blue">
            <Gem className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white/90">Request Platform</h1>
            <p className="text-sm text-white/45 mt-1">Sign in to your workspace</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-modal rounded-xl p-7 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassInput
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@example.com"
              icon={<Mail className="h-4 w-4" />}
            />
            <GlassInput
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
            />

            {error && (
              <div className="flex items-center gap-2 rounded-sm bg-red-400/10 border border-red-400/20 p-3">
                <AlertCircle className="h-4 w-4 text-[#f87272] shrink-0" />
                <p className="text-xs text-[#f87272]">{error}</p>
              </div>
            )}

            <GlassButton
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              Sign in
            </GlassButton>
          </form>

          <p className="text-center text-[11px] text-white/30">
            Demo: alice@example.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}
