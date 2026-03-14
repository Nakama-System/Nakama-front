"use client";

// ═══════════════════════════════════════════════════════════
// components/EphemeralComposer.tsx — Nakama [INTEGRADO]
// Modal para crear mensajes temporales en una comunidad.
// Usa tu endpoint /uploads/chat-file existente
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Timer, X, Image, Type, Upload, Flame, Eye, EyeOff, Clock, Check, Loader2, AlertCircle } from "lucide-react";

const API ="https://nakama-vercel-backend.vercel.app";

// ── Paleta fija: zona oscura profunda (independiente del tema) ──
const E = {
  bg:       "#06040a",
  surface:  "#0d0814",
  surface2: "#130d1c",
  border:   "#1e1230",
  accent:   "#a855f7",
  accentDim:"#7c3aed",
  accentGlow:"rgba(168,85,247,0.25)",
  danger:   "#e05560",
  text:     "#e8d5ff",
  textSub:  "#9b7ec8",
  textDim:  "#5a4470",
  inputBg:  "#0a0612",
  inputBorder: "#2a1a40",
};

// ── Duration options ──────────────────────────────────────
const DURATIONS = [
  { label: "5s",   value: 5 },
  { label: "10s",  value: 10 },
  { label: "30s",  value: 30 },
  { label: "1min", value: 60 },
  { label: "5min", value: 300 },
  { label: "∞",    value: 0 },
];

type Mode = "text" | "image";

