"use client";

// ═══════════════════════════════════════════════════════════
// context/AuthContext.tsx
// ═══════════════════════════════════════════════════════════

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
  type ReactNode,
} from "react";

const API = "https://nakama-vercel-backend.vercel.app";

// Rutas que NO deben redirigir a "/" aunque el token esté vencido
const PUBLIC_PATHS = ["/", "/login", "/registro", "/registro/google"];

export interface NakamaUser {
  id:                     string;
  username:               string;
  email:                  string;
  role:                   "user" | "user-pro" | "user-premium" | "moderator" | "admin" | "superadmin";
  avatarUrl:              string;
  profileVideo:           null | { url: string; thumbnailUrl: string };
  bio:                    string;
  displayName:            string;
  rank:                   string;
  followersCount:         number;
  followingCount:         number;
  isOnline:               boolean;
  acceptedTermsVersion:   string;
  acceptedPrivacyVersion: string;
  pendingTermsAcceptance: boolean;
  subscription:           { type: "free" | "pro" | "premium"; active: boolean };
  // ── Stats de batalla ──────────────────────────────────
  victorias:              number;
  derrotas:               number;
  empates:                number;
}

interface AuthContextShape {
  user:            NakamaUser | null;
  token:           string | null;
  loading:         boolean;
  isAuthenticated: boolean;
  login:           (token: string) => Promise<void>;
  logout:          () => void;
  refreshUser:     () => Promise<void>;
}

const AuthContext = createContext<AuthContextShape>({
  user: null, token: null, loading: true, isAuthenticated: false,
  login: async () => {}, logout: () => {}, refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<NakamaUser | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Intenta obtener un nuevo access token usando la refresh cookie ──
  const tryRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method:      "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.token ?? null;
    } catch {
      return null;
    }
  }, []);

  // ── Limpia estado y redirige a "/" solo si estaba en ruta protegida ──
  const forceLogout = useCallback(() => {
    localStorage.removeItem("nakama_token");
    setToken(null);
    setUser(null);
    const isPublic = PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));
    if (!isPublic) {
      window.location.href = "/";
    }
  }, []);

  const fetchMe = useCallback(async (tkn: string): Promise<NakamaUser | null> => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers:     { Authorization: `Bearer ${tkn}` },
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = await res.json();
      const data = json.user ?? json ?? null;
      if (!data) return null;
      return {
        ...data,
        victorias: data.victorias ?? 0,
        derrotas:  data.derrotas  ?? 0,
        empates:   data.empates   ?? 0,
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken  = urlParams.get("token");
        if (urlToken) {
          localStorage.setItem("nakama_token", urlToken);
          window.history.replaceState({}, "", window.location.pathname);
        }

        const savedToken = urlToken || localStorage.getItem("nakama_token");

        if (savedToken) {
          const me = await fetchMe(savedToken);
          if (me) {
            // Token aún válido — todo bien
            setToken(savedToken);
            setUser(me);
            return;
          }
        }

        // Sin token guardado o token inválido/expirado → intentar refresh silencioso
        const newToken = await tryRefresh();
        if (newToken) {
          localStorage.setItem("nakama_token", newToken);
          const me2 = await fetchMe(newToken);
          if (me2) {
            setToken(newToken);
            setUser(me2);
            return;
          }
        }

        // Refresh también falló → limpiar y redirigir si es necesario
        if (savedToken) {
          // Había un token guardado pero ya no sirve → forceLogout
          forceLogout();
        }
        // Si nunca hubo token no hacemos nada (usuario simplemente no logueado)
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [fetchMe, tryRefresh, forceLogout]);

  const login = useCallback(async (tkn: string) => {
    localStorage.setItem("nakama_token", tkn);
    setToken(tkn);
    const me = await fetchMe(tkn);
    if (me) setUser(me);
  }, [fetchMe]);

  const logout = useCallback(() => {
    fetch(`${API}/auth/logout`, {
      method:      "POST",
      credentials: "include",
      headers:     token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});

    localStorage.removeItem("nakama_token");
    setToken(null);
    setUser(null);
    window.location.href = "/";
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const me = await fetchMe(token);
    if (me) {
      setUser(me);
      return;
    }
    // Token expiró mientras usaba la app → refresh silencioso
    const newToken = await tryRefresh();
    if (newToken) {
      localStorage.setItem("nakama_token", newToken);
      setToken(newToken);
      const me2 = await fetchMe(newToken);
      if (me2) { setUser(me2); return; }
    }
    // No se pudo recuperar → forceLogout
    forceLogout();
  }, [token, fetchMe, tryRefresh, forceLogout]);

  // ── useMemo evita que el objeto del contexto se recree en cada render,
  //    cortando el loop infinito que causaba re-renders en cascada.
  const contextValue = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  }), [user, token, loading, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
