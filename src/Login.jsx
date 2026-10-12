import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const COLORS = {
  bg: "#16181B",
  surface: "#1E2124",
  surfaceRaised: "#262A2E",
  hairline: "#33383D",
  signal: "#5B84B8",
  paper: "#EDE9DE",
  slate: "#9BA1A6",
  rust: "#B1543F",
};

const FONT_DISPLAY = "'Space Grotesk', sans-serif";
const FONT_BODY = "'Inter', sans-serif";

const inputStyle = {
  background: COLORS.surfaceRaised,
  border: `1px solid ${COLORS.hairline}`,
  borderRadius: 3,
  color: COLORS.paper,
  padding: "11px 12px",
  fontSize: 14,
  fontFamily: FONT_BODY,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div
      style={{
        background: COLORS.bg,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: COLORS.paper,
        fontFamily: FONT_BODY,
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.hairline}`,
          borderRadius: 6,
          padding: 34,
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 5,
              background: COLORS.signal,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 14,
              color: "#101216",
            }}
          >
            R
          </div>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: COLORS.paper }}>
              RoutePro
            </div>
            <div style={{ fontSize: 12, color: COLORS.slate }}>Business Central integration</div>
          </div>
        </div>

        <input
          style={inputStyle}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={inputStyle}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div style={{ color: COLORS.rust, fontSize: 13 }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: COLORS.signal,
            color: "#101216",
            border: "none",
            borderRadius: 3,
            padding: "11px 14px",
            fontWeight: 600,
            fontSize: 14,
            fontFamily: FONT_BODY,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            marginTop: 4,
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
