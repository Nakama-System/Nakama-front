// ═══════════════════════════════════════════════════════════
// components/TermsUpdateModal.tsx — Nakama
//
// Modal obligatorio que aparece en el dashboard cuando hay
// nuevos T&C que el usuario debe aceptar.
// No se puede cerrar ni saltear.
// ═══════════════════════════════════════════════════════════

"use client";

import { useState, useRef, useEffect } from "react";
import "../styles/termsupdatemodal.css";

interface TermsData {
  termsVersion:   string;
  privacyVersion: string;
  termsText:      string;
  privacyText:    string;
  changesSummary: string;
  publishedAt:    string;
}

interface Props {
  terms:     TermsData;
  accepting: boolean;
  error:     string;
  onAccept:  () => void;
}

type Tab = "changes" | "terms" | "privacy";

export default function TermsUpdateModal({ terms, accepting, error, onAccept }: Props) {
  const [activeTab,       setActiveTab]       = useState<Tab>("changes");
  const [termsScrolled,   setTermsScrolled]   = useState(false);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
  const [termsChecked,    setTermsChecked]    = useState(false);
  const [privacyChecked,  setPrivacyChecked]  = useState(false);
  const [antiGroomingChk, setAntiGroomingChk] = useState(false);

  const termsRef   = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);

  // Si no hay texto en la pestaña activa, considerar scrolleado
  useEffect(() => {
    if (activeTab === "terms"   && !termsScrolled)   checkScroll("terms");
    if (activeTab === "privacy" && !privacyScrolled) checkScroll("privacy");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function checkScroll(tab: Tab) {
    const ref = tab === "terms" ? termsRef.current : privacyRef.current;
    if (!ref) return;
    const atBottom = ref.scrollHeight - ref.scrollTop <= ref.clientHeight + 60;
    if (atBottom) {
      if (tab === "terms")   setTermsScrolled(true);
      if (tab === "privacy") setPrivacyScrolled(true);
    }
  }

  function handleScroll(tab: Tab) {
    checkScroll(tab);
  }

  const allRead    = termsScrolled && privacyScrolled;
  const allChecked = termsChecked && privacyChecked && antiGroomingChk;
  const canAccept  = allRead && allChecked && !accepting;

  const publishedDate = terms.publishedAt
    ? new Date(terms.publishedAt).toLocaleDateString("es-AR", {
        day: "2-digit", month: "long", year: "numeric"
      })
    : "";

  return (
    <div className="tum-overlay" role="dialog" aria-modal="true" aria-label="Actualización de Términos">
      {/* Backdrop no clickeable — modal obligatorio */}
      <div className="tum-modal">

        {/* ── Header ── */}
        <div className="tum-header">
          <div className="tum-header__icon" aria-hidden="true">⚖️</div>
          <div className="tum-header__text">
            <h2 className="tum-header__title">Actualización de Términos y Condiciones</h2>
            <p className="tum-header__subtitle">
              Versión <strong>{terms.termsVersion}</strong>
              {publishedDate && <> · Publicada el {publishedDate}</>}
            </p>
          </div>
          <div className="tum-header__badge">OBLIGATORIO</div>
        </div>

        {/* ── Tabs ── */}
        <div className="tum-tabs" role="tablist">
          <button
            role="tab"
            className={`tum-tab ${activeTab === "changes" ? "tum-tab--active" : ""}`}
            onClick={() => setActiveTab("changes")}
            aria-selected={activeTab === "changes"}
          >
            📋 Resumen de cambios
          </button>
          <button
            role="tab"
            className={`tum-tab ${activeTab === "terms" ? "tum-tab--active" : ""} ${termsScrolled ? "tum-tab--done" : ""}`}
            onClick={() => setActiveTab("terms")}
            aria-selected={activeTab === "terms"}
          >
            📄 Términos
            {termsScrolled && <span className="tum-tab__check" aria-hidden="true"> ✓</span>}
          </button>
          <button
            role="tab"
            className={`tum-tab ${activeTab === "privacy" ? "tum-tab--active" : ""} ${privacyScrolled ? "tum-tab--done" : ""}`}
            onClick={() => setActiveTab("privacy")}
            aria-selected={activeTab === "privacy"}
          >
            🔒 Privacidad
            {privacyScrolled && <span className="tum-tab__check" aria-hidden="true"> ✓</span>}
          </button>
        </div>

        {/* ── Contenido por tab ── */}
        <div className="tum-body">

          {activeTab === "changes" && (
            <div className="tum-tab-content tum-tab-content--changes">
              <div className="tum-changes-banner">
                <span className="tum-changes-banner__icon">⚠️</span>
                <p>
                  Se actualizaron los Términos y Condiciones de Nakama.
                  Debés leer y aceptarlos para seguir usando la plataforma.
                  <strong> No podés saltear este paso.</strong>
                </p>
              </div>

              {terms.changesSummary && (
                <div className="tum-changes-summary">
                  <h3>¿Qué cambió?</h3>
                  <pre className="tum-changes-pre">{terms.changesSummary}</pre>
                </div>
              )}

              <div className="tum-steps">
                <div className={`tum-step ${termsScrolled ? "tum-step--done" : ""}`}>
                  <span className="tum-step__num">1</span>
                  <span>Leé los <strong>Términos y Condiciones</strong> completos (tab "Términos")</span>
                </div>
                <div className={`tum-step ${privacyScrolled ? "tum-step--done" : ""}`}>
                  <span className="tum-step__num">2</span>
                  <span>Leé la <strong>Política de Privacidad</strong> completa (tab "Privacidad")</span>
                </div>
                <div className={`tum-step ${allChecked ? "tum-step--done" : ""}`}>
                  <span className="tum-step__num">3</span>
                  <span>Marcá las confirmaciones y aceptá</span>
                </div>
              </div>

              <button
                className="tum-next-btn"
                onClick={() => setActiveTab("terms")}
              >
                Comenzar lectura →
              </button>
            </div>
          )}

          {activeTab === "terms" && (
            <div className="tum-tab-content">
              {!termsScrolled && (
                <div className="tum-scroll-hint">⬇ Scrolleá hasta el final para poder aceptar</div>
              )}
              <div
                className="tum-scroll-area"
                ref={termsRef}
                onScroll={() => handleScroll("terms")}
              >
                <pre className="tum-legal-text">{terms.termsText}</pre>
              </div>
              {termsScrolled && (
                <div className="tum-read-badge">✓ Términos leídos completos</div>
              )}
              {termsScrolled && (
                <button className="tum-next-btn" onClick={() => setActiveTab("privacy")}>
                  Continuar a Política de Privacidad →
                </button>
              )}
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="tum-tab-content">
              {!privacyScrolled && (
                <div className="tum-scroll-hint">⬇ Scrolleá hasta el final para poder aceptar</div>
              )}
              <div
                className="tum-scroll-area"
                ref={privacyRef}
                onScroll={() => handleScroll("privacy")}
              >
                <pre className="tum-legal-text">{terms.privacyText}</pre>
              </div>
              {privacyScrolled && (
                <div className="tum-read-badge">✓ Política de privacidad leída completa</div>
              )}
            </div>
          )}
        </div>

        {/* ── Checkboxes de confirmación ── */}
        <div className="tum-confirmations">
          <label className={`tum-check-label ${!termsScrolled ? "tum-check-label--disabled" : ""}`}>
            <input
              type="checkbox"
              className="tum-checkbox"
              checked={termsChecked}
              disabled={!termsScrolled}
              onChange={e => setTermsChecked(e.target.checked)}
            />
            <span>Leí y acepto los <strong>Términos y Condiciones</strong> (versión {terms.termsVersion}).</span>
          </label>

          <label className={`tum-check-label ${!privacyScrolled ? "tum-check-label--disabled" : ""}`}>
            <input
              type="checkbox"
              className="tum-checkbox"
              checked={privacyChecked}
              disabled={!privacyScrolled}
              onChange={e => setPrivacyChecked(e.target.checked)}
            />
            <span>Leí y acepto la <strong>Política de Privacidad</strong> (versión {terms.privacyVersion}).</span>
          </label>

          <label className="tum-check-label tum-check-label--danger">
            <input
              type="checkbox"
              className="tum-checkbox"
              checked={antiGroomingChk}
              onChange={e => setAntiGroomingChk(e.target.checked)}
            />
            <span>
              Entiendo y acepto la política <strong>anti-grooming, anti-acoso y anti-difamación</strong>.
              Las violaciones activan <strong>denuncia penal automática</strong>.
            </span>
          </label>
        </div>

        {error && (
          <div className="tum-error" role="alert">⚠ {error}</div>
        )}

        {/* ── CTA ── */}
        <div className="tum-footer">
          {!allRead && (
            <p className="tum-footer__hint">
              Debés leer los Términos y la Política de Privacidad completos para poder aceptar.
            </p>
          )}
          <button
            className={`tum-accept-btn ${!canAccept ? "tum-accept-btn--disabled" : ""}`}
            disabled={!canAccept}
            onClick={onAccept}
          >
            {accepting
              ? <><span className="tum-spinner" /> Guardando...</>
              : "✓ Acepto los nuevos Términos y Condiciones"
            }
          </button>
        </div>

      </div>
    </div>
  );
}