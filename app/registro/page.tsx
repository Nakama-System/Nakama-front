"use client";

// ═══════════════════════════════════════════════════════════
// app/registro/page.tsx
// Flujo real del backend:
//   Paso 0 → datos cuenta   (solo frontend, guarda en sessionStorage)
//   Paso 1 → edad & legal   → POST /register/initiate → pendingUserId
//          → código email   → POST /register/verify
//   Paso 2 → avatar         → POST /register/complete
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import "../styles/registro.css";

type Step = 0 | 1 | 2;
type AvatarMode = "default" | "image" | "video" | "gif";

interface AccountForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}
interface Errors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  age?: string;
  terms?: string;
  code?: string;
  avatar?: string;
  global?: string;
}

const API = "http://localhost:5000";

function calcAge(d: string) {
  if (!d) return 0;
  const t = new Date(),
    b = new Date(d);
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}

const TERMS_TEXT = `TÉRMINOS Y CONDICIONES DE USO — NAKAMA
Última actualización: ${new Date().toLocaleDateString("es-AR")}

1. ACEPTACIÓN Y ALCANCE
Al crear una cuenta en Nakama aceptás estos Términos en su totalidad. Regulado por Ley 25.326, Ley 26.904, Ley 27.580.

2. REQUISITOS DE EDAD
2.1 Edad mínima: 13 años.
2.2 Menores de 13: NO pueden registrarse.
2.3 De 13 a 17: Requieren consentimiento del tutor legal.

3. CONDUCTA PROHIBIDA
Queda PROHIBIDO: grooming (Art.131 CP – Ley 26.904), acoso, CSAM, perfiles falsos.
Nakama denuncia automáticamente ante UFI-ANIN.

4. DATOS PERSONALES
Regidos por nuestra Política de Privacidad (Ley 25.326, AAIP).

5. REGISTRO DEL CONSENTIMIENTO
Se registran: IP, timestamp UTC, user agent como prueba legal.

6. JURISDICCIÓN
Tribunales de la Ciudad Autónoma de Buenos Aires.

7. CONTACTO: legal@nakama.ar`;

const PRIVACY_TEXT = `POLÍTICA DE PRIVACIDAD — NAKAMA
Ley 25.326 – Argentina
Última actualización: ${new Date().toLocaleDateString("es-AR")}

1. DATOS QUE RECOPILAMOS
Username, email, fecha de nacimiento, IP, user agent, actividad.

2. FINALIDAD
Prestación del servicio, verificación de edad, prevención de grooming.

3. DERECHOS (Art. 14-16 Ley 25.326)
Acceso, Rectificación, Supresión, Oposición, Portabilidad.
Contacto: privacidad@nakama.ar | AAIP: www.argentina.gob.ar/aaip

4. MENORES
No recopilamos datos de menores de 13. Para 13-17 consiente el tutor.

5. SEGURIDAD
TLS 1.3, acceso por roles, notificación de brechas ≤72hs.

6. CONTACTO DPO: privacidad@nakama.ar`;

