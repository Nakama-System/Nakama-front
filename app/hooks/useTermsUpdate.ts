// ═══════════════════════════════════════════════════════════
// hooks/useTermsUpdate.ts — Nakama
//
// Detecta si el usuario tiene T&C pendientes de aceptar.
// Escucha el evento socket "terms:update_required" en tiempo real.
// ═══════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";

const API = "https://nakama-vercel-backend.vercel.app";

interface TermsData {
  termsVersion:   string;
  privacyVersion: string;
  termsText:      string;
  privacyText:    string;
  changesSummary: string;
  publishedAt:    string;
}

interface UseTermsUpdateReturn {
  hasPendingTerms:  boolean;
  activeTerms:      TermsData | null;
  loading:          boolean;
  accepting:        boolean;
  acceptTerms:      () => Promise<void>;
  error:            string;
}

export function useTermsUpdate(
  user: { pendingTermsAcceptance?: boolean } | null,
  socket: any | null,       // instancia de socket.io-client
  token: string | null
): UseTermsUpdateReturn {
  const [hasPendingTerms, setHasPendingTerms] = useState(
    user?.pendingTermsAcceptance ?? false
  );
  const [activeTerms, setActiveTerms] = useState<TermsData | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [accepting,  setAccepting]  = useState(false);
  const [error,      setError]      = useState("");

  // ── Cargar T&C activos cuando hay pendientes ──────────
  useEffect(() => {
    if (!hasPendingTerms) return;
    setLoading(true);
    fetch(`${API}/terms/active`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setActiveTerms(data.terms);
      })
      .catch(() => setError("No se pudieron cargar los términos."))
      .finally(() => setLoading(false));
  }, [hasPendingTerms]);

  // ── Escuchar socket para notificación en tiempo real ──
  useEffect(() => {
    if (!socket) return;

    const handleTermsUpdate = (data: {
      termsVersion: string;
      privacyVersion: string;
      changesSummary: string;
    }) => {
      setHasPendingTerms(true);
      // Recargar los términos completos
      fetch(`${API}/terms/active`)
        .then(r => r.json())
        .then(d => { if (d.success) setActiveTerms(d.terms); });
    };

    socket.on("terms:update_required", handleTermsUpdate);
    return () => socket.off("terms:update_required", handleTermsUpdate);
  }, [socket]);

  // ── Aceptar T&C ───────────────────────────────────────
  const acceptTerms = useCallback(async () => {
    if (!activeTerms || !token) return;
    setAccepting(true);
    setError("");
    try {
      const res = await fetch(`${API}/terms/accept`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          termsVersion:   activeTerms.termsVersion,
          privacyVersion: activeTerms.privacyVersion,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHasPendingTerms(false);
        setActiveTerms(null);
      } else {
        setError(data.message || "Error al aceptar.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setAccepting(false);
    }
  }, [activeTerms, token]);

  return { hasPendingTerms, activeTerms, loading, accepting, acceptTerms, error };
}
