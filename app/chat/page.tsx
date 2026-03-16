"use client";

// ═══════════════════════════════════════════════════════════
// app/chats/page.tsx — Nakama Chat (main page)
// Importa de ChatUIComponents y ChatSidebarComponents
// ═══════════════════════════════════════════════════════════

import MisComunidades from "../miscomunidades/page";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
import AdminNotifPanel from "../components/AdminNotifPanel";

import {
  MessageCircle,
  Users,
  Globe,
  Plus,
  Search,
  Home,
  X,
  Sparkles,
  Palette,
  Bell,
  BellRing,
  UserMinus,
  UserPlus,
  BookUser,
  Lock,
} from "lucide-react";

import { useAuth } from "../context/authContext";
import SocialSearch from "../components/SocialSearch";
import "../styles/chat.css";
import "../styles/agenda.css";
import "../styles/upload.css";

// ── Importar todos los componentes y tipos ────────────────
import {
  UserAvatar,
  ChatView,
  EphemeralViewer,
  ForwardModal,
  BlockReportModal,
  PrivacyModal,
  DEFAULT_EPHEMERAL,
  WALLPAPERS,
  type Message,
  type Conversation,
  type UploadedFile,
  type EphemeralConfig,
  type NakamaSocket,
} from "./ChatUIComponents";

import {
  AgendaSection,
  AddContactModal,
  ConvItem,
  NewChatModal,
  ThemeModal,
  THEMES_USER,
  THEMES_PRO,
  THEMES_PREMIUM,
  LIMITS,
  sourceConfig,
  type UserSuggestion,
} from "./ChatSidebarComponents";

// ── Tipos internos ────────────────────────────────────────
type RoomType = "private" | "group" | "community";
type Tab = "chats" | "grupos" | "comunidades" | "agenda";

interface ServerAttachment {
  type: "image" | "video" | "gif" | "audio" | "file";
  url: string; thumbnailUrl: string; width: number; height: number;
  duration: number; size: number; mimeType: string;
}
interface ServerMessage {
  id: string;
  sender: { _id: string; username: string; avatarUrl?: string; profileVideo?: { url: string }; role: string } | string;
  roomType: RoomType; roomId: string; text: string;
  attachment: ServerAttachment | null; replyTo: ServerMessage | null;
  reactions: { emoji: string; userIds: string[] }[];
  status: "sent" | "delivered" | "read"; readAt: string | null;
  isSystem: boolean; deleted: boolean; createdAt: string;
}
interface AckOk<T = undefined> { ok: true; data?: T; }
interface AckErr { ok: false; error: string; }
type Ack<T = undefined> = AckOk<T> | AckErr;

const API = "https://nakama-backend-render.onrender.com";
const WS_URL = "https://nakama-backend-render.onrender.com";

// ── Helper: extrae videoSrc de cualquier objeto usuario/sugerencia ──
function getVideoSrc(obj: any): string | undefined {
  return (
    obj?.profileVideo?.url ||
    obj?.videoUrl ||
    obj?.profileVideoUrl ||
    undefined
  );
}

// ── Helper: determina si una URL es un video ──
function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

// ══════════════════════════════════════════════════════════
// useScrollBlur hook
// ══════════════════════════════════════════════════════════
function useScrollBlur(threshold = 60, debounceMs = 40) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollY = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const y = el.scrollTop;
        setHeaderScrolled(y > 4);
        if (y > lastScrollY.current && y > threshold) setHeaderHidden(true);
        else if (y < lastScrollY.current - 10) setHeaderHidden(false);
        lastScrollY.current = y;
      }, debounceMs);
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => { el.removeEventListener("scroll", handler); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [threshold, debounceMs]);

  return { containerRef, headerHidden, headerScrolled };
}

// ══════════════════════════════════════════════════════════
// Normalización de mensajes
// ══════════════════════════════════════════════════════════
function normalizeMessage(m: ServerMessage): Message {
  const senderObj = typeof m.sender === "object" ? m.sender : null;
  return {
    _id: m.id,
    senderId: senderObj?._id ?? (typeof m.sender === "string" ? m.sender : ""),
    senderName: senderObj?.username ?? "Sistema",
    senderAvatar: senderObj?.avatarUrl,
    // ✅ Siempre pasar el video del sender si existe
    senderVideo: senderObj?.profileVideo?.url,
    content: m.deleted ? "Mensaje eliminado" : m.text,
    type: m.attachment ? (m.attachment.type as Message["type"]) : "text",
    fileUrl: m.attachment?.url,
    thumbUrl: m.attachment?.thumbnailUrl,
    duration: m.attachment?.duration,
    reactions: m.reactions ?? [],
    status: m.status ?? "sent",
    isSystem: m.isSystem,
    deleted: m.deleted,
    createdAt: m.createdAt,
    read: m.status === "read",
  };
}

