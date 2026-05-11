"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";

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
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Login failed");

      if (json.data.requires2fa) {
        openWebSocket(json.data.pendingToken);
        setPhase("otp");
      } else {
        login(json.data.accessToken, json.data.user);
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
        login(msg.accessToken, msg.user);
        if (msg.refreshToken && typeof localStorage !== "undefined") {
          localStorage.setItem("rm_refresh_token", msg.refreshToken);
        }
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Request Platform</h1>
          <p className="text-sm text-slate-500 mt-1">
            {phase === "credentials" ? "Sign in to your account" : "Two-step verification"}
          </p>
        </div>

        {phase === "credentials" ? (
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="alice@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-slate-800">{email}</span>.
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
              className="w-full text-center text-2xl font-mono tracking-widest border-2 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {otpStatus === "error" && (
              <p className="text-sm text-red-600">{otpMessage}</p>
            )}
            {otpStatus === "idle" && otpMessage && (
              <p className="text-sm text-green-600">{otpMessage}</p>
            )}
            <button
              type="submit"
              disabled={otpInput.length !== 6 || otpStatus === "pending"}
              className="w-full bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {otpStatus === "pending" ? "Verifying…" : "Verify"}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleResend}
                className="text-slate-500 hover:text-slate-700 underline"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="text-slate-500 hover:text-slate-700"
              >
                Back to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
