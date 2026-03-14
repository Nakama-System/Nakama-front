// ═══════════════════════════════════════════════════════════
// components/Terminos.tsx — Nakama
//
// Página de lectura de T&C. Muestra el mismo contenido que
// TermsUpdateModal pero como página normal, sin obligación
// de aceptar. Texto siempre visible (fallback hardcodeado).
// Si el backend devuelve términos activos, los sobreescribe.
// Superadmin puede editar y publicar desde aquí.
// ═══════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";
import "../styles/terminos.css";

// ── Tipos ──────────────────────────────────────────────────
interface TermsData {
  _id:            string;
  termsVersion:   string;
  privacyVersion: string;
  termsText:      string;
  privacyText:    string;
  changesSummary: string;
  publishedAt:    string;
  createdAt:      string;
  isActive:       boolean;
  isDraft:        boolean;
  acceptedCount:  number;
}

// ── Fallback hardcodeado ───────────────────────────────────
// Se muestra siempre. El backend lo sobreescribe si hay versión activa.
const TODAY = new Date().toLocaleDateString("es-AR");

const FALLBACK: TermsData = {
  _id: "", termsVersion: "1.0", privacyVersion: "1.0",
  publishedAt: "", createdAt: "", isActive: true, isDraft: false,
  acceptedCount: 0, changesSummary: "",

  termsText: `TÉRMINOS Y CONDICIONES DE USO — NAKAMA
Última actualización: ${TODAY}

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

7. CONTACTO: legal@nakama.ar`,

  privacyText: `POLÍTICA DE PRIVACIDAD — NAKAMA
Ley 25.326 – Argentina
Última actualización: ${TODAY}

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

6. CONTACTO DPO: privacidad@nakama.ar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡 POLÍTICA ANTI-GROOMING — LEY 26.904
Ley 26.904 – Grooming / Art. 131 Código Penal Argentino

Nakama tiene TOLERANCIA CERO ante conductas de grooming,
acoso sexual, acoso moral y producción o distribución de
material de abuso sexual infantil (CSAM).

¿Qué es grooming?
Toda acción realizada mediante comunicación electrónica
con la intención de establecer contacto con un menor de
edad a fin de cometer algún delito contra su integridad
sexual (Art. 131 CP, incorporado por Ley 26.904).

Consecuencias de violar esta política:
· Suspensión inmediata y permanente de la cuenta.
· Denuncia penal automática ante la UFI-ANIN
  (Unidad Fiscal Especializada en Ciberdelincuencia).
· Reporte a organismos de protección de la infancia.
· Preservación de evidencia digital: IP, logs, mensajes.

Nakama colabora activamente con fuerzas de seguridad y
organismos judiciales en toda investigación vinculada a
la protección de niñas, niños y adolescentes.

Si ves algo, decí algo: seguridad@nakama.ar`,
};

// ── Props ──────────────────────────────────────────────────
interface TerminosProps {
  userRole:   "user" | "user-pro" | "user-premium" | "moderator" | "admin" | "superadmin";
  authToken?: string;
}

