// ═══════════════════════════════════════════════════════════
// hooks/useAdminNotifications.ts
//
// REESCRITO: se eliminó useSyncExternalStore por completo.
// Usaba getServerSnapshot que Next.js/Turbopack ejecuta en SSR,
// donde localStorage no existe → array nuevo en cada llamada → loop.
//
// Reemplazado por useState + suscripción manual al store singleton.
// Mismo comportamiento, sin el error de infinite loop.
// ═══════════════════════════════════════════════════════════
import { useEffect, useCallback, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface AdminNotif {
  id: string;
  title: string;
  message: string;
  type: "warn" | "ban" | "freeze" | "role" | "admin";
  icon: string;
  chatId?: string;
  link?: string;
  createdAt: string;
  read: boolean;
  fromSuperAdmin?: boolean;
  fromSystem?: boolean;
  senderName?: string;
}

// ─── Config ───────────────────────────────────────────────
const STORAGE_KEY = "nakama_admin_notifs";
const SERVER_URL  =  "https://nakama-backend-render.onrender.com";
const SOCKET_URL  = process.env.NEXT_PUBLIC_SOCKET_URL || SERVER_URL;
const NOTIF_PATH  = "/notifications";
const NOTIF_BASE  = `${SERVER_URL}${NOTIF_PATH}`;

// ─── Storage (solo cliente) ───────────────────────────────
function loadFromStorage(): AdminNotif[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveToStorage(notifs: AdminNotif[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 100))); }
  catch {}
}

// ─── normalize ────────────────────────────────────────────
function isValidId(v: unknown): v is string {
  if (!v) return false;
  const s = String(v).trim();
  if (!s) return false;
  if (/^\d{10,}$/.test(s)) return false;
  return true;
}

function normalize(n: Record<string, unknown>): AdminNotif | null {
  const rawId = n.id ?? n._id;
  if (!isValidId(rawId)) {
    console.warn("[notifications] payload sin _id válido, descartando:", n);
    return null;
  }
  return {
    id:             String(rawId),
    title:          String(n.title   || "Mensaje de Nakama"),
    message:        String(n.message || n.body || ""),
    type:           (n.type || "admin") as AdminNotif["type"],
    icon:           String(n.icon    || "🔔"),
    chatId:         n.chatId         as string | undefined,
    link:           n.link           as string | undefined,
    createdAt:      String(n.createdAt || new Date().toISOString()),
    read:           Boolean(n.read),
    fromSystem:     Boolean(n.fromSystem),
    fromSuperAdmin: Boolean(n.fromSuperAdmin),
    senderName:     n.senderName     as string | undefined,
  };
}

function contentKey(n: AdminNotif): string {
  return `${n.title}|${n.message}|${n.createdAt}`;
}

// ─── apiFetch ─────────────────────────────────────────────
async function apiFetch(url: string, method: string, token: string, body?: object) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════
// STORE SINGLETON
// Solo se inicializa en cliente (typeof window check).
// ═══════════════════════════════════════════════════════════
type Listener = (notifs: AdminNotif[]) => void;