function upsertConv(prev: Conversation[], conv: Conversation): Conversation[] {
  const exists = prev.find((c) => c._id === conv._id);
  if (exists) return [{ ...exists, ...conv }, ...prev.filter((c) => c._id !== conv._id)];
  return [conv, ...prev];
}
function roomType(conv: Conversation): RoomType {
  return conv.type === "group" ? "group" : conv.type === "community" ? "community" : "private";
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function ChatsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const { containerRef: sidebarScrollRef, headerHidden, headerScrolled } = useScrollBlur(60, 40);

  const [tab, setTab] = useState<Tab>("chats");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [agendaIds, setAgendaIds] = useState<Set<string>>(new Set());
  const [showNewModal, setShowNewModal] = useState<null | "chat" | "grupo">(null);
  const [showSocialSearch, setShowSocialSearch] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [activeTheme, setActiveTheme] = useState("default");
  const [socketReady, setSocketReady] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [showBlockReport, setShowBlockReport] = useState(false);
  const [blockReportTarget, setBlockReportTarget] = useState<{ userId: string; username: string } | null>(null);
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [forwardingMsgs, setForwardingMsgs] = useState<Message[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [chatWallpapers, setChatWallpapers] = useState<Record<string, string>>({});
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [contacts, setContacts] = useState<UserSuggestion[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [viewingEphemeral, setViewingEphemeral] = useState<Message | null>(null);
  const [showNotifs, setShowNotifs] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("nakama_token") : null;

  const { notifs: adminNotifs, unread: unreadNotifs, markAllRead, markOneRead, clearAll } = useAdminNotifications(isAuthenticated ? token : null);

  const socketRef = useRef<NakamaSocket | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenMsgIds = useRef<Set<string>>(new Set());
  const activeConvRef = useRef<Conversation | null>(null);
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const role = (user?.role as keyof typeof LIMITS) || "user";
  const themes =
    role === "user-premium" || role === "admin" || role === "superadmin" ? THEMES_PREMIUM
    : role === "user-pro" || role === "moderator" ? THEMES_PRO
    : THEMES_USER;
  const currentTheme = themes.find((t) => t.id === activeTheme) || themes[0];

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nakama_wallpapers");
      if (saved) setChatWallpapers(JSON.parse(saved));
    } catch {}
  }, []);

  function setWallpaper(chatId: string, wallId: string) {
    const next = { ...chatWallpapers, [chatId]: wallId };
    setChatWallpapers(next);
    try { localStorage.setItem("nakama_wallpapers", JSON.stringify(next)); } catch {}
    setConversations((prev) => prev.map((c) => c._id === chatId ? { ...c, wallpaper: wallId } : c));
    if (activeConv?._id === chatId) setActiveConv((prev) => prev ? { ...prev, wallpaper: wallId } : prev);
  }

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

  const loadContacts = useCallback(() => {
    if (!user) return;
    setLoadingContacts(true);
    const token = localStorage.getItem("nakama_token");
    fetch(`${API}/chats/contacts`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const normalized = data.map((c: any) => ({ ...c, _id: c._id ?? c.userId ?? c.contactDocId })).filter((c: any) => !!c._id);
          setContacts(normalized);
          setAgendaIds(new Set(normalized.map((c: UserSuggestion) => c._id)));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, [user]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  async function handleAddContact(u: UserSuggestion) {
    const token = localStorage.getItem("nakama_token");
    try {
      const res = await fetch(`${API}/chats/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: u._id }),
      });
      if (!res.ok) return;
      setAgendaIds((prev) => new Set(prev).add(u._id));
      setContacts((prev) => prev.find((c) => c._id === u._id) ? prev : [...prev, u]);
      setSuggestions((prev) => prev.filter((x) => x._id !== u._id));
    } catch {}
  }

  async function handleRemoveContact(userId: string) {
    const token = localStorage.getItem("nakama_token");
    setAgendaIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
    setContacts((prev) => prev.filter((c) => c._id !== userId));
    try {
      await fetch(`${API}/chats/contacts/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } catch { loadContacts(); }
  }

  // ── Socket ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    import("socket.io-client").then(({ io }) => {
      const token = localStorage.getItem("nakama_token");
      const socket = io(WS_URL, { auth: { token }, transports: ["websocket"], reconnectionDelay: 1000 });

      socket.on("connect", () => {
        setSocketReady(true);
        const t = localStorage.getItem("nakama_token");
        fetch(`${API}/ephemeral/received`, { headers: { Authorization: `Bearer ${t}` } })
          .then((r) => r.json())
          .then((pending: any[]) => {
            if (!Array.isArray(pending)) return;
            for (const msg of pending) {
              const msgId = String(msg._id);
              if (seenMsgIds.current.has(msgId)) continue;
              seenMsgIds.current.add(msgId);
              const ephMsg: Message = {
                _id: msgId, senderId: msg.senderId, senderName: msg.senderName,
                senderAvatar: msg.senderAvatar, content: msg.caption || "",
                type: "ephemeral", fileUrl: msg.thumbnailUrl, thumbUrl: msg.thumbnailUrl,
                ephemeral: true, ephConfig: msg.config, ephViewed: false,
                reactions: [], status: "delivered", isSystem: false, deleted: false,
                createdAt: msg.createdAt, read: false,
              };
              const current = activeConvRef.current;
              if (current && String(msg.roomId) === current._id) {
                setMessages((prev) => { if (prev.some((m) => m._id === msgId)) return prev; return [...prev, ephMsg]; });
                scrollToBottom();
                setConversations((prev) => prev.map((c) => c._id === String(msg.roomId) ? { ...c, lastMessage: "🔥 Mensaje temporal", lastTime: "Ahora" } : c));
              } else {
                setConversations((prev) => prev.map((c) => c._id === String(msg.roomId) ? { ...c, lastMessage: "🔥 Mensaje temporal", lastTime: "Ahora", unread: (c.unread || 0) + 1 } : c));
              }
            }
          })
          .catch(() => {})
          .finally(() => {
            const current = activeConvRef.current;
            if (current) {
              socket.emit("room:join", { roomType: roomType(current), roomId: current._id }, (res: any) => {
                const msgs: ServerMessage[] = res?.ok ? (res.data?.messages ?? res.messages ?? []) : [];
                if (msgs.length > 0) {
                  msgs.forEach((m: ServerMessage) => seenMsgIds.current.add(String(m.id)));
                  setMessages(msgs.map(normalizeMessage));
                  setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }), 50);
                }
              });
            }
          });
      });

      socket.on("admin:notification", (notif: any) => {
        try {
          const stored = localStorage.getItem("nakama_admin_notifs");
          const prev = stored ? JSON.parse(stored) : [];
          const updated = [{ ...notif, read: false }, ...prev].slice(0, 50);
          localStorage.setItem("nakama_admin_notifs", JSON.stringify(updated));
          window.dispatchEvent(new StorageEvent("storage", { key: "nakama_admin_notifs", newValue: JSON.stringify(updated) }));
        } catch {}
      });

      socket.on("disconnect", () => setSocketReady(false));
      socket.on("community:added", () => window.dispatchEvent(new Event("nakama:community_added")));

      socket.on("message:new", (msg: ServerMessage) => {
        const current = activeConvRef.current;
        const msgId = String(msg.id);
        if (seenMsgIds.current.has(msgId)) return;
        seenMsgIds.current.add(msgId);
        const updatePreview = (inc: boolean) =>
          setConversations((prev) => prev.map((c) => c._id === String(msg.roomId) ? { ...c, lastMessage: msg.text || "[media]", lastTime: "Ahora", unread: inc ? (c.unread || 0) + 1 : c.unread } : c));
        if (current && String(msg.roomId) === current._id) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === msgId)) return prev;
            const tempIdx = prev.findIndex((m) => m._id.startsWith("temp_") && m.content === msg.text && m.senderId === (typeof msg.sender === "object" ? msg.sender._id : msg.sender));
            if (tempIdx >= 0) { const next = [...prev]; next[tempIdx] = normalizeMessage(msg); return next; }
            return [...prev, normalizeMessage(msg)];
          });
          scrollToBottom();
          updatePreview(false);
        } else { updatePreview(true); }
      });

      socket.on("message:delivered", ({ messageId }: { messageId: string }) => {
        setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, status: "delivered" as const } : m));
      });

      socket.on("typing:update", ({ userId: uid, isTyping }: { userId: string; isTyping: boolean }) => {
        if (uid === user.id) return;
        setTyping(isTyping);
        if (isTyping) { clearTimeout(typingTimer.current ?? undefined); typingTimer.current = setTimeout(() => setTyping(false), 3000); }
      });

      socket.on("message:read-ack", ({ readBy }: { readBy: string }) => {
        if (readBy === user.id) return;
        setMessages((prev) => prev.map((m) => ({ ...m, read: true, status: "read" as const })));
      });

      socket.on("message:reaction-updated", ({ messageId, reactions }: any) => {
        setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, reactions } : m));
      });

      socket.on("message:deleted", ({ messageId, forAll }: any) => {
        if (forAll) setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, content: "Mensaje eliminado", deleted: true, type: "text" as const } : m));
        else setMessages((prev) => prev.filter((m) => m._id !== messageId));
      });

      socket.on("message:edited", ({ messageId, text }: { messageId: string; text: string }) => {
        setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, content: text, edited: true } : m));
      });

      socket.on("user:online", ({ userId: uid }: { userId: string }) => {
        setConversations((prev) => prev.map((c) => c.otherId === uid ? { ...c, online: true } : c));
        setContacts((prev) => prev.map((c) => c._id === uid ? { ...c, online: true } : c));
      });

      socket.on("user:offline", ({ userId: uid }: { userId: string }) => {
        setConversations((prev) => prev.map((c) => c.otherId === uid ? { ...c, online: false } : c));
        setContacts((prev) => prev.map((c) => c._id === uid ? { ...c, online: false } : c));
      });

      socket.on("ephemeral:new", (data: any) => {
        const current = activeConvRef.current;
        const msgId = String(data._id);
        if (seenMsgIds.current.has(msgId)) return;
        seenMsgIds.current.add(msgId);
        const ephMsg: Message = {
          _id: msgId, senderId: data.senderId, senderName: data.senderName,
          senderAvatar: data.senderAvatar, content: data.caption || "",
          type: "ephemeral", fileUrl: data.thumbnailUrl, thumbUrl: data.thumbnailUrl,
          ephemeral: true, ephConfig: data.config, ephViewed: false,
          reactions: [], status: "delivered", isSystem: false, deleted: false,
          createdAt: data.createdAt, read: false,
        };
        if (current && String(data.roomId) === current._id) {
          setMessages((prev) => { if (prev.some((m) => m._id === msgId)) return prev; return [...prev, ephMsg]; });
          scrollToBottom();
          setConversations((prev) => prev.map((c) => c._id === String(data.roomId) ? { ...c, lastMessage: "🔥 Mensaje temporal", lastTime: "Ahora" } : c));
        } else {
          setConversations((prev) => prev.map((c) => c._id === String(data.roomId) ? { ...c, lastMessage: "🔥 Mensaje temporal", lastTime: "Ahora", unread: (c.unread || 0) + 1 } : c));
        }
      });

      socket.on("ephemeral:destroyed", ({ messageId }: { messageId: string }) => {
        setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, ephViewed: true, deleted: true, content: "Mensaje destruido" } : m));
      });

      socket.on("ephemeral:viewed", ({ messageId, viewedBy }: { messageId: string; viewedBy: string }) => {
        if (viewedBy === user?.id) return;
        setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, ephViewed: true, status: "read" as const } : m));
      });

      socketRef.current = socket as unknown as NakamaSocket;
    }).catch(console.error);
    return () => { socketRef.current?.disconnect(); };
  }, [user]); // eslint-disable-line

  // ── Cargar conversaciones ──────────────────────────────
  useEffect(() => {
    if (!user || tab === "agenda") return;
    setLoadingConvs(true);
    const token = localStorage.getItem("nakama_token");
    const typeParam = tab === "chats" ? "private" : tab === "grupos" ? "group" : "community";
    fetch(`${API}/chats?type=${typeParam}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const convs = Array.isArray(data) ? data : [];
        setConversations(convs.map((c: Conversation) => ({ ...c, wallpaper: chatWallpapers[c._id] ?? c.wallpaper })));
        setLoadingConvs(false);
      })
      .catch(() => setLoadingConvs(false));
  }, [tab, user]); // eslint-disable-line

  // ── Sugerencias ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("nakama_token");
    fetch(`${API}/chats/suggestions`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setSuggestions(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => {});
  }, [user]);

  // ── Join room al cambiar conversación activa ───────────
  useEffect(() => {
    if (!activeConv || !socketRef.current || !socketReady) return;
    seenMsgIds.current.clear();
    setMessages((prev) => prev.filter((m) => m.type === "ephemeral" && !m.ephViewed && !m.deleted));
    setSelectedMsgs(new Set()); setSelectMode(false); setEditingMsg(null);
    const rt = roomType(activeConv), convId = activeConv._id;
    (socketRef.current as any).emit("room:join", { roomType: rt, roomId: convId }, (res: any) => {
      const msgs: ServerMessage[] = res.ok ? (res.data?.messages ?? (res as any).messages ?? []) : [];
      msgs.forEach((m) => seenMsgIds.current.add(String(m.id)));
      const normalized = msgs.map(normalizeMessage);
      setMessages((prev) => {
        const ephemeralsPending = prev.filter((m) => m.type === "ephemeral" && !m.ephViewed && !m.deleted);
        const toKeep = ephemeralsPending.filter((e) => !normalized.some((n) => n._id === e._id));
        return [...normalized, ...toKeep].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });
      scrollToBottom();
      const last = msgs.at(-1);
      if (last) (socketRef.current as any).emit("message:read", { roomType: rt, roomId: convId, lastMessageId: String(last.id) });
      setConversations((prev) => prev.map((c) => c._id === convId ? { ...c, unread: 0 } : c));
    });
  }, [activeConv, socketReady]); // eslint-disable-line

  async function handleChatWith(u: UserSuggestion) {
    const token = localStorage.getItem("nakama_token");
    try {
      const res = await fetch(`${API}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "private", members: [u._id] }),
      });
      const conv = await res.json();
      if (!res.ok) return;
      const newConv: Conversation = {
        _id: conv._id, type: "private", name: u.username,
        avatarUrl: u.avatarUrl || conv.avatarUrl,
        // ✅ Guardamos también el video del otro usuario en la conversación
        ...(getVideoSrc(u) ? { avatarUrl: getVideoSrc(u) } : {}),
        unread: 0, lastMessage: conv.lastMessage || "", lastTime: conv.lastTime || "", otherId: u._id,
      };
      setConversations((prev) => upsertConv(prev, newConv));
      setActiveConv(newConv); setTab("chats");
      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch {}
  }

  function sendMessage() {
    if (!input.trim() || !activeConv || !socketRef.current) return;
    if (activeConv.isBlocked || (activeConv as any).isReadOnly) return;
    if (editingMsg) {
      const newText = input.trim();
      setInput(""); setEditingMsg(null);
      (socketRef.current as any).emit("message:edit", { roomType: roomType(activeConv), roomId: activeConv._id, messageId: editingMsg._id, text: newText }, (res: any) => {
        if (res.ok) setMessages((prev) => prev.map((m) => m._id === editingMsg._id ? { ...m, content: newText, edited: true } : m));
      });
      return;
    }
    const content = input.trim(), rt = roomType(activeConv), convSnap = activeConv;
    setInput("");
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempMsg: Message = {
      _id: tempId, senderId: user!.id, senderName: user!.username,
      senderAvatar: (user as any).avatarUrl,
      // ✅ Video del usuario logueado en mensajes optimistas
      senderVideo: getVideoSrc(user),
      content, type: "text", reactions: [], status: "sent",
      isSystem: false, deleted: false, createdAt: new Date().toISOString(), read: false,
    };
    setMessages((prev) => [...prev, tempMsg]);
    scrollToBottom();
    (socketRef.current as any).emit("message:send", { roomType: rt, roomId: convSnap._id, text: content }, (res: any) => {
      if (res.ok && res.data?.message) {
        const real = res.data.message, realId = String(real.id);
        seenMsgIds.current.add(realId);
        setMessages((prev) => prev.map((m) => m._id === tempId ? normalizeMessage(real) : m));
        setConversations((prev) => prev.map((c) => c._id === convSnap._id ? { ...c, lastMessage: content, lastTime: "Ahora" } : c));
      } else if (!res.ok) { setMessages((prev) => prev.filter((m) => m._id !== tempId)); }
    });
  }

  function sendFileMessage(file: UploadedFile, caption?: string) {
    if (!activeConv || !socketRef.current) return;
    const rt = roomType(activeConv), convSnap = activeConv;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempMsg: Message = {
      _id: tempId, senderId: user!.id, senderName: user!.username,
      senderAvatar: (user as any).avatarUrl,
      // ✅ Video del usuario logueado en archivos optimistas
      senderVideo: getVideoSrc(user),
      content: caption || "", type: file.type, fileUrl: file.url, thumbUrl: file.thumbnailUrl,
      duration: file.duration, waveform: file.waveform, reactions: [], status: "sent",
      isSystem: false, deleted: false, createdAt: new Date().toISOString(), read: false,
    };
    setMessages((prev) => [...prev, tempMsg]);
    scrollToBottom();
    (socketRef.current as any).emit("message:send", { roomType: rt, roomId: convSnap._id, text: caption || "", attachment: { type: file.type, url: file.url, thumbnailUrl: file.thumbnailUrl || "", width: file.width || 0, height: file.height || 0, duration: file.duration || 0, size: file.size, mimeType: file.mimeType } }, (res: any) => {
      if (res.ok && res.data?.message) {
        const real = res.data.message, realId = String(real.id);
        seenMsgIds.current.add(realId);
        setMessages((prev) => prev.map((m) => m._id === tempId ? normalizeMessage(real) : m));
        setConversations((prev) => prev.map((c) => c._id === convSnap._id ? { ...c, lastMessage: `[${file.type}]`, lastTime: "Ahora" } : c));
      } else if (!res.ok) { setMessages((prev) => prev.filter((m) => m._id !== tempId)); }
    });
  }

  function sendAudioMessage(file: UploadedFile) { sendFileMessage(file); }

  async function sendEphemeralMessage(file: UploadedFile, caption: string | undefined, config: EphemeralConfig) {
    if (!activeConv || !socketRef.current) return;
    const token = localStorage.getItem("nakama_token");
    const convSnap = activeConv;
    const recipientIds = convSnap.otherId ? [convSnap.otherId] : [];
    if (!recipientIds.length) return;
    const tempId = `temp_eph_${Date.now()}`;
    const tempMsg: Message = {
      _id: tempId, senderId: user!.id, senderName: user!.username,
      senderAvatar: (user as any).avatarUrl,
      // ✅ Video del usuario logueado en efímeros optimistas
      senderVideo: getVideoSrc(user),
      content: caption || "", type: "ephemeral", fileUrl: file.thumbnailUrl || file.url,
      thumbUrl: file.thumbnailUrl, ephemeral: true, ephConfig: { ...config, recipients: [] },
      ephViewed: false, reactions: [], status: "sent", isSystem: false, deleted: false,
      createdAt: new Date().toISOString(), read: false,
    };
    setMessages((prev) => [...prev, tempMsg]);
    scrollToBottom();
    try {
      const res = await fetch(`${API}/ephemeral`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ imageUrl: file.url, thumbnailUrl: file.thumbnailUrl || "", caption: caption || "", mimeType: file.mimeType, size: file.size, config: { duration: config.duration, oneTimeView: config.oneTimeView }, recipients: recipientIds, roomType: roomType(convSnap), roomId: convSnap._id }) });
      const data = await res.json();
      if (!res.ok) { setMessages((prev) => prev.filter((m) => m._id !== tempId)); return; }
      setMessages((prev) => prev.map((m) => m._id === tempId ? { ...m, _id: data._id, status: "delivered" as const } : m));
      setConversations((prev) => prev.map((c) => c._id === convSnap._id ? { ...c, lastMessage: "🔥 Mensaje temporal", lastTime: "Ahora" } : c));
    } catch { setMessages((prev) => prev.filter((m) => m._id !== tempId)); }
  }

  function handleInputKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (activeConv && socketRef.current) (socketRef.current as any).emit("typing:stop", { roomType: roomType(activeConv), roomId: activeConv._id });
      sendMessage(); return;
    }
    if (e.key === "Escape" && editingMsg) { setEditingMsg(null); setInput(""); return; }
    if (activeConv && socketRef.current) {
      (socketRef.current as any).emit("typing:start", { roomType: roomType(activeConv), roomId: activeConv._id });
      clearTimeout(typingTimer.current ?? undefined);
      typingTimer.current = setTimeout(() => { (socketRef.current as any)?.emit("typing:stop", { roomType: roomType(activeConv), roomId: activeConv._id }); }, 2500);
    }
  }

  function deleteMessages(msgIds: string[], forAll: boolean) {
    if (!activeConv || !socketRef.current) return;
    const rt = roomType(activeConv);
    msgIds.forEach((id) => {
      (socketRef.current as any)!.emit("message:delete", { roomType: rt, roomId: activeConv._id, messageId: id, forAll }, (res: any) => {
        if (res.ok) {
          if (forAll) setMessages((prev) => prev.map((m) => m._id === id ? { ...m, content: "Mensaje eliminado", deleted: true, type: "text" as const } : m));
          else setMessages((prev) => prev.filter((m) => m._id !== id));
        }
      });
    });
    setSelectedMsgs(new Set()); setSelectMode(false);
  }

  function openForward(msgs: Message[]) { setForwardingMsgs(msgs); setShowForwardModal(true); }

  async function handleForward(targetConvIds: string[]) {
    if (!socketRef.current) return;
    const allConvs = [...conversations];
    for (const convId of targetConvIds) {
      let conv = allConvs.find((c) => c._id === convId);
      if (!conv) {
        try {
          const token = localStorage.getItem("nakama_token");
          const res = await fetch(`${API}/chats/${convId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) conv = await res.json();
        } catch { continue; }
        if (!conv) continue;
      }
      const rt = roomType(conv);
      for (const msg of forwardingMsgs) {
        if (msg.deleted) continue;
        const forwardPayload: any = { roomType: rt, roomId: convId, text: msg.content || "" };
        if (msg.type !== "text" && msg.fileUrl) {
          forwardPayload.attachment = { type: msg.type, url: msg.fileUrl, thumbnailUrl: msg.thumbUrl ?? "", width: 0, height: 0, duration: msg.duration ?? 0, size: 0, mimeType: msg.type === "image" ? "image/jpeg" : msg.type === "video" ? "video/mp4" : msg.type === "audio" ? "audio/webm" : msg.type === "gif" ? "image/gif" : "application/octet-stream" };
        }
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 4000);
          (socketRef.current as any)!.emit("message:send", forwardPayload, (res: Ack<{ message: ServerMessage }>) => {
            clearTimeout(timeout);
            if (res.ok && (res as any).data?.message) {
              seenMsgIds.current.add(String((res as any).data.message.id));
              setConversations((prev) => prev.map((c) => c._id === convId ? { ...c, lastMessage: msg.type !== "text" ? `[${msg.type}]` : msg.content || "[media]", lastTime: "Ahora" } : c));
            }
            resolve();
          });
        });
      }
    }
    setForwardingMsgs([]); setShowForwardModal(false); setSelectedMsgs(new Set()); setSelectMode(false);
  }

  async function handleBlock(targetUserId: string, currently: boolean) {
    const token = localStorage.getItem("nakama_token");
    try {
      if (currently) {
        await fetch(`${API}/chats/block/${targetUserId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setConversations((prev) => prev.map((c) => c.otherId === targetUserId ? { ...c, isBlocked: false } : c));
        if (activeConv?.otherId === targetUserId) setActiveConv((prev) => prev ? { ...prev, isBlocked: false } : prev);
      } else {
        await fetch(`${API}/chats/block`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetUserId }) });
        setConversations((prev) => prev.map((c) => c.otherId === targetUserId ? { ...c, isBlocked: true } : c));
        if (activeConv?.otherId === targetUserId) setActiveConv((prev) => prev ? { ...prev, isBlocked: true } : prev);
      }
    } catch {}
    setShowBlockReport(false);
  }

  useEffect(() => {
    (window as any).__nakama_deleteContact = (otherId: string) => handleRemoveContact(otherId);
    return () => { delete (window as any).__nakama_deleteContact; };
  }); // eslint-disable-line

  function openConversation(conv: Conversation) {
    const withWall = { ...conv, wallpaper: chatWallpapers[conv._id] ?? conv.wallpaper };
    setActiveConv(withWall);
    setConversations((prev) => prev.map((c) => c._id === conv._id ? { ...c, unread: 0 } : c));
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function backToList() { setSidebarOpen(true); setActiveConv(null); }

  const filteredConvs = conversations.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading || !user)
    return (
      <div className="chat-loading">
        <div className="chat-loading__spinner" />
        <span>Cargando chats...</span>
      </div>
    );

  const selectedMsgList = messages.filter((m) => selectedMsgs.has(m._id));
  const showingAgenda = tab === "agenda";

  // ✅ Video del usuario logueado — igual que el navbar
  const myVideoSrc = getVideoSrc(user);
  const myImgSrc = (user as any).avatarUrl ?? undefined;

  return (
    <div className="chat-root" data-theme={activeTheme} style={{ "--chat-accent": currentTheme.accent } as React.CSSProperties}>

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className={`chat-sidebar ${sidebarOpen ? "chat-sidebar--open" : "chat-sidebar--hidden"}`}>

        {/* ── Header con scroll-blur ─────────────────── */}
        <div className={`chat-sidebar__header chat-sidebar__header--compact ${headerHidden ? "chat-sidebar__header--hidden" : ""} ${headerScrolled ? "chat-sidebar__header--scrolled" : ""}`}>
          <div className="chat-sidebar__title">
            <button className="chat-icon-btn chat-home-btn" onClick={() => router.push("/")} aria-label="Inicio">
              <Home size={18} />
            </button>
            <button className="chat-sidebar__me-avatar-btn" onClick={() => setShowPrivacyModal(true)}>
              <div className="chat-sidebar__me-avatar-wrap">
                {/* ✅ Mismo patrón que el navbar: video > imagen > placeholder */}
                {myVideoSrc ? (
                  <video
                    src={myVideoSrc}
                    width={30}
                    height={30}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <UserAvatar
                    src={myImgSrc}
                    alt={user.username}
                    size={30}
                  />
                )}
                <span className={`chat-sidebar__me-dot ${socketReady ? "chat-sidebar__me-dot--online" : ""}`} />
              </div>
            </button>
            <span className="chat-sidebar__username">{user.username}</span>
            <div className={`chat-sidebar__status ${socketReady ? "chat-sidebar__status--online" : ""}`} />
          </div>
          <div className="chat-sidebar__header-actions">
            <div className="chat-sidebar__notif-wrap" style={{ position: "relative" }}>
              <button
                className={`chat-icon-btn chat-sidebar__notif-btn ${unreadNotifs > 0 ? "chat-sidebar__notif-btn--active" : ""}`}
                onClick={() => { setShowNotifs((v) => !v); if (unreadNotifs > 0) markAllRead(); }}
              >
                {unreadNotifs > 0 ? <BellRing size={18} /> : <Bell size={18} />}
                {unreadNotifs > 0 && (
                  <span className="chat-sidebar__notif-badge">{unreadNotifs > 9 ? "9+" : unreadNotifs}</span>
                )}
              </button>
              {showNotifs && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  zIndex: 200,
                  minWidth: "320px",
                  maxWidth: "360px",
                }}>
                  <AdminNotifPanel
                    notifications={adminNotifs}
                    onClose={() => setShowNotifs(false)}
                    onMarkAllRead={markAllRead}
                    onMarkOneRead={markOneRead}
                    onClear={clearAll}
                  />
                </div>
              )}
            </div>
            <button className="chat-icon-btn" onClick={() => setShowThemes(true)}>
              <Palette size={18} />
            </button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────── */}
        <div className={`chat-tabs ${headerHidden ? "chat-tabs--hidden" : ""}`} role="tablist">
          {(["chats", "grupos", "comunidades", "agenda"] as Tab[]).map((t) => (
            <button
              key={t} className={`chat-tab ${tab === t ? "chat-tab--active" : ""}`}
              role="tab" aria-selected={tab === t}
              onClick={() => { setTab(t); setActiveConv(null); setSearchQuery(""); }}
            >
              {t === "chats" ? <MessageCircle size={14} /> : t === "grupos" ? <Users size={14} /> : t === "comunidades" ? <Globe size={14} /> : <BookUser size={14} />}
              <span style={{ fontSize: "0.7rem" }}>{t === "chats" ? "Chats" : t === "grupos" ? "Grupos" : t === "comunidades" ? "Comuni." : "Agenda"}</span>
            </button>
          ))}
        </div>

        {/* ── Contenido scrolleable ─────────────────── */}
        <div ref={sidebarScrollRef} style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" as any }}>
          {showingAgenda ? (
            <AgendaSection contacts={contacts} loadingContacts={loadingContacts} onChat={handleChatWith} onRemove={handleRemoveContact} onAdd={() => setShowAddContact(true)} />
          ) : (
            <>
              <div className="chat-search">
                <Search size={15} className="chat-search__icon" />
                <input className="chat-search__input" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && <button className="chat-search__clear" onClick={() => setSearchQuery("")}><X size={13} /></button>}
              </div>

              {tab === "chats" && showSuggestions && suggestions.length > 0 && (
                <div className="chat-suggestions">
                  <div className="chat-suggestions__header">
                    <span style={{ display: "flex" }}><Lock size={13} /></span>
                    <span>Sugerencias</span>
                    <button className="chat-suggestions__social-btn" onClick={() => setShowSocialSearch(true)}>🌐 Redes</button>
                    <button className="chat-suggestions__close" onClick={() => setShowSuggestions(false)}><X size={12} /></button>
                  </div>
                  <div className="chat-suggestions__list">
                    {suggestions.map((s) => {
                      const src = sourceConfig(s.source);
                      const inAgenda = agendaIds.has(s._id);
                      // ✅ Video del usuario sugerido
                      const suggestionVideo = getVideoSrc(s);
                      const suggestionImg = !suggestionVideo ? s.avatarUrl : undefined;
                      return (
                        <div key={s._id} className="chat-suggestion chat-suggestion--fadein">
                          <div className="chat-suggestion__avatar">
                            {/* ✅ Mismo patrón navbar: video > imagen */}
                            {suggestionVideo ? (
                              <video
                                src={suggestionVideo}
                                width={36}
                                height={36}
                                autoPlay
                                muted
                                loop
                                playsInline
                                style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", display: "block" }}
                              />
                            ) : (
                              <UserAvatar src={suggestionImg} alt={s.username} size={36} />
                            )}
                            <span className="chat-suggestion__source-dot" style={{ background: src.color }} title={src.label} />
                          </div>
                          <div className="chat-suggestion__info">
                            <span className="chat-suggestion__name">@{s.username}</span>
                            <span className="chat-suggestion__mutual" style={{ color: src.color, opacity: 0.85 }}>
                              {s.mutualCount ? `${s.mutualCount} en común · ${src.label}` : src.label}
                            </span>
                          </div>
                          <div className="chat-suggestion__actions">
                            {inAgenda
                              ? <button className="chat-suggestion__action-btn chat-suggestion__action-btn--unagenda" onClick={() => handleRemoveContact(s._id)} title="Quitar de agenda"><UserMinus size={12} /></button>
                              : <button className="chat-suggestion__action-btn" onClick={() => handleAddContact(s)} title="Agregar a agenda"><UserPlus size={12} /></button>}
                            <button className="chat-suggestion__action-btn chat-suggestion__action-btn--chat" onClick={() => handleChatWith(s)} title="Enviar mensaje"><MessageCircle size={12} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="chat-create-row">
                {tab === "grupos" && <button className="chat-create-btn" onClick={() => setShowNewModal("grupo")}><Users size={15} /> Crear grupo</button>}
                {tab === "comunidades" && <button className="chat-create-btn" onClick={() => router.push("/crearComunidad")}><Globe size={15} /> Crear comunidad</button>}
              </div>

              {tab === "comunidades" && <MisComunidades />}

              <div className="chat-list" role="list">
                {loadingConvs ? (
                  <div className="chat-list__loading">{[1, 2, 3, 4].map((i) => <div key={i} className="chat-list__skeleton" />)}</div>
                ) : filteredConvs.length === 0 ? (
                  <div className="chat-list__empty">
                    <span className="chat-list__empty-icon">{tab === "chats" ? "💬" : tab === "grupos" ? "👥" : "🌐"}</span>
                    <p>No hay {tab === "chats" ? "chats" : tab === "grupos" ? "grupos" : "comunidades"} todavía</p>
                    {tab === "grupos" ? (
                      <button className="chat-create-btn chat-create-btn--sm" onClick={() => router.push("/grupos")}><Users size={13} /> Ir a Grupos</button>
                    ) : tab === "comunidades" ? (
                      <button className="chat-create-btn chat-create-btn--sm" onClick={() => router.push("/crearComunidad")}><Globe size={13} /> Crear comunidad</button>
                    ) : (
                      <button className="chat-create-btn chat-create-btn--sm" onClick={() => setShowNewModal("chat")}><Plus size={13} /> Nuevo chat</button>
                    )}
                  </div>
                ) : (
                  filteredConvs.map((conv) => (
                    <ConvItem key={conv._id} conv={conv} active={activeConv?._id === conv._id} onClick={() => openConversation(conv)} currentUserId={user.id} />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ── Main panel ───────────────────────────────── */}
      <main className={`chat-main ${!sidebarOpen || activeConv ? "chat-main--active" : ""}`}>
        {activeConv ? (
          <ChatView
            conv={activeConv} messages={messages} input={input} setInput={setInput}
            onSend={sendMessage} onKeyDown={handleInputKey} typing={typing}
            currentUserId={user.id} userRole={role} messagesEnd={messagesEnd} inputRef={inputRef}
            onBack={backToList} socketRef={socketRef}
            onFileSend={sendFileMessage} onAudioSend={sendAudioMessage} onEphemeralSend={sendEphemeralMessage}
            contacts={contacts} onViewEphemeral={(msg) => setViewingEphemeral(msg)}
            onOpenBlockReport={(id, name) => { setBlockReportTarget({ userId: id, username: name }); setShowBlockReport(true); }}
            selectMode={selectMode} selectedMsgs={selectedMsgs}
            onToggleSelect={(id) => { setSelectMode(true); setSelectedMsgs((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); if (next.size === 0) setSelectMode(false); return next; }); }}
            onExitSelect={() => { setSelectMode(false); setSelectedMsgs(new Set()); }}
            onDeleteSelected={(forAll) => deleteMessages([...selectedMsgs], forAll)}
            onForwardSelected={() => openForward(selectedMsgList)}
            onEditMsg={(msg) => { setEditingMsg(msg); setInput(msg.content); setTimeout(() => inputRef.current?.focus(), 50); }}
            onDeleteMsg={(id, forAll) => deleteMessages([id], forAll)}
            onForwardMsg={(msg) => openForward([msg])}
            editingMsg={editingMsg}
            onCancelEdit={() => { setEditingMsg(null); setInput(""); }}
            onChangeWallpaper={(wallId) => setWallpaper(activeConv._id, wallId)}
            currentWallpaper={chatWallpapers[activeConv._id] ?? activeConv.wallpaper ?? "none"}
          />
        ) : (
          <div className="chat-empty-state">
            <div className="chat-empty-state__inner">
              <div className="chat-empty-state__avatar-wrap">
                {/* ✅ Empty state: mismo patrón navbar */}
                {myVideoSrc ? (
                  <video
                    src={myVideoSrc}
                    width={72}
                    height={72}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <UserAvatar
                    src={myImgSrc}
                    alt={user.username}
                    size={72}
                    fallback={user.username[0]?.toUpperCase()}
                  />
                )}
                <span className={`chat-empty-state__avatar-dot ${socketReady ? "chat-empty-state__avatar-dot--online" : ""}`} />
              </div>
              <h2>¡Hola, {user.username}!</h2>
              <p>Seleccioná una conversación o iniciá una nueva</p>
              <div className="chat-empty-state__features">
                <div className="chat-empty-state__feature"><Lock size={16} /><span>Chats P2P encriptados</span></div>
                <div className="chat-empty-state__feature"><Users size={16} /><span>Hasta {LIMITS[role]?.grupos ?? 5} grupos</span></div>
                <div className="chat-empty-state__feature"><Globe size={16} /><span>Comunidades hasta {(LIMITS[role]?.comunidad ?? 300).toLocaleString()} miembros</span></div>
              </div>
              <button className="chat-empty-state__social-btn" onClick={() => setShowSocialSearch(true)}>🌐 Buscar amigos en redes sociales</button>
              <button className="chat-empty-state__home-btn" onClick={() => router.push("/")}><Home size={14} /> Volver al inicio</button>
            </div>
          </div>
        )}
      </main>

      {/* ── Modales ──────────────────────────────────── */}
      {showAddContact && (
        <AddContactModal currentUserId={user.id} agendaIds={agendaIds} onAdd={handleAddContact} onClose={() => setShowAddContact(false)} />
      )}
      {showNewModal && (
        <NewChatModal type={showNewModal} userRole={role} onClose={() => setShowNewModal(null)} currentUserId={user.id} contacts={contacts}
          onCreated={(conv) => { setConversations((prev) => upsertConv(prev, conv)); setActiveConv(conv); setShowNewModal(null); if (window.innerWidth < 768) setSidebarOpen(false); }}
        />
      )}
      {showThemes && (
        <ThemeModal themes={themes} activeTheme={activeTheme} onSelect={(id) => { setActiveTheme(id); setShowThemes(false); }} onClose={() => setShowThemes(false)} userRole={role} />
      )}
      {showSocialSearch && (
        <SocialSearch
          onClose={() => setShowSocialSearch(false)} currentUserId={user.id}
          onStartChat={(conv) => { setConversations((prev) => upsertConv(prev, { ...conv, unread: 0 })); setActiveConv({ ...conv, unread: 0 }); setShowSocialSearch(false); if (window.innerWidth < 768) setSidebarOpen(false); }}
        />
      )}
      {showBlockReport && blockReportTarget && activeConv && (
        <BlockReportModal targetUserId={blockReportTarget.userId} targetUsername={blockReportTarget.username} chatId={activeConv._id} isBlocked={activeConv.isBlocked ?? false} onBlock={handleBlock} onClose={() => setShowBlockReport(false)} />
      )}
      {showForwardModal && (
        <ForwardModal messages={forwardingMsgs} conversations={conversations.filter((c) => c._id !== activeConv?._id)} onForward={handleForward} onClose={() => { setShowForwardModal(false); setForwardingMsgs([]); }} />
      )}
      {showPrivacyModal && <PrivacyModal onClose={() => setShowPrivacyModal(false)} />}
      {viewingEphemeral && (
        <EphemeralViewer
          messageId={viewingEphemeral._id} caption={viewingEphemeral.content || undefined}
          config={viewingEphemeral.ephConfig ?? DEFAULT_EPHEMERAL} senderName={viewingEphemeral.senderName}
          onClose={() => { setMessages((prev) => prev.map((m) => m._id === viewingEphemeral._id ? { ...m, ephViewed: true } : m)); setViewingEphemeral(null); }}
        />
      )}
    </div>
  );
}
