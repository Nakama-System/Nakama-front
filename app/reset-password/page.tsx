"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, KeyRound, CheckCircle2, Link2Off } from "lucide-react";
import "../styles/reset-password.css";

// ═══════════════════════════════════════════════════════════
// PASO 1 — Sin token: pedir email → llama a /forgot-password
// ═══════════════════════════════════════════════════════════
function ForgotForm() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Ingresá tu email."); return; }
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("http://localhost:5000/auth/forgot-password", {  // ← CORRECTO
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Error al enviar el email."); return; }
      setSent(true);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rp-sent">
        <div className="rp-sent__icon-wrap">
          <Mail size={32} strokeWidth={1.5} />
        </div>
        <h1 className="rp-title">Revisá tu email</h1>
        <p className="rp-desc">
          Si <strong>{email}</strong> está registrado en Nakama, vas a recibir
          un enlace para restablecer tu contraseña en los próximos minutos.
        </p>
        <p className="rp-desc rp-desc--muted">No olvides revisar la carpeta de spam.</p>
        <Link href="/login" className="rp-back-btn">
          <ArrowLeft size={15} /> Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="rp-icon-wrap" aria-hidden="true">
        <KeyRound size={28} strokeWidth={1.5} />
      </div>
      <h1 className="rp-title">¿Olvidaste tu contraseña?</h1>
      <p className="rp-desc">
        Ingresá el email de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.
      </p>

      <form className="rp-form" onSubmit={handleSubmit} noValidate>
        <div className="rp-field">
          <label className="rp-label" htmlFor="fp-email">Correo electrónico</label>
          <div className="rp-input-wrapper">
            <span className="rp-input-icon"><Mail size={16} /></span>
            <input
              id="fp-email"
              type="email"
              className={`rp-input rp-input--icon ${error ? "rp-input--error" : ""}`}
              placeholder="tu@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              required
            />
          </div>
          {error && <div className="rp-error" role="alert">{error}</div>}
        </div>

        <button type="submit" className="rp-submit" disabled={loading}>
          {loading ? <span className="rp-spinner" /> : "Enviar enlace de recuperación"}
        </button>
      </form>

      <Link href="/login" className="rp-back-link">
        <ArrowLeft size={14} /> Volver al inicio de sesión
      </Link>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// PASO 2 — Con token: nueva contraseña → llama a /reset-password
// ═══════════════════════════════════════════════════════════
function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");
  const [expired, setExpired]   = useState(false);

  function getStrength(pwd: string): { score: number; label: string; color: string } {
    if (!pwd.length) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8)           score++;
    if (pwd.length >= 12)          score++;
    if (/[A-Z]/.test(pwd))         score++;
    if (/[0-9]/.test(pwd))         score++;
    if (/[^A-Za-z0-9]/.test(pwd))  score++;
    const levels = [
      { label: "Muy débil",  color: "#e63946" },
      { label: "Débil",      color: "#e63946" },
      { label: "Regular",    color: "#ffd166" },
      { label: "Fuerte",     color: "#06d6a0" },
      { label: "Muy fuerte", color: "#4cc9f0" },
    ];
    return { score, ...levels[Math.min(score, levels.length - 1)] };
  }
  const strength = getStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8)  { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== confirm)  { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("http://localhost:5000/auth/reset-password", {  // ← CORRECTO
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { setExpired(true); return; }
        setError(data.message ?? "Error al restablecer la contraseña.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (expired) {
    return (
      <div className="rp-sent">
        <div className="rp-sent__icon-wrap rp-sent__icon-wrap--warn">
          <Link2Off size={28} strokeWidth={1.5} />
        </div>
        <h1 className="rp-title">Enlace expirado</h1>
        <p className="rp-desc">
          Este enlace ya no es válido. Los enlaces de recuperación expiran al cabo de 1 hora.
        </p>
        <Link href="/reset-password" className="rp-submit rp-submit--centered">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rp-sent">
        <div className="rp-sent__icon-wrap rp-sent__icon-wrap--green">
          <CheckCircle2 size={32} strokeWidth={1.5} />
        </div>
        <h1 className="rp-title">¡Contraseña actualizada!</h1>
        <p className="rp-desc">Tu nueva contraseña fue guardada. Ya podés iniciar sesión.</p>
        <Link href="/login" className="rp-submit rp-submit--centered">
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="rp-icon-wrap" aria-hidden="true">
        <Lock size={28} strokeWidth={1.5} />
      </div>
      <h1 className="rp-title">Nueva contraseña</h1>
      <p className="rp-desc">Elegí una contraseña segura para tu cuenta Nakama.</p>

      <form className="rp-form" onSubmit={handleSubmit} noValidate>
        <div className="rp-field">
          <label className="rp-label" htmlFor="rp-password">Nueva contraseña</label>
          <div className="rp-input-wrapper">
            <input
              id="rp-password"
              type={showPass ? "text" : "password"}
              className={`rp-input rp-input--pass ${error ? "rp-input--error" : ""}`}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              required
            />
            <button
              type="button"
              className="rp-eye"
              onClick={() => setShowPass(p => !p)}
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="rp-strength">
              <div className="rp-strength__bar">
                {[1,2,3,4,5].map(i => (
                  <div
                    key={i}
                    className="rp-strength__segment"
                    style={{ background: i <= strength.score ? strength.color : "rgba(255,255,255,0.08)" }}
                  />
                ))}
              </div>
              <span className="rp-strength__label" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
          )}
        </div>

        <div className="rp-field">
          <label className="rp-label" htmlFor="rp-confirm">Confirmar contraseña</label>
          <div className="rp-input-wrapper">
            <input
              id="rp-confirm"
              type="password"
              className={`rp-input rp-input--pass ${error ? "rp-input--error" : ""}`}
              placeholder="Repetí la contraseña"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              required
            />
            {confirm.length > 0 && (
              <span className={`rp-match-icon ${confirm === password ? "rp-match-icon--ok" : "rp-match-icon--err"}`}>
                {confirm === password ? <CheckCircle2 size={15} /> : "✗"}
              </span>
            )}
          </div>
        </div>

        {error && <div className="rp-error" role="alert">{error}</div>}

        <button type="submit" className="rp-submit" disabled={loading}>
          {loading ? <span className="rp-spinner" /> : "Guardar nueva contraseña"}
        </button>
      </form>

      <Link href="/login" className="rp-back-link">
        <ArrowLeft size={14} /> Volver al inicio de sesión
      </Link>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Router: sin token → ForgotForm | con token → ResetForm
// ═══════════════════════════════════════════════════════════
function ResetRouter() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  return token ? <ResetForm token={token} /> : <ForgotForm />;
}

// ═══════════════════════════════════════════════════════════
// Página
// ═══════════════════════════════════════════════════════════
export default function ResetPasswordPage() {
  return (
    <main className="rp-main">
      <div className="rp-bg" aria-hidden="true">
        <div className="rp-bg__grid" />
        <div className="rp-bg__orb rp-bg__orb--1" />
        <div className="rp-bg__orb rp-bg__orb--2" />
      </div>

      <div className="rp-card">
        <Link href="/" className="rp-logo">
          <Image src="/assets/nakama.jpg" alt="Nakama" width={40} height={40} className="rp-logo__img" />
          <span className="rp-logo__text">NAKAMA</span>
        </Link>

        <Suspense fallback={<div className="rp-loading">Cargando...</div>}>
          <ResetRouter />
        </Suspense>
      </div>
    </main>
  );
}