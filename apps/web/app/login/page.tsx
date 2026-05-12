"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { authApi } from "../../lib/api";
import { GlassInput } from "../../components/ui/GlassInput";
import { GlassButton } from "../../components/ui/GlassButton";
import { Gem, Mail, Lock, AlertCircle } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9898";
const WS_BASE = BASE.replace(/^http/, "ws");

type Phase = "credentials" | "otp";
type OtpStatus = "idle" | "pending" | "error";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [phase, setPhase] = useState<Phase>("credentials");
  const [otpInput, setOtpInput] = useState("");
  const [otpStatus, setOtpStatus] = useState<OtpStatus>("idle");
  const [otpMessage, setOtpMessage] = useState("");

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const json = await authApi.login(email, password);

      if (json.data.requires2fa) {
        openWebSocket(json.data.pendingToken);
        setPhase("otp");
      } else {
        login(json.data.accessToken, json.data.user, json.data.refreshToken);
        router.replace("/");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function openWebSocket(pendingToken: string) {
    const ws = new WebSocket(`${WS_BASE}/auth/2fa/ws`);
    wsRef.current = ws;
    setOtpStatus("idle");
    setOtpMessage("");

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "authenticate", pendingToken }));
    };

    ws.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === "auth_error") {
        setOtpStatus("error");
        setOtpMessage(msg.message ?? "Session expired. Please log in again.");
        ws.close();
      } else if (msg.type === "otp_valid") {
        login(msg.accessToken, msg.user, msg.refreshToken);
        router.replace("/");
      } else if (msg.type === "otp_invalid") {
        setOtpStatus("error");
        setOtpMessage(msg.message ?? "Invalid or expired code");
        setOtpInput("");
      } else if (msg.type === "otp_resent") {
        setOtpStatus("idle");
        setOtpMessage("A new code has been sent to your email.");
      }
    };

    ws.onerror = () => {
      setOtpStatus("error");
      setOtpMessage("Connection error. Please try again.");
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setOtpStatus("error");
      setOtpMessage("Connection lost. Please go back and log in again.");
      return;
    }
    setOtpStatus("pending");
    setOtpMessage("");
    wsRef.current.send(JSON.stringify({ type: "submit_otp", code: otpInput }));
  }

  function handleResend() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setOtpMessage("Sending…");
      wsRef.current.send(JSON.stringify({ type: "resend_otp" }));
    }
  }

  function handleBack() {
    wsRef.current?.close();
    setPhase("credentials");
    setOtpInput("");
    setOtpStatus("idle");
    setOtpMessage("");
    setError("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top,_rgba(79,156,249,0.16),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(167,139,250,0.14),_transparent_28%),linear-gradient(180deg,_#09111f_0%,_#050b14_100%)]">
      <div className="w-full max-w-sm animate-fade-in-scale">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400/70 to-violet-400/60 shadow-glow-blue">
            <Gem className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white/90">Request Platform</h1>
            <p className="text-sm text-white/45 mt-1">
              {phase === "credentials" ? "Sign in to your workspace" : "Two-step verification"}
            </p>
          </div>
        </div>

        <div className="glass-modal rounded-xl p-7 space-y-5">
          {phase === "credentials" ? (
            <form onSubmit={handleCredentials} className="space-y-4">
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
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <p className="text-sm text-white/60">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-white/85">{email}</span>.
                Enter it below to complete sign in.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
                className="w-full rounded-lg border border-white/[.12] bg-white/[.04] px-3 py-3 text-center text-2xl font-mono tracking-widest text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#4f9cf9]"
              />
              {otpMessage && (
                <p className={`text-sm ${otpStatus === "error" ? "text-[#f87272]" : "text-[#36d399]"}`}>
                  {otpMessage}
                </p>
              )}
              <GlassButton
                type="submit"
                variant="primary"
                size="lg"
                loading={otpStatus === "pending"}
                disabled={otpInput.length !== 6 || otpStatus === "pending"}
                className="w-full"
              >
                {otpStatus === "pending" ? "Verifying…" : "Verify"}
              </GlassButton>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-white/55 hover:text-white/80 underline underline-offset-4"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-white/55 hover:text-white/80"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-[11px] text-white/30">
            Demo: alice@example.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}
