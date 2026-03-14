"use client";

// ═══════════════════════════════════════════════════════════
// components/MovieUploadAdmin.tsx — Nakama | Superadmin
// CRUD completo de películas + YouTube / Vimeo / URL directa / subida PC
// TypeScript strict — sin errores de tipo
// ═══════════════════════════════════════════════════════════

import {
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type SyntheticEvent,
} from "react";
import { useAuth } from "../../context/authContext";
import "../../styles/moviesup.css";

const API = "http://localhost:5000";

// ⚠ Debe coincidir exactamente con el enum del modelo Movie.js
const CATEGORIES = [
  "accion", "aventura", "comedia", "drama", "terror",
  "romance", "sci-fi", "animacion", "documental",
  "diversion", "amor", "familia", "otro",
] as const;

type Category = typeof CATEGORIES[number];

// ── Clasificaciones por edad ──────────────────────────────
const AGE_RATINGS = ["all", "+10", "+13", "+18"] as const;
type AgeRating = typeof AGE_RATINGS[number];

const AGE_RATING_META: Record<AgeRating, { label: string; color: string; bg: string; icon: string }> = {
  all:  { label: "Todo público", color: "#22c55e", bg: "#dcfce7", icon: "✓" },
  "+10": { label: "Mayores de 10", color: "#f59e0b", bg: "#fef3c7", icon: "10" },
  "+13": { label: "Mayores de 13", color: "#f97316", bg: "#ffedd5", icon: "13" },
  "+18": { label: "Mayores de 18", color: "#ef4444", bg: "#fee2e2", icon: "18" },
};

// ─── Domain types ────────────────────────────────────────
interface MovieItem {
  id:          string;
  title:       string;
  description: string;
  thumbnail:   string;
  videoUrl:    string;
  year:        number;
  duration:    string | number;
  category:    string;
  ageRating:   AgeRating;
  canDownload: boolean;
  isPublished: boolean;
  rating:      number;
  votesCount:  number;
  views:       number;
  slug:        string;
  publicUrl:   string;
  createdAt:   string;
}

interface MovieForm {
  _id?:        string;
  title:       string;
  description: string;
  thumbnail:   string;
  videoUrl:    string;
  year:        number;
  duration:    string | number;
  category:    string;
  ageRating:   AgeRating;
  canDownload: boolean;
  isPublished: boolean;
  slug?:       string;
  publicUrl?:  string;
}

interface UploadImageResponse { url: string; }
interface UploadVideoResponse { url: string; }

interface MovieApiResponse {
  error?: string;
  id:     string;
  title:  string;
  [key: string]: unknown;
}

interface MoviesListResponse {
  items:      MovieItem[];
  total:      number;
  totalPages: number;
  page:       number;
}

// ─── Constants ───────────────────────────────────────────
const EMPTY_FORM: MovieForm = {
  title:       "",
  description: "",
  thumbnail:   "",
  videoUrl:    "",
  year:        new Date().getFullYear(),
  duration:    "",
  category:    "otro",
  ageRating:   "all",
  canDownload: false,
  isPublished: true,
};

// ─── Helper ───────────────────────────────────────────────
function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ═══════════════════════════════════════════════════════════
// Video URL helpers
// ═══════════════════════════════════════════════════════════
type VideoSourceType = "youtube" | "vimeo" | "direct" | "empty";

function detectVideoType(url: string): VideoSourceType {
  if (!url.trim()) return "empty";
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) return "youtube";
  if (url.includes("vimeo.com/")) return "vimeo";
  return "direct";
}

function extractYouTubeId(url: string): string {
  const m =
    url.match(/youtube\.com\/watch\?v=([^&\s]+)/) ??
    url.match(/youtu\.be\/([^?\s]+)/);
  return m?.[1] ?? "";
}

function extractVimeoId(url: string): string {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] ?? "";
}

// ═══════════════════════════════════════════════════════════
// AgeRatingSelector — selector visual de clasificación
// ═══════════════════════════════════════════════════════════
interface AgeRatingSelectorProps {
  value:    AgeRating;
  onChange: (v: AgeRating) => void;
}

