"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, Trash2, Pencil, Plus, CheckCircle2, XCircle,
  AlertTriangle, Loader2, FileText, RefreshCw,
  ChevronDown, ChevronUp, Save, X, BookOpen, BarChart2,
  Swords, House, CheckSquare, Square, MinusSquare,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────
interface Question {
  _id:       string;
  id:        string;
  texto:     string;
  opciones:  string[];
  correcta:  number;
  categoria: string;
  activa:    boolean;
  createdAt: string;
}

interface CatStat { _id: string; count: number; }
interface Toast   { id: number; type: "success" | "error" | "info"; message: string; }

// ✅ CORREGIDO: apunta al backend real
const API = "https://nakama-backend-render.onrender.com";

const CATEGORIAS = [
  "shonen", "seinen", "isekai", "romance", "mecha",
  "clasico", "actual", "peliculas", "personajes", "opening",
];

const CAT_EMOJI: Record<string, string> = {
  shonen:"⚔️", seinen:"🎭", isekai:"🌀", romance:"💞", mecha:"🤖",
  clasico:"📼", actual:"✨", peliculas:"🎬", personajes:"🦸", opening:"🎵",
};

const LETRAS = ["A", "B", "C", "D"];

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("nakama_token") : null;
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> || {}),
    },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Error de servidor");
  return data;
}