// ═════════════════════════════════════════════════════════
export default function RegistroPage() {
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [account, setAccount] = useState<AccountForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  function advanceFromStep0(form: AccountForm) {
    // Guardar en sessionStorage para que el paso 1 pueda llamar a /initiate
    sessionStorage.setItem("nakama_reg_account", JSON.stringify(form));
    setErrors({});
    setStep(1);
  }

  return (
    <main className="reg-main">
      <div className="reg-bg" aria-hidden="true">
        <div className="reg-bg__grid" />
        <div className="reg-bg__orb reg-bg__orb--1" />
        <div className="reg-bg__orb reg-bg__orb--2" />
        <div className="reg-bg__orb reg-bg__orb--3" />
      </div>

      <aside className="reg-brand" aria-hidden="true">
        <div className="reg-brand__inner">
          <Link href="/" className="reg-brand__logo">
            <Image
              src="/assets/nakama.jpg"
              alt="Nakama"
              width={48}
              height={48}
              className="reg-brand__logo-img"
              priority
            />
            <span className="reg-brand__logo-text">NAKAMA</span>
          </Link>
          <div className="reg-brand__copy">
            <h2 className="reg-brand__titulo">
              Unite a la
              <br />
              <span className="reg-brand__accent">tribu otaku.</span>
            </h2>
            <p className="reg-brand__desc">Anime. Gamer. Cultura Geek.</p>
          </div>

          <div className="reg-stepper" role="list">
            {[
              { n: 0, label: "Tu cuenta" },
              { n: 1, label: "Edad & Legal" },
              { n: 2, label: "Tu avatar" },
            ].map((s) => (
              <div
                key={s.n}
                className={`reg-step ${step === s.n ? "reg-step--active" : ""} ${step > s.n ? "reg-step--done" : ""}`}
                role="listitem"
              >
                <div className="reg-step__circle">
                  {step > s.n ? <CheckIcon /> : s.n + 1}
                </div>
                <span className="reg-step__label">{s.label}</span>
                {s.n < 2 && (
                  <span className="reg-step__line" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
          <div className="reg-brand__kanji" aria-hidden="true">
            仲間
          </div>
        </div>
      </aside>

      <section className="reg-panel">
        <div className="reg-panel__inner">
          {step === 0 && (
            <StepAccount
              form={account}
              setForm={setAccount}
              errors={errors}
              setErrors={setErrors}
              onNext={advanceFromStep0}
            />
          )}
          {step === 1 && (
            <StepLegalAndVerify
              email={account.email}
              errors={errors}
              setErrors={setErrors}
              loading={loading}
              setLoading={setLoading}
              onNext={() => {
                setErrors({});
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <StepAvatar
              errors={errors}
              setErrors={setErrors}
              loading={loading}
              setLoading={setLoading}
            />
          )}
        </div>
      </section>
    </main>
  );
}

// ─── PASO 0: Datos de cuenta (solo validación local) ──────
function StepAccount({
  form,
  setForm,
  errors,
  setErrors,
  onNext,
}: {
  form: AccountForm;
  setForm: (f: AccountForm) => void;
  errors: Errors;
  setErrors: (e: Errors) => void;
  onNext: (f: AccountForm) => void;
}) {
  const [showPass, setShowPass] = useState(false);

  function validate() {
    const e: Errors = {};
    if (!form.username.trim() || form.username.length < 3)
      e.username = "Mínimo 3 caracteres.";
    else if (!/^[a-zA-Z0-9_.]+$/.test(form.username))
      e.username = "Solo letras, números, puntos y guiones bajos.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email inválido.";
    if (form.password.length < 8) e.password = "Mínimo 8 caracteres.";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Las contraseñas no coinciden.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="reg-form">
      <div className="reg-form__header">
        <div className="reg-verify-icon">🎌</div>
        <h1 className="reg-form__title">Crear tu cuenta</h1>
        <p className="reg-form__subtitle">Paso 1 de 3 — Tus datos</p>
      </div>

      <div className="reg-field">
        <label className="reg-label" htmlFor="r-username">
          Nombre de usuario <span className="reg-required">*</span>
        </label>
        <div className="auth-input-wrapper">
          <input
            id="r-username"
            type="text"
            autoComplete="username"
            maxLength={30}
            className={`reg-input ${errors.username ? "reg-input--error" : ""}`}
            placeholder="tu_usuario_otaku"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>
        {errors.username ? (
          <span className="reg-field-error">{errors.username}</span>
        ) : (
          <span className="reg-field-hint">
            Letras, números, puntos y guiones bajos.
          </span>
        )}
      </div>

      <div className="reg-field">
        <label className="reg-label" htmlFor="r-email">
          Correo electrónico <span className="reg-required">*</span>
        </label>
        <div className="auth-input-wrapper">
          <input
            id="r-email"
            type="email"
            autoComplete="email"
            className={`reg-input ${errors.email ? "reg-input--error" : ""}`}
            placeholder="tu@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        {errors.email && (
          <span className="reg-field-error">{errors.email}</span>
        )}
      </div>

      <div className="reg-field">
        <label className="reg-label" htmlFor="r-password">
          Contraseña <span className="reg-required">*</span>
        </label>

        <div className="auth-input-wrapper">
          <input
            id="r-password"
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            className={`reg-input auth-input--pass ${errors.password ? "reg-input--error" : ""}`}
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          {/* ESTE botón controla ambos */}
          <button
            type="button"
            className="auth-pass-toggle"
            onClick={() => setShowPass((prev) => !prev)}
            aria-label={showPass ? "Ocultar" : "Mostrar"}
          >
            {showPass ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {errors.password && (
          <span className="reg-field-error">{errors.password}</span>
        )}
      </div>

      <div className="reg-field">
        <label className="reg-label" htmlFor="r-confirm">
          Confirmar contraseña <span className="reg-required">*</span>
        </label>

        <div className="auth-input-wrapper">
          <input
            id="r-confirm"
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            className={`reg-input ${errors.confirmPassword ? "reg-input--error" : ""}`}
            placeholder="Repetí tu contraseña"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
          />
        </div>

        {errors.confirmPassword && (
          <span className="reg-field-error">{errors.confirmPassword}</span>
        )}
      </div>

      <div className="reg-role-info">
        <span className="reg-role-badge">USER</span>
        <p>
          Comenzás como <strong>user</strong>. Podés escalar a <em>user-pro</em>{" "}
          o <em>user-premium</em>.
        </p>
      </div>

      <button
        type="button"
        className="btn-submit"
        onClick={() => {
          if (validate()) onNext(form);
        }}
      >
        Continuar <ArrowIcon />
      </button>

      <p
        style={{
          textAlign: "center",
          marginTop: "16px",
          fontSize: "0.85rem",
          color: "rgba(255,255,255,0.45)",
        }}
      >
        ¿Ya tenés cuenta?{" "}
        <Link
          href="/login"
          style={{ color: "#a78bfa", textDecoration: "none" }}
        >
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}

// ─── PASO 1: Legal + verificación de código ───────────────
function StepLegalAndVerify({
  email,
  errors,
  setErrors,
  loading,
  setLoading,
  onNext,
}: {
  email: string;
  errors: Errors;
  setErrors: (e: Errors) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  onNext: () => void;
}) {
  const [subStep, setSubStep] = useState<"legal" | "code">("legal");
  const [pendingId, setPendingId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [parentalConsent, setParentalConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [antiGroomingAck, setAntiGroomingAck] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
  const [activeModal, setActiveModal] = useState<null | "terms" | "privacy">(
    null,
  );
  const [clientIp, setClientIp] = useState("unknown");
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const age = calcAge(birthDate);
  const isMinor = age >= 13 && age < 18;
  const isAdult = age >= 18;

  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d) => setClientIp(d.ip ?? "unknown"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  function validateLegal() {
    const e: Errors = {};
    if (!birthDate) e.age = "Ingresá tu fecha de nacimiento.";
    else if (age < 13) e.age = "Debés tener al menos 13 años.";
    else if (age > 120) e.age = "Fecha inválida.";
    if (isMinor && !parentalConsent)
      e.terms = "Necesitás autorización de un adulto responsable. ";
    if (!termsAccepted)
      e.terms = (e.terms ?? "") + "Debés aceptar los Términos. ";
    if (!privacyAccepted)
      e.terms = (e.terms ?? "") + "Debés aceptar la Política de Privacidad. ";
    if (!antiGroomingAck)
      e.terms = (e.terms ?? "") + "Debés reconocer la política anti-grooming.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleInitiate() {
    if (!validateLegal()) return;
    const raw = sessionStorage.getItem("nakama_reg_account");
    if (!raw) {
      setErrors({
        global: "Datos de cuenta perdidos. Volvé al paso anterior.",
      });
      return;
    }
    const acc = JSON.parse(raw) as AccountForm;

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${API}/register/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: acc.username,
          email: acc.email,
          password: acc.password,
          birthDate,
          consentIp: clientIp,
          consentTs: new Date().toISOString(),
          userAgent: navigator.userAgent,
          parentalConsent: isMinor ? parentalConsent : false,
          termsVersion: "1.0",
          privacyVersion: "1.0",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors({ global: json.message ?? "Error al iniciar el registro." });
        return;
      }
      setPendingId(json.pendingUserId);
      sessionStorage.setItem("nakama_pending_id", json.pendingUserId);
      setResendCooldown(60);
      setSubStep("code");
    } catch {
      setErrors({ global: "Error de conexión." });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) {
      setErrors({ code: "Ingresá el código de 6 dígitos." });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${API}/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pendingUserId: pendingId, code: code.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors({ code: json.message ?? "Código incorrecto." });
        return;
      }
      onNext();
    } catch {
      setErrors({ code: "Error de conexión." });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/register/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pendingUserId: pendingId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors({ code: json.message });
        return;
      }
      setResendCooldown(60);
      setCode("");
    } catch {
      setErrors({ code: "Error al reenviar." });
    } finally {
      setLoading(false);
    }
  }

  // ── Sub-step LEGAL ────────────────────────────────────────
  if (subStep === "legal")
    return (
      <div className="reg-form">
        <div className="reg-form__header">
          <div className="reg-verify-icon">⚖️</div>
          <h1 className="reg-form__title">Verificación de edad & Legal</h1>
          <p className="reg-form__subtitle">Paso 2 de 3 — Requerido por ley</p>
          <p className="reg-legal-note">
            Necesitamos confirmar tu edad y que aceptes nuestros términos.
            Obligatorio por la <strong>Ley 25.326</strong>.
          </p>
        </div>

        {errors.global && (
          <div className="reg-error" role="alert">
            <span>⚠</span> {errors.global}
          </div>
        )}

        <div className="reg-field">
          <label className="reg-label" htmlFor="r-birth">
            Fecha de nacimiento <span className="reg-required">*</span>
          </label>
          <input
            id="r-birth"
            type="date"
            className={`reg-input ${errors.age ? "reg-input--error" : ""}`}
            value={birthDate}
            max={new Date().toISOString().split("T")[0]}
            min="1900-01-01"
            onChange={(e) => {
              setBirthDate(e.target.value);
              setErrors({});
            }}
          />
          {errors.age && <span className="reg-field-error">{errors.age}</span>}
          {birthDate && age >= 13 && (
            <div
              className={`reg-age-badge ${isAdult ? "reg-age-badge--ok" : "reg-age-badge--minor"}`}
            >
              {isAdult
                ? `✓ Mayor de edad (${age} años)`
                : `⚠ Menor de edad (${age} años) — requiere autorización parental`}
            </div>
          )}
          {birthDate && age < 13 && age > 0 && (
            <div className="reg-age-badge reg-age-badge--blocked">
              🚫 Edad mínima: 13 años
            </div>
          )}
        </div>

        {isMinor && (
          <div className="reg-legal-box reg-legal-box--warning">
            <h3 className="reg-legal-box__title">
              ⚠️ Autorización parental requerida
            </h3>
            <p className="reg-legal-box__text">
              Un padre, madre o tutor legal debe autorizar este registro.
            </p>
            <label className="reg-checkbox-label">
              <input
                type="checkbox"
                className="reg-checkbox"
                checked={parentalConsent}
                onChange={(e) => setParentalConsent(e.target.checked)}
              />
              <span>
                <strong>Soy padre/madre/tutor legal</strong> de este menor y
                autorizo el registro.
              </span>
            </label>
          </div>
        )}

        <div className="reg-legal-section">
          <div className="reg-legal-header">
            <span className="reg-legal-title">📄 Términos y Condiciones</span>
            <button
              type="button"
              className="reg-legal-expand"
              onClick={() => setActiveModal("terms")}
            >
              Leer completo
            </button>
          </div>
          {!termsScrolled && (
            <p className="reg-scroll-warning">
              ⬇ Debés leer los términos completos antes de aceptar
            </p>
          )}
          <label
            className={`reg-checkbox-label ${!termsScrolled ? "reg-checkbox-label--disabled" : ""}`}
          >
            <input
              type="checkbox"
              className="reg-checkbox"
              checked={termsAccepted}
              disabled={!termsScrolled}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>
              Leí y acepto los <strong>Términos y Condiciones</strong>.
            </span>
          </label>
        </div>

        <div className="reg-legal-section">
          <div className="reg-legal-header">
            <span className="reg-legal-title">🔒 Política de Privacidad</span>
            <button
              type="button"
              className="reg-legal-expand"
              onClick={() => setActiveModal("privacy")}
            >
              Leer completo
            </button>
          </div>
          {!privacyScrolled && (
            <p className="reg-scroll-warning">
              ⬇ Debés leer la política completa antes de aceptar
            </p>
          )}
          <label
            className={`reg-checkbox-label ${!privacyScrolled ? "reg-checkbox-label--disabled" : ""}`}
          >
            <input
              type="checkbox"
              className="reg-checkbox"
              checked={privacyAccepted}
              disabled={!privacyScrolled}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
            />
            <span>
              Leí y acepto la <strong>Política de Privacidad</strong> (Ley
              25.326).
            </span>
          </label>
        </div>

        <div className="reg-legal-box reg-legal-box--danger">
          <h3 className="reg-legal-box__title">🛡 Política anti-grooming</h3>
          <p className="reg-legal-box__text">
            Tolerancia cero ante grooming (Ley 26.904). Violaciones activan{" "}
            <strong>denuncia penal automática</strong> ante UFI-ANIN.
          </p>
          <label className="reg-checkbox-label">
            <input
              type="checkbox"
              className="reg-checkbox"
              checked={antiGroomingAck}
              onChange={(e) => setAntiGroomingAck(e.target.checked)}
            />
            <span>Entiendo y acepto la política anti-grooming.</span>
          </label>
        </div>

        {errors.terms && (
          <div className="reg-error" role="alert">
            <span>⚠</span> {errors.terms}
          </div>
        )}

        <div className="reg-ip-notice">
          <span>🔍</span>
          <p>
            Al continuar se registran tu IP ({clientIp}), fecha/hora y
            dispositivo (Ley 25.326).
          </p>
        </div>

        <button
          type="button"
          className="btn-submit"
          disabled={loading || !birthDate || age < 13}
          onClick={handleInitiate}
        >
          {loading ? (
            <span className="btn-spinner" />
          ) : (
            <>
              Confirmar y continuar <ArrowIcon />
            </>
          )}
        </button>

        {activeModal === "terms" && (
          <LegalModal
            title="Términos y Condiciones"
            text={TERMS_TEXT}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40)
                setTermsScrolled(true);
            }}
            scrolled={termsScrolled}
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeModal === "privacy" && (
          <LegalModal
            title="Política de Privacidad"
            text={PRIVACY_TEXT}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40)
                setPrivacyScrolled(true);
            }}
            scrolled={privacyScrolled}
            onClose={() => setActiveModal(null)}
          />
        )}
      </div>
    );

  // ── Sub-step CÓDIGO ───────────────────────────────────────
  return (
    <div className="reg-form">
      <div className="reg-form__header">
        <div className="reg-verify-icon">📬</div>
        <h1 className="reg-form__title">Verificá tu email</h1>
        <p className="reg-form__subtitle">
          Paso 2 de 3 — Código de confirmación
        </p>
        <p className="reg-legal-note">
          Enviamos un código de 6 dígitos a <strong>{email}</strong>.<br />
          Expira en 15 minutos.
        </p>
      </div>

      {errors.global && (
        <div className="reg-error" role="alert">
          <span>⚠</span> {errors.global}
        </div>
      )}

      <div className="reg-field">
        <label className="reg-label" htmlFor="r-code">
          Código de verificación <span className="reg-required">*</span>
        </label>
        <input
          id="r-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          className={`reg-input ${errors.code ? "reg-input--error" : ""}`}
          placeholder="123456"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ""));
            setErrors({});
          }}
          style={{
            letterSpacing: "0.4em",
            fontSize: "1.4rem",
            textAlign: "center",
          }}
        />
        {errors.code && <span className="reg-field-error">{errors.code}</span>}
      </div>

      <button
        type="button"
        className="btn-submit"
        disabled={loading || code.length !== 6}
        onClick={handleVerify}
      >
        {loading ? (
          <span className="btn-spinner" />
        ) : (
          <>
            Verificar código <ArrowIcon />
          </>
        )}
      </button>

      <button
        type="button"
        className="reg-skip"
        disabled={loading || resendCooldown > 0}
        onClick={handleResend}
      >
        {resendCooldown > 0
          ? `Reenviar código (${resendCooldown}s)`
          : "Reenviar código"}
      </button>
    </div>
  );
}