export default function EphemeralComposer({
  communityId,
  isAdmin,
  socketRef,
  onClose,
  onSent,
}: {
  communityId: string;
  isAdmin: boolean;
  socketRef: React.MutableRefObject<any>;
  onClose: () => void;
  onSent: () => void;
}) {
  const [mode,       setMode]       = useState<Mode>("text");
  const [caption,    setCaption]    = useState("");
  const [duration,   setDuration]   = useState(10);
  const [oneTime,    setOneTime]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Image mode
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl,     setImageUrl]     = useState("");   // URL final de Cloudinary
  const [uploading,    setUploading]    = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const tok = () =>
    typeof window !== "undefined" ? localStorage.getItem("nakama_token") ?? "" : "";

  // ── Selección de archivo ──────────────────────────────
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    // Validar tamaño (max 100MB como en uploadRoutes)
    if (f.size > 100 * 1024 * 1024) {
      setError("El archivo es demasiado grande (máx 100MB)");
      return;
    }

    setImageFile(f);
    const url = URL.createObjectURL(f);
    setImagePreview(url);
    setImageUrl(""); // limpiar URL manual si había
    setError(null);
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageUrl("");
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Upload usando tu endpoint /uploads/chat-file ────────
  // Pero destinado a carpeta ephemeral en Cloudinary
  async function uploadImage(): Promise<string | null> {
    if (!imageFile) {
      // Si hay URL manual, devolverla directamente
      return imageUrl?.trim() || null;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      // Opcional: indicar que es para ephemeral (el backend puede ignorarlo)
      formData.append("type", "ephemeral");

      const res = await fetch(`${API}/uploads/chat-file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("[Upload] Error:", errData);
        setError(errData.message || "Error al subir la imagen.");
        setUploading(false);
        return null;
      }

      const data = await res.json();
      const uploadedUrl = data.url || data.imageUrl;

      if (!uploadedUrl) {
        setError("No se recibió URL del servidor.");
        setUploading(false);
        return null;
      }

      setUploading(false);
      return uploadedUrl;
    } catch (err) {
      console.error("[Upload] Error:", err);
      setError("Error de conexión al subir la imagen.");
      setUploading(false);
      return null;
    }
  }

  // ── Envío ─────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (sending) return;

    // Validación mínima
    if (mode === "text" && !caption.trim()) {
      setError("Escribí algo antes de enviar.");
      return;
    }
    if (mode === "image" && !imageFile && !imageUrl.trim()) {
      setError("Seleccioná una imagen o ingresá una URL.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      // 1. Resolver URL de imagen (subir si es necesario)
      let finalImageUrl: string | null = null;
      let thumbnailUrl: string | null  = null;

      if (mode === "image") {
        finalImageUrl = await uploadImage();
        if (!finalImageUrl) {
          setSending(false);
          return; // El error ya está seteado en uploadImage
        }
        
        // Usar la misma URL como thumbnail
        // (el servidor puede transformarla si lo desea)
        thumbnailUrl = finalImageUrl;
      }

      // 2. Armar body
      const body: Record<string, unknown> = {
        roomId:      communityId,
        roomType:    "community",
        caption:     caption.trim(),
        imageUrl:    finalImageUrl,
        thumbnailUrl,
        mimeType:    imageFile?.type ?? "text/plain",
        size:        imageFile?.size ?? 0,
        config: {
          duration,
          oneTimeView: oneTime,
        },
      };

      // 3. POST /comunidadtemporal
      const res = await fetch(`${API}/comunidadtemporal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok()}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Error al enviar el temporal.");
        setSending(false);
        return;
      }

      onSent();
      onClose();
    } catch (err) {
      console.error("[EphemeralComposer] Error:", err);
      setError("Error de conexión. Intentá de nuevo.");
      setSending(false);
    }
  }, [sending, mode, caption, imageFile, imageUrl, duration, oneTime, communityId, onSent, onClose]);

  const isVideoFile = imageFile && imageFile.type.startsWith("video/");
  const canSend =
    mode === "text"
      ? !!caption.trim()
      : !!(imageFile || imageUrl.trim());

  // ════════════════════════════════════════════════════
  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(4,2,10,0.88)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 420,
          background: `linear-gradient(160deg, ${E.surface} 0%, ${E.bg} 100%)`,
          border: `1px solid ${E.border}`,
          borderRadius: 20,
          boxShadow: `0 0 60px rgba(168,85,247,0.12), 0 32px 80px rgba(0,0,0,0.7)`,
          overflow: "hidden",
          fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "16px 18px 12px",
          borderBottom: `1px solid ${E.border}`,
          background: `linear-gradient(90deg, rgba(168,85,247,0.06), transparent)`,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `linear-gradient(135deg, ${E.accentDim}, ${E.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 16px ${E.accentGlow}`,
          }}>
            <Timer size={15} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: E.text, letterSpacing: "-0.01em" }}>
              Mensaje temporal
            </div>
            <div style={{ fontSize: 10, color: E.textDim, letterSpacing: "0.08em" }}>
              SE DESTRUYE AL VER · SOLO UNA VEZ
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto", width: 28, height: 28, borderRadius: 8,
              background: "rgba(255,255,255,0.04)", border: `1px solid ${E.border}`,
              color: E.textDim, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(224,85,96,0.12)"; e.currentTarget.style.color = E.danger; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = E.textDim; }}
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Mode selector ── */}
        <div style={{ display: "flex", gap: 6, padding: "12px 18px 0" }}>
          {(["text", "image"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer",
                border: `1px solid ${mode === m ? E.accent : E.border}`,
                background: mode === m
                  ? `linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.08))`
                  : E.surface2,
                color: mode === m ? E.accent : E.textDim,
                fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.15s",
                boxShadow: mode === m ? `0 0 16px rgba(168,85,247,0.15)` : "none",
              }}
            >
              {m === "text" ? <Type size={12} /> : <Image size={12} />}
              {m === "text" ? "TEXTO" : "IMAGEN"}
            </button>
          ))}
        </div>

        {/* ── Content area ── */}
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Image picker */}
          {mode === "image" && (
            <div>
              {imagePreview ? (
                /* Preview */
                <div style={{
                  position: "relative", borderRadius: 12, overflow: "hidden",
                  border: `1px solid ${E.border}`,
                  background: E.inputBg, maxHeight: 200,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isVideoFile ? (
                    <video
                      src={imagePreview} style={{ maxWidth: "100%", maxHeight: 200, display: "block" }}
                      controls muted playsInline
                    />
                  ) : (
                    <img
                      src={imagePreview} alt="preview"
                      style={{ maxWidth: "100%", maxHeight: 200, display: "block", objectFit: "contain" }}
                    />
                  )}
                  <button
                    onClick={clearImage}
                    style={{
                      position: "absolute", top: 8, right: 8,
                      width: 26, height: 26, borderRadius: "50%",
                      background: "rgba(0,0,0,0.7)", border: "none",
                      color: "white", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                /* Drop zone */
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    borderRadius: 12, border: `2px dashed ${E.inputBorder}`,
                    background: E.inputBg, padding: "28px 16px",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 8,
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = E.accent;
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(168,85,247,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = E.inputBorder;
                    (e.currentTarget as HTMLDivElement).style.background = E.inputBg;
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: `linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.08))`,
                    border: `1px solid rgba(168,85,247,0.2)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Upload size={18} color={E.accent} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: E.textSub, fontWeight: 600 }}>
                      Tocá para subir
                    </div>
                    <div style={{ fontSize: 10, color: E.textDim, marginTop: 2 }}>
                      JPG · PNG · GIF · MP4 · WEBM (máx 100MB)
                    </div>
                  </div>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: "none" }}
                onChange={onFileChange}
              />

              {/* URL manual fallback */}
              {!imagePreview && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9, color: E.textDim, letterSpacing: "0.1em", marginBottom: 5 }}>
                    O PEGÁ UNA URL DIRECTA
                  </div>
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/... o cualquier URL"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: E.inputBg, border: `1px solid ${E.inputBorder}`,
                      borderRadius: 8, padding: "8px 10px",
                      color: E.text, fontSize: 11, outline: "none",
                      fontFamily: "inherit",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = E.accent; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = E.inputBorder; }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Caption / text */}
          <div>
            <div style={{ fontSize: 9, color: E.textDim, letterSpacing: "0.1em", marginBottom: 5 }}>
              {mode === "text" ? "MENSAJE" : "DESCRIPCIÓN (OPCIONAL)"}
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={500}
              rows={mode === "text" ? 4 : 2}
              placeholder={mode === "text" ? "Escribí tu mensaje temporal..." : "Agregá una descripción..."}
              style={{
                width: "100%", boxSizing: "border-box", resize: "none",
                background: E.inputBg, border: `1px solid ${E.inputBorder}`,
                borderRadius: 10, padding: "10px 12px",
                color: E.text, fontSize: 12, outline: "none",
                fontFamily: "inherit", lineHeight: 1.6,
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = E.accent; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = E.inputBorder; }}
            />
            <div style={{ textAlign: "right", fontSize: 9, color: E.textDim, marginTop: 3 }}>
              {caption.length}/500
            </div>
          </div>

          {/* Duration */}
          <div>
            <div style={{
              fontSize: 9, color: E.textDim, letterSpacing: "0.1em", marginBottom: 7,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Clock size={9} /> DURACIÓN DE VISIBILIDAD
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  style={{
                    padding: "5px 10px", borderRadius: 8, cursor: "pointer",
                    fontSize: 11, fontWeight: 700,
                    border: `1px solid ${duration === d.value ? E.accent : E.border}`,
                    background: duration === d.value
                      ? `linear-gradient(135deg, rgba(168,85,247,0.2), rgba(124,58,237,0.1))`
                      : E.surface2,
                    color: duration === d.value ? E.accent : E.textDim,
                    transition: "all 0.15s",
                    boxShadow: duration === d.value ? `0 0 10px rgba(168,85,247,0.2)` : "none",
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* One-time view toggle */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 12px", borderRadius: 10,
            background: E.surface2, border: `1px solid ${E.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {oneTime ? <Eye size={13} color={E.accent} /> : <EyeOff size={13} color={E.textDim} />}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: oneTime ? E.text : E.textDim }}>
                  Vista única
                </div>
                <div style={{ fontSize: 9, color: E.textDim, marginTop: 1 }}>
                  Se destruye al abrirse
                </div>
              </div>
            </div>
            <button
              onClick={() => setOneTime((p) => !p)}
              style={{
                width: 40, height: 22, borderRadius: 11, cursor: "pointer",
                border: "none",
                background: oneTime
                  ? `linear-gradient(90deg, ${E.accentDim}, ${E.accent})`
                  : E.border,
                position: "relative", transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute", top: 3,
                left: oneTime ? 21 : 3,
                width: 16, height: 16, borderRadius: "50%",
                background: "white",
                transition: "left 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
              }} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 12px", borderRadius: 8,
              background: "rgba(224,85,96,0.08)", border: `1px solid rgba(224,85,96,0.25)`,
              fontSize: 11, color: E.danger,
            }}>
              <AlertCircle size={12} /> {error}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend || sending || uploading}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 12,
              border: "none", cursor: canSend && !sending && !uploading ? "pointer" : "not-allowed",
              background: canSend && !sending && !uploading
                ? `linear-gradient(135deg, ${E.accentDim}, ${E.accent})`
                : E.border,
              color: canSend && !sending && !uploading ? "white" : E.textDim,
              fontSize: 12, fontWeight: 800, letterSpacing: "0.1em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.2s",
              boxShadow: canSend && !sending && !uploading
                ? `0 4px 24px rgba(168,85,247,0.35)`
                : "none",
            }}
            onMouseEnter={(e) => {
              if (canSend && !sending && !uploading) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = `0 8px 32px rgba(168,85,247,0.45)`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = canSend && !sending && !uploading
                ? `0 4px 24px rgba(168,85,247,0.35)` : "none";
            }}
          >
            {sending ? (
              <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />
                {uploading ? "SUBIENDO..." : "ENVIANDO..."}</>
            ) : (
              <><Flame size={14} /> ENVIAR TEMPORAL</>
            )}
          </button>

          {/* Disclaimer */}
          <div style={{
            textAlign: "center", fontSize: 9, color: E.textDim,
            letterSpacing: "0.06em", lineHeight: 1.6,
          }}>
            {oneTime && "Vista única · "}
            {duration > 0 ? `Expira en ${DURATIONS.find(d => d.value === duration)?.label}` : "Sin expiración"}
            {" · Solo miembros de la comunidad"}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