// ════════════════════════════════════════════════════════════
export default function CategoriaGamePage() {
  const [questions,   setQuestions]   = useState<Question[]>([]);
  const [catStats,    setCatStats]    = useState<CatStat[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [filterCat,   setFilterCat]   = useState<string>("all");
  const [filterAct,   setFilterAct]   = useState<string>("all");
  const [page,        setPage]        = useState(1);
  const [toasts,      setToasts]      = useState<Toast[]>([]);

  // ── Selección múltiple ───────────────────────────────────
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Modales
  const [showUpload,   setShowUpload]   = useState(false);
  const [editQ,        setEditQ]        = useState<Question | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (filterCat !== "all") params.set("categoria", filterCat);
      if (filterAct !== "all") params.set("activa",    filterAct);
      const [qRes, catRes] = await Promise.all([
        apiFetch(`/questions?${params}`),
        apiFetch("/questions/by-categoria"),
      ]);
      setQuestions(qRes.questions);
      setTotal(qRes.total);
      setCatStats(catRes);
      // Limpiar selección al recargar
      setSelected(new Set());
    } catch (e: any) {
      addToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [page, filterCat, filterAct, addToast]);

  useEffect(() => { load(); }, [load]);

  // ── Selección ────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allCurrentSelected = questions.length > 0 && questions.every(q => selected.has(q._id));
  const someSelected       = selected.size > 0 && !allCurrentSelected;

  const toggleSelectAll = () => {
    if (allCurrentSelected) {
      // Deseleccionar todos los de la página actual
      setSelected(prev => {
        const next = new Set(prev);
        questions.forEach(q => next.delete(q._id));
        return next;
      });
    } else {
      // Seleccionar todos los de la página actual
      setSelected(prev => {
        const next = new Set(prev);
        questions.forEach(q => next.add(q._id));
        return next;
      });
    }
  };

  // ── Eliminar múltiple ────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`¿Eliminar ${selected.size} pregunta${selected.size > 1 ? "s" : ""}? Esta acción no se puede deshacer.`)) return;
    setBulkDeleting(true);
    let ok = 0, fail = 0;
    // Eliminar en paralelo (máx 5 a la vez para no saturar)
    const ids = [...selected];
    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);
      await Promise.all(batch.map(id =>
        apiFetch(`/questions/${id}`, { method: "DELETE" })
          .then(() => ok++)
          .catch(() => fail++)
      ));
    }
    setBulkDeleting(false);
    setSelected(new Set());
    addToast(
      fail === 0
        ? `${ok} pregunta${ok > 1 ? "s" : ""} eliminada${ok > 1 ? "s" : ""}`
        : `${ok} eliminada${ok > 1 ? "s" : ""}, ${fail} fallida${fail > 1 ? "s" : ""}`,
      fail === 0 ? "success" : "error"
    );
    load();
  };

  // ── Eliminar individual ──────────────────────────────────
  const handleDelete = async (q: Question) => {
    if (!confirm(`¿Eliminar "${q.texto.slice(0, 50)}…"?`)) return;
    try {
      await apiFetch(`/questions/${q._id}`, { method: "DELETE" });
      addToast("Pregunta eliminada", "success");
      load();
    } catch (e: any) { addToast(e.message, "error"); }
  };

  const handleToggleActiva = async (q: Question) => {
    try {
      await apiFetch(`/questions/${q._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !q.activa }),
      });
      addToast(q.activa ? "Pregunta desactivada" : "Pregunta activada", "info");
      load();
    } catch (e: any) { addToast(e.message, "error"); }
  };

  const LIMIT      = 30;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ minHeight:"100vh", background:"#080810", color:"#fff", fontFamily:"'Segoe UI', sans-serif" }}>

      {/* ── Header ── */}
      <header style={{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <Swords size={18} color="#f97316" />
          <span style={{ fontFamily:"'Arial Black', sans-serif", fontWeight:900, letterSpacing:"0.1em", fontSize:"0.9rem", color:"#f97316" }}>NAKAMA</span>
          <span style={{ color:"rgba(255,255,255,0.25)", fontSize:"0.75rem" }}>/</span>
          <BookOpen size={14} color="#00c8ff" />
          <span style={{ fontSize:"0.82rem", color:"#00c8ff", fontWeight:600 }}>Banco de preguntas</span>
        </div>
        <a href="/dashboard" style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)", fontSize:"0.75rem", textDecoration:"none" }}>
          <House size={13} /> Dashboard
        </a>
      </header>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 20px" }}>

        {/* ── Stats por categoría ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:10, marginBottom:28 }}>
          {CATEGORIAS.map(cat => {
            const stat    = catStats.find(s => s._id === cat);
            const active  = filterCat === cat;
            return (
              <button key={cat} onClick={() => { setFilterCat(active ? "all" : cat); setPage(1); }} style={{ background: active ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)", border:`1px solid ${active ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.07)"}`, borderRadius:10, padding:"10px 12px", cursor:"pointer", textAlign:"left", color:"#fff", transition:"all 0.2s" }}>
                <div style={{ fontSize:"1.2rem", marginBottom:4 }}>{CAT_EMOJI[cat] ?? "❓"}</div>
                <div style={{ fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color: active ? "#f97316" : "rgba(255,255,255,0.6)" }}>{cat}</div>
                <div style={{ fontSize:"1.1rem", fontWeight:900, color: active ? "#f97316" : "#00c8ff", lineHeight:1.2 }}>{stat?.count ?? 0}</div>
              </button>
            );
          })}
          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"10px 12px", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap:4 }}>
            <BarChart2 size={20} color="rgba(255,255,255,0.25)" />
            <div style={{ fontSize:"1.3rem", fontWeight:900, color:"#fff" }}>{catStats.reduce((a,s) => a + s.count, 0)}</div>
            <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.3)", textTransform:"uppercase" }}>Total</div>
          </div>
        </div>

        {/* ── Barra de acciones ── */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: selected.size > 0 ? 10 : 20, flexWrap:"wrap" }}>
          <select value={filterAct} onChange={e => { setFilterAct(e.target.value); setPage(1); }} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"#fff", borderRadius:8, padding:"8px 12px", fontSize:"0.8rem", cursor:"pointer" }}>
            <option value="all">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>

          <button onClick={() => load()} style={btnStyle("#1a1a2e","rgba(255,255,255,0.12)")}>
            <RefreshCw size={13} /> Actualizar
          </button>

          {/* ✅ Seleccionar todos de la página */}
          {questions.length > 0 && (
            <button onClick={toggleSelectAll} style={btnStyle("rgba(255,255,255,0.04)","rgba(255,255,255,0.15)")}>
              {allCurrentSelected
                ? <CheckSquare size={13} color="#f97316" />
                : someSelected
                  ? <MinusSquare size={13} color="#f59e0b" />
                  : <Square size={13} />
              }
              {allCurrentSelected ? "Deseleccionar página" : "Seleccionar página"}
            </button>
          )}

          <div style={{ flex:1 }} />

          <button onClick={() => setShowCreate(true)} style={btnStyle("rgba(34,197,94,0.15)","rgba(34,197,94,0.4)","#22c55e")}>
            <Plus size={13} /> Nueva pregunta
          </button>
          <button onClick={() => setShowUpload(true)} style={btnStyle("rgba(249,115,22,0.15)","rgba(249,115,22,0.4)","#f97316")}>
            <Upload size={13} /> Subir Word (.docx)
          </button>
        </div>

        {/* ✅ Barra de acciones masivas — aparece solo cuando hay selección */}
        {selected.size > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, padding:"12px 16px", borderRadius:10, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", animation:"fadeIn 0.2s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <CheckSquare size={15} color="#ef4444" />
              <span style={{ fontSize:"0.85rem", fontWeight:700, color:"#ef4444" }}>
                {selected.size} seleccionada{selected.size > 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{ ...btnStyle("rgba(239,68,68,0.15)","rgba(239,68,68,0.5)","#ef4444", true), marginLeft:"auto" }}
            >
              {bulkDeleting
                ? <><Loader2 size={13} style={{ animation:"spin 0.6s linear infinite" }} /> Eliminando...</>
                : <><Trash2 size={13} /> Eliminar {selected.size} seleccionada{selected.size > 1 ? "s" : ""}</>
              }
            </button>
            <button
              onClick={() => setSelected(new Set())}
              style={btnStyle("rgba(255,255,255,0.04)","rgba(255,255,255,0.12)")}
            >
              <X size={13} /> Cancelar
            </button>
          </div>
        )}

        {/* ── Lista de preguntas ── */}
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:60 }}>
            <Loader2 size={36} style={{ animation:"spin 0.6s linear infinite", color:"#f97316" }} />
          </div>
        ) : questions.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, color:"rgba(255,255,255,0.25)" }}>
            <BookOpen size={48} strokeWidth={1} style={{ marginBottom:16 }} />
            <p>No hay preguntas en este filtro.</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {questions.map(q => (
              <QuestionRow
                key={q._id}
                question={q}
                expanded={expandedId === q._id}
                selected={selected.has(q._id)}
                onSelect={() => toggleSelect(q._id)}
                onToggleExpand={() => {
                  // No expandir si se hace click en el checkbox
                  setExpandedId(expandedId === q._id ? null : q._id);
                }}
                onEdit={() => setEditQ(q)}
                onDelete={() => handleDelete(q)}
                onToggleActiva={() => handleToggleActiva(q)}
              />
            ))}
          </div>
        )}

        {/* ── Paginación ── */}
        {totalPages > 1 && (
          <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:24 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{ width:34, height:34, borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:"0.82rem", background: p === page ? "#f97316" : "rgba(255,255,255,0.06)", color: p === page ? "#fff" : "rgba(255,255,255,0.5)" }}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); addToast("¡Preguntas importadas!", "success"); load(); }}
          addToast={addToast}
        />
      )}
      {(editQ || showCreate) && (
        <QuestionFormModal
          question={editQ ?? undefined}
          onClose={() => { setEditQ(null); setShowCreate(false); }}
          onSuccess={() => { setEditQ(null); setShowCreate(false); load(); addToast(editQ ? "Pregunta actualizada" : "Pregunta creada", "success"); }}
          addToast={addToast}
        />
      )}

      {/* ── Toasts ── */}
      <div style={{ position:"fixed", bottom:24, right:24, display:"flex", flexDirection:"column", gap:8, zIndex:9999 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, background: t.type==="success" ? "rgba(34,197,94,0.15)" : t.type==="error" ? "rgba(239,68,68,0.15)" : "rgba(0,200,255,0.1)", border:`1px solid ${t.type==="success" ? "rgba(34,197,94,0.4)" : t.type==="error" ? "rgba(239,68,68,0.4)" : "rgba(0,200,255,0.3)"}`, borderRadius:10, padding:"10px 16px", fontSize:"0.82rem", backdropFilter:"blur(8px)", color:"#fff", maxWidth:340 }}>
            {t.type==="success" ? <CheckCircle2 size={14} color="#22c55e" /> : t.type==="error" ? <XCircle size={14} color="#ef4444" /> : <AlertTriangle size={14} color="#00c8ff" />}
            {t.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FILA DE PREGUNTA — con checkbox de selección
// ════════════════════════════════════════════════════════════
function QuestionRow({ question: q, expanded, selected, onSelect, onToggleExpand, onEdit, onDelete, onToggleActiva }: {
  question: Question; expanded: boolean; selected: boolean;
  onSelect: () => void; onToggleExpand: () => void;
  onEdit: () => void; onDelete: () => void; onToggleActiva: () => void;
}) {
  return (
    <div style={{ background: selected ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.03)", border:`1px solid ${selected ? "rgba(249,115,22,0.35)" : q.activa ? "rgba(255,255,255,0.08)" : "rgba(239,68,68,0.15)"}`, borderRadius:10, overflow:"hidden", opacity: q.activa ? 1 : 0.55, transition:"all 0.15s" }}>

      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px" }}>

        {/* ✅ Checkbox de selección — click no expande la fila */}
        <button
          onClick={e => { e.stopPropagation(); onSelect(); }}
          style={{ background:"none", border:"none", cursor:"pointer", padding:2, display:"flex", alignItems:"center", flexShrink:0, color: selected ? "#f97316" : "rgba(255,255,255,0.2)" }}
          title={selected ? "Deseleccionar" : "Seleccionar"}
        >
          {selected
            ? <CheckSquare size={16} color="#f97316" />
            : <Square      size={16} color="rgba(255,255,255,0.2)" />
          }
        </button>

        {/* Fila expandible */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, cursor:"pointer", minWidth:0 }} onClick={onToggleExpand}>
          <span style={{ fontSize:"1rem", flexShrink:0 }}>{CAT_EMOJI[q.categoria] ?? "❓"}</span>
          <span style={{ fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.35)", minWidth:66, flexShrink:0 }}>{q.categoria}</span>
          <span style={{ flex:1, fontSize:"0.82rem", color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{q.texto}</span>
          <span style={{ fontSize:"0.7rem", color:"#22c55e", fontWeight:700, flexShrink:0 }}>✓ {LETRAS[q.correcta]}</span>
          {expanded
            ? <ChevronUp   size={14} color="rgba(255,255,255,0.3)" style={{ flexShrink:0 }} />
            : <ChevronDown size={14} color="rgba(255,255,255,0.3)" style={{ flexShrink:0 }} />
          }
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"12px 14px 14px 38px" }}>
          <p style={{ margin:"0 0 12px", fontSize:"0.85rem", color:"rgba(255,255,255,0.8)", lineHeight:1.5 }}>{q.texto}</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:14 }}>
            {q.opciones.map((opt, i) => (
              <div key={i} style={{ padding:"8px 12px", borderRadius:8, background: i===q.correcta ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)", border:`1px solid ${i===q.correcta ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.07)"}`, fontSize:"0.78rem", color: i===q.correcta ? "#22c55e" : "rgba(255,255,255,0.65)", display:"flex", gap:8 }}>
                <span style={{ fontWeight:900, flexShrink:0 }}>{LETRAS[i]})</span>
                <span>{opt}</span>
                {i===q.correcta && <span style={{ marginLeft:"auto" }}>✓</span>}
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={onEdit} style={btnStyle("rgba(0,200,255,0.08)","rgba(0,200,255,0.3)","#00c8ff")}>
              <Pencil size={12} /> Editar
            </button>
            <button onClick={onToggleActiva} style={btnStyle(q.activa?"rgba(245,158,11,0.08)":"rgba(34,197,94,0.08)", q.activa?"rgba(245,158,11,0.3)":"rgba(34,197,94,0.3)", q.activa?"#f59e0b":"#22c55e")}>
              {q.activa ? "Desactivar" : "Activar"}
            </button>
            <button onClick={onDelete} style={btnStyle("rgba(239,68,68,0.08)","rgba(239,68,68,0.3)","#ef4444")}>
              <Trash2 size={12} /> Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MODAL: Subir Word
// ════════════════════════════════════════════════════════════
function UploadModal({ onClose, onSuccess, addToast }: {
  onClose: () => void; onSuccess: () => void; addToast: (m: string, t?: any) => void;
}) {
  const [file,    setFile]    = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setResult(null);
    try {
      const token = localStorage.getItem("nakama_token");
      const fd    = new FormData();
      fd.append("word", file);
      const res  = await fetch(`${API}/questions/upload`, {
        method: "POST",
        headers: token ? { Authorization:`Bearer ${token}` } : {},
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResult(data);
      if (data.saved > 0) setTimeout(onSuccess, 1800);
    } catch (e: any) {
      addToast(e.message, "error");
    } finally { setLoading(false); }
  };

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalBoxStyle}>
        <div style={modalHeaderStyle}>
          <span style={{ display:"flex", alignItems:"center", gap:8, fontWeight:700 }}><FileText size={16} color="#f97316" /> Importar desde Word</span>
          <button onClick={onClose} style={closeBtnStyle}><X size={15} /></button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          <div
            onClick={() => inputRef.current?.click()}
            style={{ border:"2px dashed rgba(249,115,22,0.3)", borderRadius:12, padding:"28px 20px", textAlign:"center", cursor:"pointer", background:"rgba(249,115,22,0.04)" }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
          >
            <Upload size={32} color="rgba(249,115,22,0.5)" style={{ marginBottom:8 }} />
            <div style={{ fontSize:"0.85rem", color:"rgba(255,255,255,0.6)" }}>
              {file ? <span style={{ color:"#f97316", fontWeight:700 }}>{file.name}</span> : "Arrastrá tu .docx o hacé click"}
            </div>
            <div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.25)", marginTop:6 }}>Solo .docx — Máx. 10 MB</div>
          </div>
          <input ref={inputRef} type="file" accept=".docx,.doc" style={{ display:"none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />

          <div style={{ background:"rgba(0,200,255,0.05)", border:"1px solid rgba(0,200,255,0.15)", borderRadius:8, padding:"12px 14px", fontSize:"0.75rem", color:"rgba(255,255,255,0.45)", lineHeight:1.8 }}>
            <strong style={{ color:"#00c8ff", display:"block", marginBottom:4 }}>Formato por pregunta:</strong>
            Pregunta N  [CATEGORIA: shonen]<br/>
            Pregunta: texto del enunciado<br/>
            A) opción A · B) opción B · C) opción C · D) opción D<br/>
            CORRECTA: A
          </div>

          {result && (
            <div style={{ background: result.saved>0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border:`1px solid ${result.saved>0 ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius:8, padding:"12px 14px", fontSize:"0.8rem" }}>
              <div style={{ fontWeight:700, color: result.saved>0 ? "#22c55e" : "#ef4444", marginBottom:6 }}>
                {result.saved>0 ? `✓ ${result.saved} pregunta${result.saved>1?"s":""} importada${result.saved>1?"s":""}` : "Sin preguntas válidas"}
                {result.skipped>0 && <span style={{ color:"#f59e0b", marginLeft:8 }}>{result.skipped} omitida{result.skipped>1?"s":""}</span>}
              </div>
              {result.errors?.length > 0 && (
                <div style={{ maxHeight:120, overflowY:"auto", color:"rgba(255,255,255,0.4)", fontSize:"0.72rem", lineHeight:1.7 }}>
                  {result.errors.map((e: string, i: number) => <div key={i}>• {e}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={modalFooterStyle}>
          <button onClick={onClose} style={btnStyle("rgba(255,255,255,0.05)","rgba(255,255,255,0.12)")}>Cancelar</button>
          <button onClick={handleUpload} disabled={!file||loading} style={btnStyle("rgba(249,115,22,0.2)","rgba(249,115,22,0.5)","#f97316",true)}>
            {loading ? <><Loader2 size={13} style={{ animation:"spin 0.6s linear infinite" }}/> Procesando…</> : <><Upload size={13}/> Importar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MODAL: Crear / Editar pregunta
// ════════════════════════════════════════════════════════════
function QuestionFormModal({ question, onClose, onSuccess, addToast }: {
  question?: Question; onClose: () => void; onSuccess: () => void; addToast: (m: string, t?: any) => void;
}) {
  const isEdit = !!question;
  const [form, setForm] = useState({
    texto:     question?.texto          ?? "",
    opA:       question?.opciones?.[0]  ?? "",
    opB:       question?.opciones?.[1]  ?? "",
    opC:       question?.opciones?.[2]  ?? "",
    opD:       question?.opciones?.[3]  ?? "",
    correcta:  question?.correcta       ?? 0,
    categoria: question?.categoria      ?? "shonen",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.texto.trim() || !form.opA || !form.opB || !form.opC || !form.opD)
      return addToast("Completá todos los campos", "error");
    setSaving(true);
    const body = JSON.stringify({ texto:form.texto, opciones:[form.opA,form.opB,form.opC,form.opD], correcta:form.correcta, categoria:form.categoria });
    try {
      if (isEdit) await apiFetch(`/questions/${question!._id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body });
      else        await apiFetch("/questions",                   { method:"POST",  headers:{"Content-Type":"application/json"}, body });
      onSuccess();
    } catch (e: any) { addToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <div style={overlayStyle} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ ...modalBoxStyle, maxWidth:540 }}>
        <div style={modalHeaderStyle}>
          <span style={{ display:"flex", alignItems:"center", gap:8, fontWeight:700 }}>
            {isEdit ? <Pencil size={15} color="#00c8ff"/> : <Plus size={15} color="#22c55e"/>}
            {isEdit ? "Editar pregunta" : "Nueva pregunta"}
          </span>
          <button onClick={onClose} style={closeBtnStyle}><X size={15}/></button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={labelStyle}>Categoría</label>
            <select value={form.categoria} onChange={e => setForm(f => ({...f, categoria:e.target.value}))} style={inputStyle}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Pregunta</label>
            <textarea value={form.texto} onChange={e => setForm(f => ({...f,texto:e.target.value}))} rows={3} placeholder="Escribe el enunciado…" style={{ ...inputStyle, resize:"vertical" }} maxLength={500}/>
            <p style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.25)", margin:"4px 0 0" }}>{form.texto.length}/500</p>
          </div>
          {(["opA","opB","opC","opD"] as const).map((key, i) => (
            <div key={key} style={{ display:"flex", gap:10, alignItems:"center" }}>
              <button
                onClick={() => setForm(f => ({...f, correcta:i}))}
                style={{ width:28, height:28, borderRadius:7, background: form.correcta===i ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)", border:`1.5px solid ${form.correcta===i ? "#22c55e" : "rgba(255,255,255,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", fontWeight:900, color: form.correcta===i ? "#22c55e" : "rgba(255,255,255,0.4)", cursor:"pointer", flexShrink:0 }}
              >
                {LETRAS[i]}
              </button>
              <input value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} placeholder={`Opción ${LETRAS[i]}`} style={{ ...inputStyle, flex:1 }}/>
            </div>
          ))}
          <p style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.3)", margin:0 }}>Hacé click en la letra para marcar la respuesta correcta.</p>
        </div>
        <div style={modalFooterStyle}>
          <button onClick={onClose} style={btnStyle("rgba(255,255,255,0.05)","rgba(255,255,255,0.12)")}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={btnStyle(isEdit?"rgba(0,200,255,0.12)":"rgba(34,197,94,0.12)", isEdit?"rgba(0,200,255,0.4)":"rgba(34,197,94,0.4)", isEdit?"#00c8ff":"#22c55e", true)}>
            {saving ? <><Loader2 size={13} style={{ animation:"spin 0.6s linear infinite" }}/> Guardando…</> : <><Save size={13}/> {isEdit?"Guardar cambios":"Crear pregunta"}</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Helpers de estilo ─────────────────────────────────────────
function btnStyle(bg: string, border: string, color = "rgba(255,255,255,0.7)", bold = false): React.CSSProperties {
  return { display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, background:bg, border:`1px solid ${border}`, color, fontSize:"0.78rem", fontWeight: bold?700:500, cursor:"pointer", fontFamily:"'Segoe UI', sans-serif", transition:"all 0.15s" };
}

const overlayStyle: React.CSSProperties = { position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9000, padding:20, backdropFilter:"blur(4px)" };
const modalBoxStyle: React.CSSProperties = { background:"#0d0d1a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.6)" };
const modalHeaderStyle: React.CSSProperties = { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 24px", borderBottom:"1px solid rgba(255,255,255,0.08)", fontSize:"0.9rem", color:"#fff" };
const modalFooterStyle: React.CSSProperties = { display:"flex", gap:10, justifyContent:"flex-end", padding:"14px 24px", borderTop:"1px solid rgba(255,255,255,0.08)" };
const closeBtnStyle: React.CSSProperties = { background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", padding:4, display:"flex", alignItems:"center" };
const labelStyle: React.CSSProperties = { display:"block", fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"rgba(255,255,255,0.4)", marginBottom:6 };
const inputStyle: React.CSSProperties = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#fff", padding:"9px 12px", fontSize:"0.83rem", fontFamily:"'Segoe UI', sans-serif", boxSizing:"border-box" };