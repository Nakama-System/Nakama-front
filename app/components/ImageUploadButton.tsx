"use client";

// ═══════════════════════════════════════════════════════════
// components/ImageUploadButton.tsx — Nakama Chat
// Sube imágenes/videos a Cloudinary via backend con:
//  - Barra de carga estilo sayayin (power-up)
//  - Reintentar / Cancelar si falla
//  - Preview antes de enviar
//  - Progreso XHR real
// ═══════════════════════════════════════════════════════════
import { useRef, useState, useCallback } from "react";
import {
  Paperclip, X, Send, RefreshCw, Loader2,
  ImageIcon, FileVideo, AlertTriangle,
} from "lucide-react";

const API = "https://nakama-vercel-backend.vercel.app";

export type UploadedFile = {
  url: string;
  thumbnailUrl?: string;
  type: "image" | "video" | "gif";
  width?: number;
  height?: number;
  duration?: number;
  mimeType: string;
  size: number;
};

interface Props {
  onFileSend: (file: UploadedFile, caption?: string) => void;
  disabled?: boolean;
}

type UploadState =
  | { phase: "idle" }
  | { phase: "preview"; file: File; localUrl: string }
  | { phase: "uploading"; file: File; localUrl: string; progress: number }
  | { phase: "error"; file: File; localUrl: string; errorMsg: string }
  | { phase: "done"; result: UploadedFile; localUrl: string };

// ─── Power bar steps (sayayin) ───────────────────────────
const POWER_LEVELS = [
  { at: 0,   color: "#4ade80", label: "Iniciando..." },
  { at: 20,  color: "#a3e635", label: "Cargando..." },
  { at: 45,  color: "#facc15", label: "Aumentando poder..." },
  { at: 65,  color: "#fb923c", label: "¡Nivel crítico!" },
  { at: 80,  color: "#f87171", label: "¡SUPER NAKAMA!" },
  { at: 95,  color: "#e879f9", label: "¡ULTRA INSTINCT!" },
];

function getPowerLevel(progress: number) {
  let current = POWER_LEVELS[0];
  for (const lvl of POWER_LEVELS) {
    if (progress >= lvl.at) current = lvl;
    else break;
  }
  return current;
}