const store = (() => {
  let notifs: AdminNotif[]      = [];
  let hydrated                  = false; // cargado desde localStorage una vez
  let socket: Socket | null     = null;
  let fetchedFor: string | null = null;
  const listeners               = new Set<Listener>();

  function hydrateOnce() {
    if (hydrated) return;
    hydrated = true;
    notifs   = loadFromStorage();
  }

  function getNotifs(): AdminNotif[] {
    return notifs;
  }

  // Suscripción: el listener recibe el array actualizado directamente
  function subscribe(cb: Listener): () => void {
    hydrateOnce();
    cb(notifs); // emit inmediato con estado actual
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function emit() {
    listeners.forEach((cb) => cb(notifs));
  }

  function set(updater: (prev: AdminNotif[]) => AdminNotif[]) {
    const next = updater(notifs);
    if (next === notifs) return;
    notifs = next;
    saveToStorage(notifs);
    emit();
  }

  function init(token: string) {
    hydrateOnce();
    if (fetchedFor === token && socket?.connected) return;

    if (socket && fetchedFor !== token) {
      socket.disconnect();
      socket = null;
    }

    if (fetchedFor !== token) {
      fetchedFor = token;

      apiFetch(NOTIF_BASE, "GET", token)
        .then((json) => {
          const dbNotifs = (json.notifications ?? [])
            .map(normalize)
            .filter(Boolean) as AdminNotif[];

          set((prev) => {
            const dbIds         = new Set(dbNotifs.map((n) => n.id));
            const dbContentKeys = new Set(dbNotifs.map(contentKey));
            const onlyInMemory  = prev.filter(
              (n) => !dbIds.has(n.id) && !dbContentKeys.has(contentKey(n))
            );
            return [...dbNotifs, ...onlyInMemory].slice(0, 100);
          });
        })
        .catch((err) => console.error("[notifications] fetch error:", err));
    }

    if (!socket || !socket.connected) {
      socket = io(SOCKET_URL, {
        auth:       { token },
        transports: ["websocket"],
        autoConnect: true,
      });

      const handleIncoming = (payload: Record<string, unknown>) => {
        const notif = normalize(payload);
        if (!notif) return;
        set((prev) => {
          if (prev.find((n) => n.id === notif.id)) return prev;
          if (prev.find((n) => contentKey(n) === contentKey(notif))) return prev;
          return [notif, ...prev].slice(0, 100);
        });
      };

      socket.off("notification").on("notification", handleIncoming);
      socket.off("admin:notification").on("admin:notification", handleIncoming);
    }
  }

  return { subscribe, getNotifs, set, init };
})();

// ═══════════════════════════════════════════════════════════
// Hook — sin useSyncExternalStore
// ═══════════════════════════════════════════════════════════
export function useAdminNotifications(token: string | null) {
  // Iniciar con array vacío (seguro para SSR), hidratar en cliente via suscripción
  const [notifs, setNotifs] = useState<AdminNotif[]>([]);

  const notifsRef = useRef<AdminNotif[]>(notifs);
  useEffect(() => { notifsRef.current = notifs; }, [notifs]);

  // Suscribirse al store — solo en cliente
  useEffect(() => {
    const unsub = store.subscribe((updated) => {
      setNotifs([...updated]); // nueva referencia para que React detecte el cambio
    });
    return unsub;
  }, []);

  // Inicializar socket + fetch cuando hay token
  useEffect(() => {
    if (!token) return;
    store.init(token);
  }, [token]);

  const unread = notifs.filter((n) => !n.read).length;

  // ── markOneRead ──────────────────────────────────────────
  const markOneRead = useCallback(async (id: string) => {
    store.set((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (!token) return;
    try {
      await apiFetch(`${NOTIF_BASE}/${id}/read`, "PATCH", token);
    } catch {
      const original = notifsRef.current.find((n) => n.id === id);
      if (original) {
        store.set((prev) => prev.map((n) => (n.id === id ? { ...n, read: original.read } : n)));
      }
    }
  }, [token]);

  // ── markAllRead ──────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    store.set((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!token) return;
    try {
      await apiFetch(`${NOTIF_BASE}/read-all`, "PATCH", token);
    } catch (e) {
      console.error("[notifications] markAllRead error:", e);
    }
  }, [token]);

  // ── deleteOne — API FIRST ────────────────────────────────
  const deleteOne = useCallback(async (id: string) => {
    if (!id) { console.warn("[deleteOne] id vacío"); return; }

    const looksLikeObjectId = /^[a-f\d]{24}$/i.test(id);
    if (!looksLikeObjectId) {
      console.warn(`[deleteOne] id "${id}" no parece ObjectId — borrando solo local`);
      store.set((prev) => prev.filter((n) => n.id !== id));
      return;
    }

    if (!token) { store.set((prev) => prev.filter((n) => n.id !== id)); return; }

    try {
      const json = await apiFetch(`${NOTIF_BASE}/${id}`, "DELETE", token);
      if (json.ok) {
        store.set((prev) => prev.filter((n) => n.id !== id));
      } else {
        console.error("[deleteOne] server ok:false →", json.message);
      }
    } catch (err) {
      console.error("[deleteOne] error:", err);
      if (String(err).includes("404")) {
        store.set((prev) => prev.filter((n) => n.id !== id));
      }
    }
  }, [token]);

  // ── deleteAll — API FIRST ────────────────────────────────
  const deleteAll = useCallback(async () => {
    if (!token) { store.set(() => []); return; }
    try {
      const json = await apiFetch(NOTIF_BASE, "DELETE", token);
      if (json.ok) store.set(() => []);
    } catch (e) {
      console.error("[deleteAll] error:", e);
    }
  }, [token]);

  return {
    notifs,
    unread,
    markOneRead,
    markAllRead,
    deleteOne,
    deleteAll,
    clearAll: deleteAll,
  };
}
