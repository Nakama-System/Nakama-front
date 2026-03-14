"use client";

import { useState } from "react";
import Link from "next/link";
import { Swords, Star, MessageCircle, Trophy } from "lucide-react";
import Image from "next/image";
import "../styles/login.css";

// ─── tipos ───────────────────────────────────────────────
type AuthMode = "login" | "register";
type AvatarOption = "default" | "file" | "video" | "gif";

interface LoginForm {
  email: string;
  password: string;
}
interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}
// ─── Google OAuth ────────────────────────────────────────
function handleGoogleAuth() {
  // Redirige al backend Google OAuth
  window.location.href = `https://nakama-vercel-backend.vercel.app/auth/google`;
}

// ═════════════════════════════════════════════════════════
// Componente principal
// ═════════════════════════════════════════════════════════
export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <main className="auth-main">
      {/* Fondo decorativo */}
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg__grid" />
        <div className="auth-bg__orb auth-bg__orb--1" />
        <div className="auth-bg__orb auth-bg__orb--2" />
        <div className="auth-bg__orb auth-bg__orb--3" />
        <div className="auth-bg__scanline" />
      </div>

      {/* Panel de marca — izquierda */}
      <aside className="auth-brand" aria-hidden="true">
        <div className="auth-brand__inner">
          <Link href="/" className="auth-brand__logo">
            <Image
              src="/assets/nakama.jpg"
              alt="Nakama"
              width={52}
              height={52}
              className="auth-brand__logo-img"
              priority
            />
            <span className="auth-brand__logo-text">NAKAMA</span>
          </Link>
          <div className="auth-brand__copy">
            <h2 className="auth-brand__titulo">
              Tu tribu
              <br />
              <span className="auth-brand__titulo-accent">te espera.</span>
            </h2>
            <p className="auth-brand__desc">
              Anime. Gamer. Cultura Geek.
              <br />
              Conectate con miles de otakus.
            </p>
          </div>

          <ul className="auth-brand__features" role="list">
            {[
              {
                icon: <Swords size={16} strokeWidth={1.8} />,
                label: "Salas de interés",
              },
              {
                icon: <Star size={16} strokeWidth={1.8} />,
                label: "Comunidades premium",
              },
              {
                icon: <MessageCircle size={16} strokeWidth={1.8} />,
                label: "Chats personalizados",
              },
              {
                icon: <Trophy size={16} strokeWidth={1.8} />,
                label: "Rangos y roles",
              },
            ].map((f) => (
              <li key={f.label} className="auth-brand__feature">
                <span className="auth-brand__feature-icon">{f.icon}</span>
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
          <div className="auth-brand__decoration">
            <span className="auth-brand__kanji">仲間</span>
          </div>
        </div>
      </aside>

      {/* Panel de formulario — derecha */}
      <section className="auth-panel">
        <div className="auth-panel__inner">
          {/* Tabs */}
          <div
            className="auth-tabs"
            role="tablist"
            aria-label="Modo de autenticación"
          >
            <button
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab ${mode === "login" ? "auth-tab--active" : ""}`}
              onClick={() => setMode("login")}
            >
              Iniciar sesión
            </button>
            <Link
              href="/registro"
              className={`auth-tab ${mode === "register" ? "auth-tab--active" : ""}`}
            >
              Registrarse
            </Link>
            <div
              className={`auth-tabs__indicator ${mode === "register" ? "auth-tabs__indicator--right" : ""}`}
            />
          </div>

          {/* Formularios */}
          <div className="auth-form-wrapper">
            {mode === "login" ? <LoginForm /> : <RegisterForm />}
          </div>
        </div>
      </section>
    </main>
  );
}

// ═════════════════════════════════════════════════════════
// Formulario Login
// ═════════════════════════════════════════════════════════
function LoginForm() {
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const API = "https://nakama-vercel-backend.vercel.app";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Credenciales inválidas.");
        return;
      }

      // Guardar token y redirigir
      localStorage.setItem("nakama_token", data.token);
      if (data.user?.role === "superadmin") {
        window.location.href = "/superadmin";
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form__header">
        <h1 className="auth-form__title">Bienvenido de vuelta</h1>
        <p className="auth-form__subtitle">Ingresá a tu cuenta Nakama</p>
      </div>

      {/* Google */}
      <button type="button" className="btn-google" onClick={handleGoogleAuth}>
        <GoogleIcon />
        <span>Continuar con Google</span>
      </button>

      <div className="auth-divider" role="separator">
        <span />
        <em>o</em>
        <span />
      </div>

      {/* Email */}
      <div className="auth-field">
        <label className="auth-label" htmlFor="login-email">
          Correo electrónico
        </label>
        <div className="auth-input-wrapper">
          <input
            id="login-email"
            type="email"
            className="auth-input"
            placeholder="tu@email.com"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
        </div>
      </div>

      {/* Password */}
      <div className="auth-field">
        <div className="auth-label-row">
          <label className="auth-label" htmlFor="login-password">
            Contraseña
          </label>
          <Link href="/reset-password" className="auth-forgot">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <div className="auth-input-wrapper">
          <input
            id="login-password"
            type={showPass ? "text" : "password"}
            className="auth-input auth-input--pass"
            placeholder="••••••••"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) =>
              setForm((p) => ({ ...p, password: e.target.value }))
            }
            required
          />
          <button
            type="button"
            className="auth-pass-toggle"
            onClick={() => setShowPass((p) => !p)}
            aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPass ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          <span>⚠</span> {error}
        </div>
      )}

      <button type="submit" className="btn-submit" disabled={loading}>
        {loading ? <span className="btn-spinner" /> : "Entrar ahora"}
      </button>
    </form>
  );
}

// ═════════════════════════════════════════════════════════
// Formulario Registro
// ═════════════════════════════════════════════════════════
function RegisterForm() {
  const [form, setForm] = useState<RegisterForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [avatarMode, setAvatarMode] = useState<AvatarOption>("default");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [videoTrimStart] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<RegisterForm & { avatar: string }>
  >({});
  const [showPass, setShowPass] = useState(false);

  const API = "https://nakama-vercel-backend.vercel.app";

  function validate() {
    const e: typeof errors = {};
    if (!form.username.trim())
      e.username = "El nombre de usuario es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email inválido.";
    if (form.password.length < 8) e.password = "Mínimo 8 caracteres.";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Las contraseñas no coinciden.";
    return e;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (avatarMode === "video") {
      if (file.size > 20 * 1024 * 1024) {
        setErrors((p) => ({
          ...p,
          avatar: "El video no puede superar 20 MB.",
        }));
        return;
      }
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      setAvatarFile(file);
    } else if (avatarMode === "gif") {
      if (!file.type.includes("gif")) {
        setErrors((p) => ({ ...p, avatar: "Solo se permiten archivos GIF." }));
        return;
      }
      setAvatarPreview(URL.createObjectURL(file));
      setAvatarFile(file);
    } else {
      setAvatarPreview(URL.createObjectURL(file));
      setAvatarFile(file);
    }
    setErrors((p) => ({ ...p, avatar: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", form.username);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("avatarMode", avatarMode);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
        if (avatarMode === "video") {
          formData.append("trimStart", String(videoTrimStart));
        }
      }

      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors({ email: data.message ?? "Error en el registro." });
        return;
      }

      localStorage.setItem("nakama_token", data.token);
      window.location.href = "/";
    } catch {
      setErrors({ email: "Error de conexión." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="auth-form auth-form--register"
      onSubmit={handleSubmit}
      noValidate
      encType="multipart/form-data"
    >
      <div className="auth-form__header">
        <h1 className="auth-form__title">Crear cuenta</h1>
        <p className="auth-form__subtitle">Unite a la tribu otaku</p>
      </div>

      {/* Google */}
      <button type="button" className="btn-google" onClick={handleGoogleAuth}>
        <GoogleIcon />
        <span>Registrarse con Google</span>
      </button>

      <div className="auth-divider" role="separator">
        <span />
        <em>o</em>
        <span />
      </div>

      {/* Username */}
      <div className="auth-field">
        <label className="auth-label" htmlFor="reg-username">
          Nombre de usuario
        </label>
        <div className="auth-input-wrapper">
          <input
            id="reg-username"
            type="text"
            className={`auth-input ${errors.username ? "auth-input--error" : ""}`}
            placeholder="tu_usuario_otaku"
            autoComplete="username"
            value={form.username}
            onChange={(e) =>
              setForm((p) => ({ ...p, username: e.target.value }))
            }
          />
        </div>
        {errors.username && (
          <span className="auth-field-error">{errors.username}</span>
        )}
      </div>

      {/* Email */}
      <div className="auth-field">
        <label className="auth-label" htmlFor="reg-email">
          Correo electrónico
        </label>
        <div className="auth-input-wrapper">
          <input
            id="reg-email"
            type="email"
            className={`auth-input ${errors.email ? "auth-input--error" : ""}`}
            placeholder="tu@email.com"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
        </div>
        {errors.email && (
          <span className="auth-field-error">{errors.email}</span>
        )}
      </div>

      {/* Password */}
      <div className="auth-field">
        <label className="auth-label" htmlFor="reg-password">
          Contraseña
        </label>
        <div className="auth-input-wrapper">
          <input
            id="reg-password"
            type={showPass ? "text" : "password"}
            className={`auth-input auth-input--pass ${errors.password ? "auth-input--error" : ""}`}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) =>
              setForm((p) => ({ ...p, password: e.target.value }))
            }
          />
          <button
            type="button"
            className="auth-pass-toggle"
            onClick={() => setShowPass((p) => !p)}
            aria-label="Toggle contraseña"
          >
            {showPass ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {errors.password && (
          <span className="auth-field-error">{errors.password}</span>
        )}
      </div>

      {/* Confirm password */}
      <div className="auth-field">
        <label className="auth-label" htmlFor="reg-confirm">
          Confirmar contraseña
        </label>
        <div className="auth-input-wrapper">
          <input
            id="reg-confirm"
            type="password"
            className={`auth-input ${errors.confirmPassword ? "auth-input--error" : ""}`}
            placeholder="Repetí tu contraseña"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm((p) => ({ ...p, confirmPassword: e.target.value }))
            }
          />
        </div>
        {errors.confirmPassword && (
          <span className="auth-field-error">{errors.confirmPassword}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="auth-field">
        <span className="auth-label">Foto / Video de perfil</span>
        <p className="auth-avatar-hint">
          Los user pueden subir 1 video/mes · Pro: 6/mes · Premium: 30/mes
        </p>

        {/* Opciones de avatar */}
        <div
          className="avatar-options"
          role="radiogroup"
          aria-label="Tipo de avatar"
        >
          {(
            [
              { value: "default", label: "Avatar por defecto" },
              { value: "file", label: "Imagen" },
              { value: "video", label: "Video (máx. 1 min, recorte 6 seg)" },
              { value: "gif", label: "GIF animado" },
            ] as { value: AvatarOption; label: string }[]
          ).map((opt) => (
            <label
              key={opt.value}
              className={`avatar-option ${avatarMode === opt.value ? "avatar-option--active" : ""}`}
            >
              <input
                type="radio"
                name="avatarMode"
                value={opt.value}
                checked={avatarMode === opt.value}
                onChange={() => {
                  setAvatarMode(opt.value);
                  setAvatarFile(null);
                  setAvatarPreview("");
                }}
                className="sr-only"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>

        {/* Upload area */}
        {avatarMode !== "default" && (
          <div className="avatar-upload">
            <label className="avatar-upload__zone" htmlFor="avatar-file-input">
              {avatarPreview ? (
                avatarMode === "video" ? (
                  <video
                    src={avatarPreview}
                    className="avatar-upload__preview-video"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="avatar-upload__preview-img"
                  />
                )
              ) : (
                <div className="avatar-upload__placeholder">
                  <span className="avatar-upload__icon">
                    {avatarMode === "video"
                      ? "🎬"
                      : avatarMode === "gif"
                        ? "🎞"
                        : "🖼"}
                  </span>
                  <span className="avatar-upload__text">
                    {avatarMode === "video"
                      ? "Subí un video (máx. 1 min · el perfil usa los primeros 6 seg)"
                      : avatarMode === "gif"
                        ? "Subí un GIF animado"
                        : "Subí una imagen JPG / PNG / WebP"}
                  </span>
                  <span className="avatar-upload__cta">Elegir archivo</span>
                </div>
              )}
            </label>
            <input
              id="avatar-file-input"
              type="file"
              accept={
                avatarMode === "video"
                  ? "video/*"
                  : avatarMode === "gif"
                    ? "image/gif"
                    : "image/jpeg,image/png,image/webp"
              }
              onChange={handleFileChange}
              className="sr-only"
            />
            {avatarPreview && (
              <button
                type="button"
                className="avatar-upload__remove"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview("");
                }}
              >
                Quitar archivo
              </button>
            )}
          </div>
        )}
        {errors.avatar && (
          <span className="auth-field-error">{errors.avatar}</span>
        )}
      </div>

      {/* Rol info */}
      <div className="auth-role-info" aria-label="Información de roles">
        <span className="auth-role-badge auth-role-badge--user">USER</span>
        <p>
          Tu cuenta comienza como <strong>user</strong>. Podés escalar a{" "}
          <em>user-pro</em> o <em>user-premium</em>.
        </p>
      </div>

      <button type="submit" className="btn-submit" disabled={loading}>
        {loading ? <span className="btn-spinner" /> : "Crear cuenta"}
      </button>
    </form>
  );
}

// ─── Íconos inline ────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