function AgeRatingSelector({ value, onChange }: AgeRatingSelectorProps) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {AGE_RATINGS.map((ar) => {
        const meta    = AGE_RATING_META[ar];
        const active  = value === ar;
        return (
          <button
            key={ar}
            type="button"
            onClick={() => onChange(ar)}
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           6,
              padding:       "6px 14px",
              borderRadius:  8,
              border:        `2px solid ${active ? meta.color : "transparent"}`,
              background:    active ? meta.bg : "var(--bg2, rgba(255,255,255,0.06))",
              cursor:        "pointer",
              transition:    "all .15s",
              fontWeight:    active ? 600 : 400,
              fontSize:      13,
              color:         active ? meta.color : "var(--text-muted, #888)",
              outline:       "none",
              boxShadow:     active ? `0 0 0 3px ${meta.color}28` : "none",
            }}
          >
            <span
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                justifyContent: "center",
                width:          26,
                height:         26,
                borderRadius:   6,
                background:     active ? meta.color : "var(--border, rgba(255,255,255,0.12))",
                color:          active ? "#fff" : "var(--text-muted, #888)",
                fontSize:       ar === "all" ? 14 : 11,
                fontWeight:     700,
                flexShrink:     0,
                letterSpacing:  "-0.5px",
              }}
            >
              {meta.icon}
            </span>
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ImageField — URL directa o subida desde PC
// ═══════════════════════════════════════════════════════════
interface ImageFieldProps {
  value:    string;
  onChange: (v: string) => void;
  token:    string | null;
}