export default function ImageUploadButton({ onFileSend, disabled }: Props) {
  const fileInputRef               = useRef<HTMLInputElement>(null);
  const xhrRef                     = useRef<XMLHttpRequest | null>(null);
  const [state, setState]          = useState<UploadState>({ phase: "idle" });
  const [caption, setCaption]      = useState("");
  const [showPanel, setShowPanel]  = useState(false);

  const reset = useCallback(() => {
    xhrRef.current?.abort();
    if (state.phase !== "idle") {
      const s = state as any;
      if (s.localUrl) URL.revokeObjectURL(s.localUrl);
    }
    setState({ phase: "idle" });
    setCaption("");
    setShowPanel(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [state]);

  const uploadFile = useCallback(async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setState({ phase: "uploading", file, localUrl, progress: 0 });

    const token = localStorage.getItem("nakama_token");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", file.type.startsWith("video/") ? "video" : "image");

    return new Promise<UploadedFile>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 92); // cap at 92 during upload
          setState(prev =>
            prev.phase === "uploading" ? { ...prev, progress: pct } : prev
          );
        }
      });

      xhr.addEventListener("load", () => {
        setState(prev =>
          prev.phase === "uploading" ? { ...prev, progress: 100 } : prev
        );
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const result: UploadedFile = {
              url:          data.url || data.secure_url,
              thumbnailUrl: data.thumbnailUrl || data.thumbnail_url,
              type:         file.type.startsWith("video/") ? "video"
                          : file.type === "image/gif"       ? "gif"
                          : "image",
              mimeType:     file.type,
              size:         file.size,
              width:        data.width,
              height:       data.height,
              duration:     data.duration,
            };
            resolve(result);
          } catch {
            reject(new Error("Respuesta inválida del servidor"));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.message || `Error ${xhr.status}`));
          } catch {
            reject(new Error(`Error HTTP ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener("error",  () => reject(new Error("Error de red")));
      xhr.addEventListener("abort",  () => reject(new Error("Cancelado")));

      xhr.open("POST", `${API}/uploads/chat-file`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    });
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const maxImg   = 10 * 1024 * 1024;  // 10 MB
    const maxVideo = 100 * 1024 * 1024; // 100 MB
    const isVideo  = file.type.startsWith("video/");
    const isImage  = file.type.startsWith("image/");

    if (!isImage && !isVideo) {
      alert("Solo se aceptan imágenes o videos.");
      return;
    }
    if (isImage && file.size > maxImg)   { alert("La imagen no puede superar los 10 MB."); return; }
    if (isVideo && file.size > maxVideo) { alert("El video no puede superar los 100 MB."); return; }

    const localUrl = URL.createObjectURL(file);
    setState({ phase: "preview", file, localUrl });
    setShowPanel(true);
  }, []);

  const handleUploadAndSend = useCallback(async () => {
    const s = state as any;
    if (!s.file) return;

    try {
      const result = await uploadFile(s.file);
      setState({ phase: "done", result, localUrl: s.localUrl });
      // auto-send after small delay so user sees 100%
      setTimeout(() => {
        onFileSend(result, caption.trim() || undefined);
        reset();
      }, 600);
    } catch (err: any) {
      if (err.message === "Cancelado") return;
      setState(prev =>
        (prev as any).file
          ? { phase: "error", file: (prev as any).file, localUrl: (prev as any).localUrl, errorMsg: err.message }
          : prev
      );
    }
  }, [state, caption, uploadFile, onFileSend, reset]);

  const handleRetry = useCallback(() => {
    const s = state as any;
    if (!s.file) return;
    setState({ phase: "preview", file: s.file, localUrl: s.localUrl });
  }, [state]);

  // ── Render ───────────────────────────────────────────────
  const powerLevel = state.phase === "uploading" ? getPowerLevel(state.progress) : null;

  return (
    <>
      {/* Trigger button */}
      <button
        className="chat-icon-btn niu-upload-trigger"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        title="Adjuntar imagen o video"
      >
        <Paperclip size={18} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Panel modal */}
      {showPanel && state.phase !== "idle" && (
        <div className="niu-panel-overlay" onClick={e => { if (e.target === e.currentTarget) reset(); }}>
          <div className="niu-panel">

            {/* Header */}
            <div className="niu-panel__header">
              <span className="niu-panel__title">
                {state.phase === "uploading" ? "Subiendo..." :
                 state.phase === "error"     ? "Error al subir" :
                 state.phase === "done"      ? "¡Enviado!" : "Enviar archivo"}
              </span>
              <button className="niu-panel__close" onClick={reset}><X size={16} /></button>
            </div>

            {/* Preview */}
            <div className="niu-panel__preview">
              {(state as any).file?.type?.startsWith("video/") ? (
                <video
                  src={(state as any).localUrl}
                  className="niu-panel__media"
                  controls={state.phase === "preview"}
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={(state as any).localUrl}
                  alt="preview"
                  className="niu-panel__media"
                />
              )}

              {/* Overlay durante carga */}
              {state.phase === "uploading" && (
                <div className="niu-panel__upload-overlay">
                  <div className="niu-power-bar-wrap">
                    <div
                      className="niu-power-bar"
                      style={{
                        "--pw-color": powerLevel!.color,
                        "--pw-pct":   `${state.progress}%`,
                      } as React.CSSProperties}
                    >
                      <div className="niu-power-bar__fill" />
                      <div className="niu-power-bar__glow" />
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="niu-power-bar__particle"
                          style={{ "--p-i": i } as React.CSSProperties} />
                      ))}
                    </div>
                    <div className="niu-power-bar__label" style={{ color: powerLevel!.color }}>
                      {powerLevel!.label}
                    </div>
                    <div className="niu-power-bar__pct" style={{ color: powerLevel!.color }}>
                      {state.progress}%
                    </div>
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {state.phase === "error" && (
                <div className="niu-panel__error-overlay">
                  <AlertTriangle size={32} color="#f87171" />
                  <span>{state.errorMsg}</span>
                </div>
              )}
            </div>

            {/* Caption */}
            {(state.phase === "preview" || state.phase === "error") && (
              <input
                className="niu-panel__caption"
                placeholder="Agregar un caption (opcional)..."
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={300}
              />
            )}

            {/* File info */}
            <div className="niu-panel__info">
              {(state as any).file?.type?.startsWith("video/") ? (
                <FileVideo size={13} style={{ color: "#a78bfa" }} />
              ) : (
                <ImageIcon size={13} style={{ color: "#67e8f9" }} />
              )}
              <span>{(state as any).file?.name}</span>
              <span className="niu-panel__size">
                {((state as any).file?.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>

            {/* Actions */}
            <div className="niu-panel__actions">
              {state.phase === "preview" && (
                <>
                  <button className="niu-btn niu-btn--cancel" onClick={reset}>
                    <X size={14} /> Cancelar
                  </button>
                  <button className="niu-btn niu-btn--send" onClick={handleUploadAndSend}>
                    <Send size={14} /> Enviar
                  </button>
                </>
              )}
              {state.phase === "uploading" && (
                <button className="niu-btn niu-btn--cancel" onClick={reset}>
                  <X size={14} /> Cancelar subida
                </button>
              )}
              {state.phase === "error" && (
                <>
                  <button className="niu-btn niu-btn--cancel" onClick={reset}>
                    <X size={14} /> Descartar
                  </button>
                  <button className="niu-btn niu-btn--retry" onClick={handleRetry}>
                    <RefreshCw size={14} /> Reintentar
                  </button>
                </>
              )}
              {state.phase === "done" && (
                <div className="niu-done-label">
                  <Loader2 size={14} className="niu-spin" /> Enviando...
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