// ─── PASO 2: Avatar → POST /register/complete ─────────────
function StepAvatar({
  errors,
  setErrors,
  loading,
  setLoading,
}: {
  errors: Errors;
  setErrors: (e: Errors) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const [avatarMode, setAvatarMode] = useState<AvatarMode>("default");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const pendingUserId =
    typeof window !== "undefined"
      ? (sessionStorage.getItem("nakama_pending_id") ?? "")
      : "";

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (avatarMode === "video" && f.size > 50 * 1024 * 1024) {
        setErrors({ avatar: "El video no puede superar 50 MB." });
        return;
      }
      if (avatarMode === "gif" && !f.type.includes("gif")) {
        setErrors({ avatar: "Solo se permiten GIF." });
        return;
      }
      setErrors({});
      setFile(f);
      setPreview(URL.createObjectURL(f));
    },
    [avatarMode, setErrors],
  );

  async function handleSubmit(skip = false) {
    setLoading(true);
    setErrors({});
    try {
      const fd = new FormData();
      fd.append("pendingUserId", pendingUserId);
      fd.append("avatarMode", skip ? "default" : avatarMode);
      if (!skip && file) fd.append("avatar", file);

      const res = await fetch(`${API}/register/complete`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors({
          global: json.message ?? "Error al completar el registro.",
        });
        return;
      }

      sessionStorage.removeItem("nakama_reg_account");
      sessionStorage.removeItem("nakama_pending_id");
      localStorage.setItem("nakama_token", json.token);
      window.location.href = "/login";
    } catch {
      setErrors({ global: "Error de conexión." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reg-form">
      <div className="reg-form__header">
        <div className="reg-verify-icon">🎌</div>
        <h1 className="reg-form__title">Tu identidad otaku</h1>
        <p className="reg-form__subtitle">
          Paso 3 de 3 — Foto o video de perfil
        </p>
        <p className="reg-avatar-limits">
          Podés saltear y agregarlo después.
          <br />
          user: 1 video/mes · user-pro: 6/mes · user-premium: 30/mes
        </p>
      </div>

      {errors.global && (
        <div className="reg-error" role="alert">
          <span>⚠</span> {errors.global}
        </div>
      )}

      <div className="reg-avatar-opts" role="radiogroup">
        {(
          [
            { v: "default", icon: "👤", label: "Por defecto" },
            { v: "image", icon: "🖼", label: "Imagen" },
            { v: "video", icon: "🎬", label: "Video" },
            { v: "gif", icon: "🎞", label: "GIF" },
          ] as { v: AvatarMode; icon: string; label: string }[]
        ).map((opt) => (
          <label
            key={opt.v}
            className={`reg-avatar-opt ${avatarMode === opt.v ? "reg-avatar-opt--active" : ""}`}
          >
            <input
              type="radio"
              name="avatarMode"
              value={opt.v}
              checked={avatarMode === opt.v}
              onChange={() => {
                setAvatarMode(opt.v);
                setFile(null);
                setPreview("");
              }}
              className="sr-only"
            />
            <span className="reg-avatar-opt__icon">{opt.icon}</span>
            <span className="reg-avatar-opt__label">{opt.label}</span>
          </label>
        ))}
      </div>

      {avatarMode !== "default" && (
        <div className="reg-upload">
          <label className="reg-upload__zone" htmlFor="r-avatar-input">
            {preview ? (
              avatarMode === "video" ? (
                <video
                  src={preview}
                  className="reg-upload__preview"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="reg-upload__preview"
                />
              ) // eslint-disable-line
            ) : (
              <div className="reg-upload__placeholder">
                <span className="reg-upload__icon">
                  {avatarMode === "video"
                    ? "🎬"
                    : avatarMode === "gif"
                      ? "🎞"
                      : "🖼"}
                </span>
                <span className="reg-upload__text">
                  {avatarMode === "video"
                    ? "Video máx. 1 min · primeros 6 seg = perfil"
                    : avatarMode === "gif"
                      ? "GIF animado"
                      : "JPG, PNG o WebP"}
                </span>
                <span className="reg-upload__cta">Elegir archivo</span>
              </div>
            )}
          </label>
          <input
            id="r-avatar-input"
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
          {preview && (
            <button
              type="button"
              className="reg-upload__remove"
              onClick={() => {
                setFile(null);
                setPreview("");
              }}
            >
              Quitar archivo
            </button>
          )}
          {errors.avatar && (
            <span className="reg-field-error">{errors.avatar}</span>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn-submit"
        disabled={loading || (avatarMode !== "default" && !file)}
        onClick={() => handleSubmit(false)}
      >
        {loading ? <span className="btn-spinner" /> : <>¡Crear mi cuenta! 🎌</>}
      </button>
      <button
        type="button"
        className="reg-skip"
        onClick={() => handleSubmit(true)}
        disabled={loading}
      >
        Saltear — usar avatar por defecto →
      </button>
    </div>
  );
}

// ─── Modal legal ──────────────────────────────────────────

function LegalModal({
  title,
  text,
  onScroll,
  scrolled,
  onClose,
}: {
  title: string;
  text: string;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrolled: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="reg-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="reg-modal">
        {/* Header */}
        <div className="reg-modal__header">
          <h2 className="reg-modal__title">{title}</h2>
          <button
            className="reg-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Hint scroll */}
        {!scrolled && (
          <div className="reg-modal__scroll-hint">
            ⬇ Scrolleá hasta el final para poder aceptar
          </div>
        )}

        {/* Cuerpo scrolleable */}
        <div className="reg-modal__body" onScroll={onScroll}>
          <pre className="reg-modal__text">{text}</pre>
        </div>

        {/* Badge leído */}
        {scrolled && (
          <div className="reg-modal__scrolled-badge">✓ Leído completo</div>
        )}

        {/* Footer con botón — siempre visible, nunca dentro del scroll */}
        <div className="reg-modal__footer">
          <button
            className="btn-submit"
            disabled={!scrolled}
            onClick={onClose}
            type="button"
            style={{ opacity: scrolled ? 1 : 0.38, cursor: scrolled ? "pointer" : "not-allowed" }}
          >
            {scrolled ? "Cerrar y continuar" : "Leé hasta el final para continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Íconos ───────────────────────────────────────────────
function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
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
function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