function ImageField({ value, onChange, token }: ImageFieldProps) {
  const [tab, setTab]             = useState<"url" | "file">("url");
  const [dragOver, setDragOver]   = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File | null | undefined): Promise<void> => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res  = await fetch(`${API}/uploads/image`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body:    fd,
      });
      const data = await res.json() as UploadImageResponse;
      if (data.url) onChange(data.url);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }, [token, onChange]);

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
    void handleFile(e.dataTransfer.files[0]);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    void handleFile(e.target.files?.[0]);
  };

  const handleImgError = (e: SyntheticEvent<HTMLImageElement>): void => {
    e.currentTarget.style.display = "none";
  };

  return (
    <div className="mup-img-input">
      <div className="mup-img-input__tabs">
        <button
          type="button"
          className={`mup-img-input__tab${tab === "url" ? " mup-img-input__tab--active" : ""}`}
          onClick={() => setTab("url")}
        >🔗 URL</button>
        <button
          type="button"
          className={`mup-img-input__tab${tab === "file" ? " mup-img-input__tab--active" : ""}`}
          onClick={() => setTab("file")}
        >📁 Archivo</button>
      </div>

      {tab === "url" ? (
        <input
          className="mup-field__input"
          type="url"
          placeholder="https://imagen.com/portada.jpg"
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
      ) : (
        <div
          className={`mup-img-drop${dragOver ? " mup-img-drop--active" : ""}`}
          onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input type="file" accept="image/*" onChange={handleInputChange} />
          <div className="mup-img-drop__text">
            {uploading ? "⏳ Subiendo..." : (
              <>
                <strong>Arrastrá</strong> una imagen o hacé clic
                <br /><small>JPG, PNG, WEBP, GIF</small>
              </>
            )}
          </div>
        </div>
      )}

      {value && (
        <div style={{ position: "relative" }}>
          <img
            src={value}
            alt="preview"
            className="mup-thumb-preview"
            onError={handleImgError}
          />
          <button type="button" className="mup-thumb-remove" onClick={() => onChange("")}>
            ✕ Quitar imagen
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VideoField — URL (YouTube/Vimeo/directa) + subida desde PC
// ═══════════════════════════════════════════════════════════
interface VideoFieldProps {
  value:    string;
  onChange: (v: string) => void;
  token:    string | null;
}

type UploadStatus = "success" | "error" | null;

function VideoField({ value, onChange, token }: VideoFieldProps) {
  const [tab,       setTab]       = useState<"url" | "file">("url");
  const [file,      setFile]      = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [status,    setStatus]    = useState<UploadStatus>(null);
  const [dragOver,  setDragOver]  = useState(false);

  const type    = detectVideoType(value);
  const ytId    = type === "youtube" ? extractYouTubeId(value) : "";
  const vimeoId = type === "vimeo"   ? extractVimeoId(value)   : "";

  const typeLabel: Record<VideoSourceType, { icon: string; label: string; color: string }> = {
    youtube: { icon: "▶️", label: "YouTube detectado",  color: "#ff4444" },
    vimeo:   { icon: "🎬", label: "Vimeo detectado",    color: "#1ab7ea" },
    direct:  { icon: "🔗", label: "URL directa",        color: "#26de81" },
    empty:   { icon: "",   label: "",                   color: ""        },
  };

  const info = typeLabel[type];

  const handleFile = useCallback(async (f: File | null | undefined): Promise<void> => {
    if (!f || !f.type.startsWith("video/")) return;
    setFile(f);
    setUploading(true);
    setProgress(0);
    setStatus(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const result = await new Promise<UploadVideoResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e: ProgressEvent) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            try { resolve(JSON.parse(xhr.responseText) as UploadVideoResponse); }
            catch { reject(new Error("Respuesta inválida")); }
          } else {
            reject(new Error(`Error ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("POST", `${API}/uploads/movie-file`);
        xhr.setRequestHeader("Authorization", `Bearer ${token ?? ""}`);
        xhr.send(fd);
      });
      if (result.url) {
        onChange(result.url);
        setStatus("success");
        setTab("url");
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
    } finally {
      setUploading(false);
    }
  }, [token, onChange]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="mup-img-input__tabs">
        <button
          type="button"
          className={`mup-img-input__tab${tab === "url" ? " mup-img-input__tab--active" : ""}`}
          onClick={() => setTab("url")}
        >🔗 URL / Embed</button>
        <button
          type="button"
          className={`mup-img-input__tab${tab === "file" ? " mup-img-input__tab--active" : ""}`}
          onClick={() => setTab("file")}
        >📁 Subir desde PC</button>
      </div>

      {tab === "url" && (
        <>
          <input
            className="mup-field__input"
            type="url"
            placeholder="https://youtube.com/watch?v=...  |  https://youtu.be/...  |  https://vimeo.com/...  |  https://ejemplo.com/video.mp4"
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          />

          {type !== "empty" && (
            <div style={{
              display:      "flex",
              alignItems:   "center",
              gap:          6,
              fontSize:     12,
              color:        info.color,
              padding:      "4px 10px",
              borderRadius: 6,
              background:   `${info.color}18`,
              border:       `1px solid ${info.color}44`,
              width:        "fit-content",
            }}>
              {info.icon} {info.label}
            </div>
          )}

          {type === "youtube" && ytId && (
            <div style={{ borderRadius: 10, overflow: "hidden", aspectRatio: "16/9", background: "#000" }}>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ border: "none", display: "block" }}
                title="Preview YouTube"
              />
            </div>
          )}

          {type === "vimeo" && vimeoId && (
            <div style={{ borderRadius: 10, overflow: "hidden", aspectRatio: "16/9", background: "#000" }}>
              <iframe
                width="100%"
                height="100%"
                src={`https://player.vimeo.com/video/${vimeoId}?byline=0&portrait=0`}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                style={{ border: "none", display: "block" }}
                title="Preview Vimeo"
              />
            </div>
          )}

          {type === "direct" && value.trim() && (
            <video
              src={value}
              controls
              preload="metadata"
              style={{ width: "100%", borderRadius: 10, maxHeight: 280, background: "#000" }}
            />
          )}

          {type === "empty" && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, padding: "6px 0" }}>
              Formatos soportados:
              <span style={{ color: "#ff4444", marginLeft: 6 }}>YouTube</span>
              <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>·</span>
              <span style={{ color: "#1ab7ea" }}>Vimeo</span>
              <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>·</span>
              <span style={{ color: "#26de81" }}>URL directa .mp4 / .webm</span>
            </div>
          )}
        </>
      )}

      {tab === "file" && (
        <>
          <div
            className={`mup-video-drop${dragOver ? " mup-video-drop--active" : ""}`}
            onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setDragOver(false);
              void handleFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              accept="video/*"
              onChange={(e: ChangeEvent<HTMLInputElement>) => void handleFile(e.target.files?.[0])}
            />
            <div className="mup-video-drop__icon">🎬</div>
            <div className="mup-video-drop__text">
              <strong>Arrastrá un video</strong> o hacé clic<br />
              <small>MP4, WEBM, MOV — cualquier tamaño</small>
            </div>
          </div>

          {file !== null && (
            <div className="mup-video-info">
              <span className="mup-video-info__icon">📹</span>
              <span className="mup-video-info__name">{file.name}</span>
              <span className="mup-video-info__size">{fmtSize(file.size)}</span>
            </div>
          )}

          {uploading && (
            <div>
              <div className="mup-progress">
                <div className="mup-progress__bar" style={{ width: `${progress}%` }} />
              </div>
              <div className="mup-upload-status">⏳ Subiendo… {progress}%</div>
            </div>
          )}

          {status === "success" && (
            <div className="mup-upload-status mup-upload-status--success">
              ✅ Video subido — URL cargada en la pestaña URL
            </div>
          )}
          {status === "error" && (
            <div className="mup-upload-status mup-upload-status--error">
              ❌ Error al subir. Intentá de nuevo o usá una URL directa.
            </div>
          )}

          {value && type === "direct" && !uploading && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", wordBreak: "break-all" }}>
              URL actual: <span style={{ color: "#26de81" }}>{value}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MovieFormPanel
// ═══════════════════════════════════════════════════════════
interface MovieFormProps {
  initial:  MovieForm | null;
  token:    string | null;
  onSaved:  (movie: MovieItem, isEdit: boolean) => void;
  onCancel: () => void;
}

function MovieFormPanel({ initial, token, onSaved, onCancel }: MovieFormProps) {
  const [form, setForm]       = useState<MovieForm>(initial ?? EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm(initial ?? EMPTY_FORM);
    setError("");
    setSuccess("");
  }, [initial]);

  const set = <K extends keyof MovieForm>(key: K, val: MovieForm[K]): void => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim())    { setError("El título es requerido");        return; }
    if (!form.videoUrl.trim()) { setError("La URL del video es requerida"); return; }

    const vtype = detectVideoType(form.videoUrl.trim());
    if (vtype === "empty") { setError("Ingresá una URL de video válida"); return; }

    setSaving(true);
    try {
      const isEdit = Boolean(form._id);
      const url    = isEdit ? `${API}/moviesup/${form._id}` : `${API}/moviesup`;
      const method = isEdit ? "PUT" : "POST";

      const payload: Record<string, unknown> = {
        title:       form.title.trim(),
        description: form.description.trim(),
        thumbnail:   form.thumbnail.trim(),
        videoUrl:    form.videoUrl.trim(),
        year:        form.year,
        duration:    String(form.duration ?? "").trim() || "0",
        category:    form.category,
        ageRating:   form.ageRating,       // ← nuevo campo
        canDownload: form.canDownload,
        isPublished: form.isPublished,
      };
      if (form.slug?.trim())      payload.slug      = form.slug.trim();
      if (form.publicUrl?.trim()) payload.publicUrl = form.publicUrl.trim();

      const res  = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as MovieApiResponse;
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");

      setSuccess(isEdit ? "¡Película actualizada!" : "¡Película creada!");
      onSaved(data as unknown as MovieItem, isEdit);
      if (!isEdit) setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const isEdit = Boolean(form._id);

  return (
    <form className="mup-form" onSubmit={(e) => { void handleSubmit(e); }}>
      {error   && <div className="mup-alert mup-alert--error">⚠ {error}</div>}
      {success && <div className="mup-alert mup-alert--success">✅ {success}</div>}

      {/* Título */}
      <div className="mup-field">
        <label className="mup-field__label mup-field__label--required">Título</label>
        <input
          className="mup-field__input"
          value={form.title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set("title", e.target.value)}
          placeholder="Nombre de la película"
        />
      </div>

      {/* Descripción */}
      <div className="mup-field">
        <label className="mup-field__label">Descripción</label>
        <textarea
          className="mup-field__textarea"
          value={form.description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set("description", e.target.value)}
          placeholder="Sinopsis..."
        />
      </div>

      {/* Portada */}
      <div className="mup-field">
        <label className="mup-field__label">Portada (imagen)</label>
        <ImageField value={form.thumbnail} onChange={(v) => set("thumbnail", v)} token={token} />
      </div>

      {/* Video */}
      <div className="mup-field">
        <label className="mup-field__label mup-field__label--required">
          Video <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: 11 }}>
            — YouTube, Vimeo, URL directa o subí desde tu PC
          </span>
        </label>
        <VideoField value={form.videoUrl} onChange={(v) => set("videoUrl", v)} token={token} />
      </div>

      {/* Año / Duración */}
      <div className="mup-row">
        <div className="mup-field">
          <label className="mup-field__label">Año</label>
          <input
            className="mup-field__input"
            type="number"
            min="1900"
            max="2099"
            value={form.year}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set("year", Number(e.target.value))}
          />
        </div>
        <div className="mup-field">
          <label className="mup-field__label">Duración (min)</label>
          <input
            className="mup-field__input"
            type="number"
            min="1"
            value={form.duration}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set("duration", e.target.value)}
            placeholder="120"
          />
        </div>
      </div>

      {/* Categoría */}
      <div className="mup-field">
        <label className="mup-field__label">Categoría</label>
        <select
          className="mup-field__select"
          value={form.category}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => set("category", e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Clasificación por edad ← NUEVO */}
      <div className="mup-field">
        <label className="mup-field__label">Clasificación por edad</label>
        <AgeRatingSelector
          value={form.ageRating}
          onChange={(v) => set("ageRating", v)}
        />
      </div>

      {/* Slug */}
      <div className="mup-field">
        <label className="mup-field__label">Slug (URL)</label>
        <input
          className="mup-field__input"
          value={form.slug ?? ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set("slug", e.target.value)}
          placeholder="mi-pelicula (se genera automáticamente)"
        />
      </div>

      {/* publicUrl */}
      <div className="mup-field">
        <label className="mup-field__label">URL pública</label>
        <input
          className="mup-field__input"
          type="url"
          value={form.publicUrl ?? ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set("publicUrl", e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Toggle: canDownload */}
      <div className="mup-toggle-row">
        <div className="mup-toggle-label">
          <span>Descarga habilitada</span>
          <span>Los usuarios pueden descargar el video</span>
        </div>
        <label className="mup-toggle">
          <input
            type="checkbox"
            checked={form.canDownload}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set("canDownload", e.target.checked)}
          />
          <span className="mup-toggle__track" />
        </label>
      </div>

      {/* Toggle: isPublished */}
      <div className="mup-toggle-row">
        <div className="mup-toggle-label">
          <span>Publicada</span>
          <span>Visible para los usuarios</span>
        </div>
        <label className="mup-toggle">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set("isPublished", e.target.checked)}
          />
          <span className="mup-toggle__track" />
        </label>
      </div>

      <div className="mup-form-actions">
        <button
          type="submit"
          className="mup-btn mup-btn--primary"
          disabled={saving}
          style={{ flex: 1 }}
        >
          {saving ? "⏳ Guardando..." : isEdit ? "💾 Actualizar" : "➕ Crear película"}
        </button>
        {isEdit && (
          <button type="button" className="mup-btn mup-btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════
// DeleteModal
// ═══════════════════════════════════════════════════════════
interface DeleteModalProps {
  movie:     MovieItem;
  onConfirm: () => void;
  onCancel:  () => void;
}

function DeleteModal({ movie, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div
      className="mup-modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar eliminación"
    >
      <div className="mup-modal" onClick={(e) => e.stopPropagation()}>
        <h3>ELIMINAR</h3>
        <p>
          ¿Estás seguro que querés eliminar{" "}
          <strong>&quot;{movie.title}&quot;</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div className="mup-modal__actions">
          <button className="mup-btn mup-btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button className="mup-btn mup-btn--danger" onClick={onConfirm}>
            🗑 Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AgeRatingBadge — badge para las tarjetas
// ═══════════════════════════════════════════════════════════
function AgeRatingBadge({ value }: { value: AgeRating }) {
  const meta = AGE_RATING_META[value] ?? AGE_RATING_META["all"];
  if (value === "all") return null; // "Todo público" no necesita badge
  return (
    <span
      title={meta.label}
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "1px 5px",
        borderRadius:   4,
        background:     meta.color,
        color:          "#fff",
        fontSize:       10,
        fontWeight:     700,
        letterSpacing:  "-0.3px",
        lineHeight:     1.6,
      }}
    >
      {value}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// MovieCard
// ═══════════════════════════════════════════════════════════
interface MovieCardProps {
  movie:    MovieItem;
  selected: boolean;
  onSelect: (m: MovieItem) => void;
  onEdit:   (m: MovieItem) => void;
  onDelete: (m: MovieItem) => void;
}

function MovieCard({ movie, selected, onSelect, onEdit, onDelete }: MovieCardProps) {
  const vtype     = detectVideoType(movie.videoUrl);
  const vtypeIcon = vtype === "youtube" ? "▶️" : vtype === "vimeo" ? "🎬" : "🔗";

  return (
    <div
      className={`mup-movie-card${selected ? " mup-movie-card--selected" : ""}`}
      onClick={() => onSelect(movie)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(movie); }}
    >
      {movie.thumbnail
        ? <img src={movie.thumbnail} alt={movie.title} className="mup-movie-card__thumb" />
        : <div className="mup-movie-card__thumb-placeholder">🎬</div>
      }

      <div className="mup-movie-card__body">
        <div className="mup-movie-card__title">{movie.title}</div>

        <div className="mup-movie-card__meta">
          <span>{movie.year || "—"}</span>
          <span className="mup-movie-card__dot" />
          <span className="mup-movie-card__category">{movie.category}</span>
          {movie.rating > 0 && (
            <>
              <span className="mup-movie-card__dot" />
              <span className="mup-rating-badge">⭐ {movie.rating.toFixed(1)}</span>
            </>
          )}
        </div>

        <div className="mup-movie-card__meta" style={{ marginTop: 4 }}>
          <span title={`Fuente: ${vtype}`} style={{ fontSize: 11 }}>{vtypeIcon}</span>
          {/* Badge de clasificación por edad */}
          <AgeRatingBadge value={movie.ageRating ?? "all"} />
          {movie.canDownload && <span title="Descarga ON">⬇</span>}
          {!movie.isPublished && (
            <span title="No publicada" style={{ color: "var(--warn)" }}>👁‍🗨</span>
          )}
          {movie.views > 0 && <span>👁 {movie.views}</span>}
        </div>
      </div>

      <div className="mup-movie-card__actions">
        <button
          className="mup-movie-card__action-btn mup-movie-card__action-btn--edit"
          onClick={(e) => { e.stopPropagation(); onEdit(movie); }}
          title="Editar"
          type="button"
        >✏</button>
        <button
          className="mup-movie-card__action-btn mup-movie-card__action-btn--delete"
          onClick={(e) => { e.stopPropagation(); onDelete(movie); }}
          title="Eliminar"
          type="button"
        >🗑</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function MovieUploadAdmin({ tokenOverride }: { tokenOverride?: string } = {}) {
  const { user, token: authToken, loading: authLoading } = useAuth();
  const token = tokenOverride ?? authToken;

  const [movies,       setMovies]       = useState<MovieItem[]>([]);
  const [total,        setTotal]        = useState(0);
  const [totalPages,   setTotalPages]   = useState(1);
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState("");
  const [category,     setCategory]     = useState("all");
  const [sort,         setSort]         = useState("newest");
  const [fetching,     setFetching]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<MovieForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MovieItem | null>(null);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);

  // ─── Fetch movies ────────────────────────────────────
  const fetchMovies = useCallback(async (pg: number = 1): Promise<void> => {
    setFetching(true);
    try {
      const params = new URLSearchParams({
        page: String(pg), search, category, sort, limit: "12",
      });
      const res  = await fetch(`${API}/moviesup?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json() as MoviesListResponse;
      setMovies(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setPage(pg);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }, [token, search, category, sort]);

  useEffect(() => {
    if (token && !authLoading) void fetchMovies(1);
  }, [token, authLoading, search, category, sort, fetchMovies]);

  // ─── CRUD handlers ──────────────────────────────────
  const handleSaved = (movie: MovieItem, isEdit: boolean): void => {
    if (isEdit) {
      setMovies((ms) => ms.map((m) => m.id === movie.id ? movie : m));
    } else {
      void fetchMovies(1);
    }
    setEditTarget(null);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await fetch(`${API}/moviesup/${deleteTarget.id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      setMovies((ms) => ms.filter((m) => m.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      if (editTarget?._id === deleteTarget.id) setEditTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit   = (movie: MovieItem): void => {
    setEditTarget({ ...movie, _id: movie.id });
    setSelectedId(movie.id);
  };

  const handleSelect = (movie: MovieItem): void => {
    setSelectedId(movie.id);
    setEditTarget({ ...movie, _id: movie.id });
  };

  // ─── Guards ─────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="mup-root">
        <div className="mup-forbidden">
          <div className="mup-forbidden__icon">⏳</div>
          <p style={{ color: "var(--text-muted)" }}>Verificando sesión…</p>
        </div>
      </div>
    );
  }

  if (!tokenOverride && (!user || user.role !== "superadmin")) {
    return (
      <div className="mup-root">
        <div className="mup-forbidden">
          <div className="mup-forbidden__icon">🔐</div>
          <h2>ACCESO DENEGADO</h2>
          <p>Esta sección es exclusiva de <strong>superadmin</strong>.</p>
        </div>
      </div>
    );
  }

  const publishedCount = movies.filter((m) => m.isPublished).length;

  return (
    <div className="mup-root">
      {/* ── Header ── */}
      <header className="mup-header">
        <div className="mup-header__brand">
          <h1 className="mup-header__title">PELÍCULAS</h1>
          <span className="mup-header__badge">ADMIN</span>
        </div>
        <div className="mup-header__stats">
          <div className="mup-header__stat">
            <span className="mup-header__stat-val">{total}</span>
            <span className="mup-header__stat-lbl">Total</span>
          </div>
          <div className="mup-header__stat">
            <span className="mup-header__stat-val">{publishedCount}</span>
            <span className="mup-header__stat-lbl">Publicadas</span>
          </div>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="mup-toolbar">
        <div className="mup-search">
          <span className="mup-search__icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar película..."
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="mup-filter-select"
          value={category}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
        >
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        <select
          className="mup-filter-select"
          value={sort}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSort(e.target.value)}
        >
          <option value="newest">Más recientes</option>
          <option value="popular">Más vistas</option>
          <option value="rating">Mejor puntuadas</option>
        </select>

        <div className="mup-toolbar__spacer" />

        <button
          className="mup-btn mup-btn--ghost mup-btn--sm"
          type="button"
          onClick={() => { void fetchMovies(page); }}
        >
          🔄 Refrescar
        </button>

        <button
          className="mup-btn mup-btn--primary mup-btn--sm"
          type="button"
          onClick={() => { setEditTarget(null); setSelectedId(null); }}
        >
          ＋ Nueva película
        </button>
      </div>

      {/* ── Main ── */}
      <div className="mup-main">

        {/* ─ Grid ─ */}
        <div className="mup-grid-panel">
          <div className="mup-section-heading">
            BIBLIOTECA{" "}
            <span>{fetching ? "cargando…" : `${total} películas`}</span>
          </div>

          {fetching ? (
            <div className="mup-movie-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="mup-skeleton mup-skeleton-card" />
              ))}
            </div>
          ) : movies.length === 0 ? (
            <div className="mup-empty">
              <div className="mup-empty__icon">🎞</div>
              <h3>SIN PELÍCULAS</h3>
              <p>{search ? "No hay resultados para tu búsqueda." : "Cargá la primera película."}</p>
            </div>
          ) : (
            <>
              <div className="mup-movie-grid">
                {movies.map((m) => (
                  <MovieCard
                    key={m.id}
                    movie={m}
                    selected={selectedId === m.id}
                    onSelect={handleSelect}
                    onEdit={handleEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mup-pagination">
                  <button
                    className="mup-btn mup-btn--ghost mup-btn--sm"
                    type="button"
                    disabled={page <= 1 || fetching}
                    onClick={() => { void fetchMovies(page - 1); }}
                  >← Ant.</button>
                  <span className="mup-pagination__info">{page} / {totalPages}</span>
                  <button
                    className="mup-btn mup-btn--ghost mup-btn--sm"
                    type="button"
                    disabled={page >= totalPages || fetching}
                    onClick={() => { void fetchMovies(page + 1); }}
                  >Sig. →</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─ Form panel ─ */}
        <div className="mup-form-panel">
          <div className="mup-form-panel__header">
            <span className="mup-form-panel__title">
              {editTarget ? "EDITAR" : "NUEVA PELÍCULA"}
            </span>
            {editTarget && (
              <button
                className="mup-btn mup-btn--ghost mup-btn--sm"
                type="button"
                onClick={() => { setEditTarget(null); setSelectedId(null); }}
              >＋ Nueva</button>
            )}
          </div>

          <MovieFormPanel
            key={editTarget?._id ?? "new"}
            initial={editTarget}
            token={token}
            onSaved={handleSaved}
            onCancel={() => { setEditTarget(null); setSelectedId(null); }}
          />
        </div>
      </div>

      {/* ── Delete modal ── */}
      {deleteTarget !== null && (
        <DeleteModal
          movie={deleteTarget}
          onConfirm={() => { void handleDelete(); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}