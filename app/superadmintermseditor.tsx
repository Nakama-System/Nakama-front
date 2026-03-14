// ═══════════════════════════════════════════════════════════
// components/SuperadminTermsEditor.tsx — Nakama
//
// Panel exclusivo del superadmin para crear, editar y publicar
// nuevas versiones de Términos y Condiciones.
// Al publicar, todos los usuarios activos reciben la notificación.
// ═══════════════════════════════════════════════════════════

"use client";

import { useState, useEffect } from "react";
import "./SuperadminTermsEditor.css";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

interface TermsDraft {
  _id:            string;
  termsVersion:   string;
  privacyVersion: string;
  termsText:      string;
  privacyText:    string;
  changesSummary: string;
  isDraft:        boolean;
  isActive:       boolean;
  publishedAt:    string | null;
  acceptedCount:  number;
  publishedBy?:   { username: string };
  createdAt:      string;
}

interface Props {
  token: string;
}

export default function SuperadminTermsEditor({ token }: Props) {
  const [versions, setVersions] = useState<TermsDraft[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [mode,     setMode]     = useState<"list" | "edit" | "new">("list");
  const [editing,  setEditing]  = useState<Partial<TermsDraft> | null>(null);
  const [publishResult, setPublishResult] = useState<{ usersNotified: number; version: string } | null>(null);

  const headers = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${token}`,
  };

  // ── Cargar versiones ──────────────────────────────────
  const loadVersions = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/terms/all`, { headers, credentials: "include" });
      const data = await res.json();
      if (data.success) setVersions(data.versions);
    } catch {
      setError("Error al cargar versiones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVersions(); }, []);

  // ── Crear borrador nuevo ──────────────────────────────
  function startNew() {
    setEditing({
      termsVersion:   "",
      privacyVersion: "",
      termsText:      "",
      privacyText:    "",
      changesSummary: "",
    });
    setMode("new");
    setError("");
    setSuccess("");
  }

  // ── Editar borrador existente ─────────────────────────
  function startEdit(v: TermsDraft) {
    setEditing({ ...v });
    setMode("edit");
    setError("");
    setSuccess("");
  }

  // ── Guardar (crear o actualizar) ──────────────────────
  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let res;
      if (mode === "new") {
        res = await fetch(`${API}/terms/draft`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(editing),
        });
      } else {
        res = await fetch(`${API}/terms/draft/${editing._id}`, {
          method: "PATCH",
          headers,
          credentials: "include",
          body: JSON.stringify({
            termsText:      editing.termsText,
            privacyText:    editing.privacyText,
            changesSummary: editing.changesSummary,
            privacyVersion: editing.privacyVersion,
          }),
        });
      }
      const data = await res.json();
      if (data.success) {
        setSuccess("Borrador guardado correctamente.");
        await loadVersions();
        setMode("list");
      } else {
        setError(data.message || "Error al guardar.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  }

  // ── Publicar versión ──────────────────────────────────
  async function handlePublish(id: string) {
    if (!confirm("¿Publicar esta versión? TODOS los usuarios deberán aceptarla. Esta acción no se puede deshacer.")) return;

    setPublishing(true);
    setError("");
    setSuccess("");
    setPublishResult(null);

    try {
      const res  = await fetch(`${API}/terms/publish/${id}`, {
        method: "POST",
        headers,
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setPublishResult({ usersNotified: data.usersNotified, version: data.termsVersion });
        await loadVersions();
      } else {
        setError(data.message || "Error al publicar.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setPublishing(false);
    }
  }

  // ── Vista: listado ────────────────────────────────────
  if (mode === "list") {
    return (
      <div className="ste-container">
        <div className="ste-header">
          <div>
            <h2 className="ste-title">⚖️ Gestor de Términos y Condiciones</h2>
            <p className="ste-subtitle">Solo el superadmin puede crear y publicar versiones.</p>
          </div>
          <button className="ste-btn ste-btn--primary" onClick={startNew}>
            + Nueva versión
          </button>
        </div>

        {error   && <div className="ste-alert ste-alert--error">⚠ {error}</div>}
        {success && <div className="ste-alert ste-alert--success">✓ {success}</div>}

        {publishResult && (
          <div className="ste-publish-result">
            <span className="ste-publish-result__icon">🚀</span>
            <div>
              <strong>Versión {publishResult.version} publicada</strong>
              <p>{publishResult.usersNotified.toLocaleString()} usuarios notificados para re-aceptar.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="ste-loading">Cargando versiones…</div>
        ) : (
          <div className="ste-versions">
            {versions.length === 0 && (
              <p className="ste-empty">No hay versiones todavía. Creá la primera.</p>
            )}
            {versions.map(v => (
              <div key={v._id} className={`ste-version-card ${v.isActive ? "ste-version-card--active" : ""} ${v.isDraft ? "ste-version-card--draft" : ""}`}>
                <div className="ste-version-card__header">
                  <div>
                    <span className="ste-version-card__ver">v{v.termsVersion}</span>
                    {v.isActive && <span className="ste-badge ste-badge--active">ACTIVA</span>}
                    {v.isDraft  && <span className="ste-badge ste-badge--draft">BORRADOR</span>}
                  </div>
                  <span className="ste-version-card__date">
                    {v.publishedAt
                      ? `Publicada: ${new Date(v.publishedAt).toLocaleDateString("es-AR")}`
                      : `Creada: ${new Date(v.createdAt).toLocaleDateString("es-AR")}`}
                  </span>
                </div>

                <p className="ste-version-card__summary">
                  {v.changesSummary || <em>Sin resumen de cambios</em>}
                </p>

                <div className="ste-version-card__meta">
                  {v.publishedBy && <span>Publicado por: @{v.publishedBy.username}</span>}
                  <span>{v.acceptedCount.toLocaleString()} aceptaciones</span>
                </div>

                <div className="ste-version-card__actions">
                  {v.isDraft && (
                    <>
                      <button className="ste-btn ste-btn--ghost" onClick={() => startEdit(v)}>
                        ✏ Editar
                      </button>
                      <button
                        className="ste-btn ste-btn--publish"
                        onClick={() => handlePublish(v._id)}
                        disabled={publishing}
                      >
                        {publishing ? "Publicando…" : "🚀 Publicar"}
                      </button>
                    </>
                  )}
                  {!v.isDraft && (
                    <span className="ste-version-card__published-note">
                      {v.isActive ? "✓ Versión activa" : "Versión archivada"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Vista: editor ─────────────────────────────────────
  return (
    <div className="ste-container">
      <div className="ste-header">
        <div>
          <h2 className="ste-title">
            {mode === "new" ? "📝 Nueva versión" : `✏ Editando v${editing?.termsVersion}`}
          </h2>
          <p className="ste-subtitle">
            {mode === "new"
              ? "Creá un borrador. Podés publicarlo cuando esté listo."
              : "Editando borrador. Las versiones publicadas no se pueden editar."}
          </p>
        </div>
        <button className="ste-btn ste-btn--ghost" onClick={() => setMode("list")}>
          ← Volver
        </button>
      </div>

      {error   && <div className="ste-alert ste-alert--error">⚠ {error}</div>}
      {success && <div className="ste-alert ste-alert--success">✓ {success}</div>}

      <div className="ste-form">
        {mode === "new" && (
          <div className="ste-form-row">
            <div className="ste-field">
              <label className="ste-label">Versión de Términos *</label>
              <input
                className="ste-input"
                placeholder="Ej: 1.1"
                value={editing?.termsVersion || ""}
                onChange={e => setEditing(p => ({ ...p, termsVersion: e.target.value }))}
              />
            </div>
            <div className="ste-field">
              <label className="ste-label">Versión de Privacidad *</label>
              <input
                className="ste-input"
                placeholder="Ej: 1.1"
                value={editing?.privacyVersion || ""}
                onChange={e => setEditing(p => ({ ...p, privacyVersion: e.target.value }))}
              />
            </div>
          </div>
        )}

        <div className="ste-field">
          <label className="ste-label">Resumen de cambios (visible para los usuarios)</label>
          <textarea
            className="ste-textarea ste-textarea--sm"
            placeholder="Describí brevemente qué cambió en esta versión..."
            value={editing?.changesSummary || ""}
            onChange={e => setEditing(p => ({ ...p, changesSummary: e.target.value }))}
          />
        </div>

        <div className="ste-field">
          <label className="ste-label">Texto de Términos y Condiciones *</label>
          <textarea
            className="ste-textarea ste-textarea--lg"
            placeholder="Texto completo de los Términos y Condiciones..."
            value={editing?.termsText || ""}
            onChange={e => setEditing(p => ({ ...p, termsText: e.target.value }))}
          />
        </div>

        <div className="ste-field">
          <label className="ste-label">Texto de Política de Privacidad *</label>
          <textarea
            className="ste-textarea ste-textarea--lg"
            placeholder="Texto completo de la Política de Privacidad..."
            value={editing?.privacyText || ""}
            onChange={e => setEditing(p => ({ ...p, privacyText: e.target.value }))}
          />
        </div>

        <div className="ste-form-actions">
          <button className="ste-btn ste-btn--ghost" onClick={() => setMode("list")}>
            Cancelar
          </button>
          <button
            className="ste-btn ste-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando…" : "💾 Guardar borrador"}
          </button>
        </div>
      </div>
    </div>
  );
}