type Tab        = "changes" | "terms" | "privacy";
type EditorMode = "view" | "new-draft" | "edit-draft";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function authH(token?: string): HeadersInit {
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

// ══════════════════════════════════════════════════════════
export default function Terminos({ userRole, authToken }: TerminosProps) {
  const isSA = userRole === "superadmin";

  const [terms,      setTerms]      = useState<TermsData>(FALLBACK);
  const [allDrafts,  setAllDrafts]  = useState<TermsData[]>([]);
  const [activeTab,  setActiveTab]  = useState<Tab>("changes");
  const [mode,       setMode]       = useState<EditorMode>("view");
  const [editTgt,    setEditTgt]    = useState<TermsData | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [msg,        setMsg]        = useState("");

  // form
  const [fTV, setFTV] = useState("");
  const [fPV, setFPV] = useState("");
  const [fTT, setFTT] = useState("");
  const [fPT, setFPT] = useState("");
  const [fCS, setFCS] = useState("");

  const fetchActive = useCallback(async () => {
    try {
      const r = await fetch(`${API}/terms/active`);
      const d = await r.json();
      if (d.success && d.terms) setTerms(d.terms);
    } catch { /* queda fallback */ }
  }, []);

  const fetchAll = useCallback(async () => {
    if (!isSA || !authToken) return;
    try {
      const r = await fetch(`${API}/terms/all`, { headers: authH(authToken) });
      const d = await r.json();
      if (d.success) setAllDrafts(d.versions);
    } catch { /* silencioso */ }
  }, [isSA, authToken]);

  useEffect(() => {
    fetchActive();
    fetchAll();
  }, [fetchActive, fetchAll]);

  // ── Acciones editor ────────────────────────────────────
  function openNew() {
    setEditTgt(null);
    setFTV(""); setFPV(terms.privacyVersion);
    setFTT(terms.termsText); setFPT(terms.privacyText); setFCS("");
    setMode("new-draft"); setMsg("");
  }

  function openEdit(v: TermsData) {
    setEditTgt(v);
    setFTV(v.termsVersion); setFPV(v.privacyVersion);
    setFTT(v.termsText); setFPT(v.privacyText); setFCS(v.changesSummary);
    setMode("edit-draft"); setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setSaving(true); setMsg("");
    try {
      const isNew = mode === "new-draft";
      const url   = isNew ? `${API}/terms/draft` : `${API}/terms/draft/${editTgt!._id}`;
      const body  = isNew
        ? { termsVersion: fTV, privacyVersion: fPV, termsText: fTT, privacyText: fPT, changesSummary: fCS }
        : { privacyVersion: fPV, termsText: fTT, privacyText: fPT, changesSummary: fCS };
      const r = await fetch(url, { method: isNew ? "POST" : "PATCH", headers: authH(authToken), body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { setMsg("✓ Borrador guardado."); await fetchAll(); setMode("view"); }
      else setMsg(`⚠ ${d.message}`);
    } catch { setMsg("⚠ Error de red."); }
    finally { setSaving(false); }
  }

  async function publish(id: string) {
    if (!confirm("¿Publicar esta versión? Todos los usuarios deberán re-aceptar los T&C.")) return;
    setPublishing(true); setMsg("");
    try {
      const r = await fetch(`${API}/terms/publish/${id}`, { method: "POST", headers: authH(authToken) });
      const d = await r.json();
      if (d.success) {
        setMsg(`✓ ${d.message}`);
        await Promise.all([fetchActive(), fetchAll()]);
        setMode("view");
      } else setMsg(`⚠ ${d.message}`);
    } catch { setMsg("⚠ Error de red."); }
    finally { setPublishing(false); }
  }

  const publishedDate = terms.publishedAt ? fmtDate(terms.publishedAt) : "";

  // ══════════════════════════════════════════════════════
  // RENDER — Editor superadmin
  // ══════════════════════════════════════════════════════
  if (isSA && mode !== "view") {
    return (
      <div className="trm-page">
        <div className="trm-editor-card">
          <div className="trm-editor-header">
            <h2 className="trm-editor-title">
              {mode === "new-draft" ? "📝 Nuevo borrador de T&C" : `📝 Editando v${editTgt?.termsVersion}`}
            </h2>
            <button className="trm-btn-ghost" onClick={() => setMode("view")}>← Volver</button>
          </div>

          <div className="trm-grid">
            {mode === "new-draft" && (
              <div className="trm-field">
                <label className="trm-label">Versión T&C <span className="trm-req">*</span></label>
                <input className="trm-input" value={fTV} onChange={e => setFTV(e.target.value)} placeholder="ej: 2.0" />
              </div>
            )}
            <div className="trm-field">
              <label className="trm-label">Versión Privacidad <span className="trm-req">*</span></label>
              <input className="trm-input" value={fPV} onChange={e => setFPV(e.target.value)} placeholder="ej: 2.0" />
            </div>
            <div className="trm-field trm-field--full">
              <label className="trm-label">Resumen de cambios</label>
              <textarea className="trm-textarea trm-textarea--sm" value={fCS}
                onChange={e => setFCS(e.target.value)} rows={3}
                placeholder="¿Qué cambió respecto a la versión anterior?" />
            </div>
            <div className="trm-field trm-field--full">
              <label className="trm-label">Texto — Términos y Condiciones <span className="trm-req">*</span></label>
              <textarea className="trm-textarea" value={fTT} onChange={e => setFTT(e.target.value)} rows={16} />
            </div>
            <div className="trm-field trm-field--full">
              <label className="trm-label">Texto — Política de Privacidad <span className="trm-req">*</span></label>
              <textarea className="trm-textarea" value={fPT} onChange={e => setFPT(e.target.value)} rows={16} />
            </div>
          </div>

          {msg && (
            <div className={`trm-msg ${msg.startsWith("✓") ? "trm-msg--ok" : "trm-msg--err"}`}>{msg}</div>
          )}

          <div className="trm-editor-actions">
            <button className="trm-btn-ghost" onClick={() => setMode("view")}>Cancelar</button>
            <button className="trm-btn-save" onClick={save} disabled={saving}>
              {saving ? <><span className="trm-spin" /> Guardando…</> : "💾 Guardar borrador"}
            </button>
            {mode === "edit-draft" && editTgt && (
              <button className="trm-btn-pub" onClick={() => publish(editTgt._id)} disabled={publishing}>
                {publishing ? <><span className="trm-spin" /> Publicando…</> : "🚀 Publicar esta versión"}
              </button>
            )}
          </div>

          {/* Historial */}
          {allDrafts.length > 0 && (
            <div className="trm-ver-list">
              <div className="trm-ver-list__head">Versiones en sistema</div>
              {allDrafts.map(v => (
                <div key={v._id} className={`trm-ver-row ${v.isActive ? "trm-ver-row--active" : ""}`}>
                  <strong>v{v.termsVersion}</strong>
                  <span className={`trm-badge ${v.isActive ? "trm-badge--green" : v.isDraft ? "trm-badge--yellow" : "trm-badge--gray"}`}>
                    {v.isActive ? "Activa" : v.isDraft ? "Borrador" : "Inactiva"}
                  </span>
                  <span className="trm-ver-date">{fmtDate(v.publishedAt || v.createdAt)}</span>
                  <span className="trm-ver-count">{v.acceptedCount ?? 0} aceptaciones</span>
                  <div className="trm-ver-actions">
                    {(v.isDraft || v.isActive) && (
                      <button className="trm-btn-xs" onClick={() => openEdit(v)}>✏ Editar</button>
                    )}
                    {v.isDraft && (
                      <button className="trm-btn-xs trm-btn-xs--green" onClick={() => publish(v._id)} disabled={publishing}>
                        🚀 Publicar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // RENDER — Vista de lectura (igual estructura que TermsUpdateModal)
  // ══════════════════════════════════════════════════════
  return (
    <div className="trm-page">
      <div className="trm-card">

        {/* ── Header ── */}
        <div className="trm-header">
          <div className="trm-header__icon" aria-hidden="true">⚖️</div>
          <div className="trm-header__text">
            <h2 className="trm-header__title">Términos y Condiciones de Nakama</h2>
            <p className="trm-header__subtitle">
              Versión <strong>{terms.termsVersion}</strong>
              {publishedDate && <> · Vigente desde {publishedDate}</>}
              {!publishedDate && <> · <em>Pendiente de publicación oficial</em></>}
            </p>
          </div>
          {isSA && (
            <button className="trm-btn-edit" onClick={openNew}>✏ Nuevo borrador</button>
          )}
        </div>

        {/* ── Tabs — misma estructura que el modal ── */}
        <div className="trm-tabs" role="tablist">
          <button
            role="tab"
            className={`trm-tab ${activeTab === "changes" ? "trm-tab--active" : ""}`}
            onClick={() => setActiveTab("changes")}
            aria-selected={activeTab === "changes"}
          >
            📋 Resumen de cambios
          </button>
          <button
            role="tab"
            className={`trm-tab ${activeTab === "terms" ? "trm-tab--active" : ""}`}
            onClick={() => setActiveTab("terms")}
            aria-selected={activeTab === "terms"}
          >
            📄 Términos
          </button>
          <button
            role="tab"
            className={`trm-tab ${activeTab === "privacy" ? "trm-tab--active" : ""}`}
            onClick={() => setActiveTab("privacy")}
            aria-selected={activeTab === "privacy"}
          >
            🔒 Privacidad
          </button>
        </div>

        {/* ── Contenido por tab ── */}
        <div className="trm-body">

          {activeTab === "changes" && (
            <div className="trm-tab-content trm-tab-content--changes">
              <div className="trm-changes-banner">
                <span className="trm-changes-banner__icon">⚠️</span>
                <p>
                  Estos son los Términos y Condiciones vigentes de Nakama.
                  Podés leerlos cuando quieras desde esta sección.
                  {isSA && <strong> Como superadmin podés editarlos y publicar nuevas versiones.</strong>}
                </p>
              </div>

              {terms.changesSummary && (
                <div className="trm-changes-summary">
                  <h3>Último resumen de cambios</h3>
                  <pre className="trm-changes-pre">{terms.changesSummary}</pre>
                </div>
              )}

              {!terms.changesSummary && (
                <div className="trm-changes-summary trm-changes-summary--empty">
                  <p>No hay resumen de cambios para esta versión.</p>
                </div>
              )}

              <div className="trm-steps">
                <div className="trm-step">
                  <span className="trm-step__num">1</span>
                  <span>Leé los <strong>Términos y Condiciones</strong> en el tab "Términos"</span>
                </div>
                <div className="trm-step">
                  <span className="trm-step__num">2</span>
                  <span>Leé la <strong>Política de Privacidad</strong> en el tab "Privacidad"</span>
                </div>
              </div>

              <button className="trm-next-btn" onClick={() => setActiveTab("terms")}>
                Leer Términos →
              </button>

              {/* Panel historial superadmin */}
              {isSA && allDrafts.length > 0 && (
                <div className="trm-sa-panel">
                  <div className="trm-sa-panel__head">🛡 Panel superadmin — versiones</div>
                  {msg && (
                    <div className={`trm-msg ${msg.startsWith("✓") ? "trm-msg--ok" : "trm-msg--err"}`}>{msg}</div>
                  )}
                  {allDrafts.map(v => (
                    <div key={v._id} className={`trm-ver-row ${v.isActive ? "trm-ver-row--active" : ""}`}>
                      <strong>v{v.termsVersion}</strong>
                      <span className={`trm-badge ${v.isActive ? "trm-badge--green" : v.isDraft ? "trm-badge--yellow" : "trm-badge--gray"}`}>
                        {v.isActive ? "Activa" : v.isDraft ? "Borrador" : "Inactiva"}
                      </span>
                      <span className="trm-ver-date">{fmtDate(v.publishedAt || v.createdAt)}</span>
                      <span className="trm-ver-count">{v.acceptedCount ?? 0} acept.</span>
                      <div className="trm-ver-actions">
                        {(v.isDraft || v.isActive) && (
                          <button className="trm-btn-xs" onClick={() => openEdit(v)}>✏ Editar</button>
                        )}
                        {v.isDraft && (
                          <button className="trm-btn-xs trm-btn-xs--green" onClick={() => publish(v._id)} disabled={publishing}>
                            🚀 Publicar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "terms" && (
            <div className="trm-tab-content">
              <div className="trm-scroll-area">
                <pre className="trm-legal-text">{terms.termsText}</pre>
              </div>
              <button className="trm-next-btn" onClick={() => setActiveTab("privacy")}>
                Continuar a Política de Privacidad →
              </button>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="trm-tab-content">
              <div className="trm-antigrooming-box">
                <h3 className="trm-antigrooming-box__title">🛡 Política anti-grooming</h3>
                <p className="trm-antigrooming-box__text">
                  Tolerancia cero ante grooming (Ley 26.904 / Art. 131 CP). Las violaciones activan{" "}
                  <strong>denuncia penal automática</strong> ante la UFI-ANIN
                  (Unidad Fiscal Especializada en Ciberdelincuencia).
                </p>
              </div>
              <div className="trm-scroll-area">
                <pre className="trm-legal-text">{terms.privacyText}</pre>
              </div>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="trm-footer">
          <span>T&C v{terms.termsVersion}</span>
          <span className="trm-sep">·</span>
          <span>Privacidad v{terms.privacyVersion}</span>
          {publishedDate && <><span className="trm-sep">·</span><span>Vigente desde {publishedDate}</span></>}
        </div>

      </div>
    </div>
  );
}