"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../context/authContext";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
import { NotificationModal } from "./NotificacionModal";
import { Coffee } from "lucide-react";
import "../styles/navbar.css";

export default function Navbar() {
  const { user, token, isAuthenticated, loading, logout } = useAuth();
  // ↑ token viene directo del contexto — estable entre renders, sin localStorage aquí

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const perfilRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { notifs, unread, markOneRead, markAllRead, deleteOne, deleteAll } =
    useAdminNotifications(isAuthenticated ? token : null);
  // ↑ token es el mismo string estable del contexto, no se recrea en cada render

  // Scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click fuera de dropdowns desktop
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (perfilRef.current && !perfilRef.current.contains(e.target as Node))
        setPerfilOpen(false);
      if (notiRef.current && !notiRef.current.contains(e.target as Node))
        setNotiOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Click fuera del menú mobile
  useEffect(() => {
    if (!menuAbierto) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuAbierto(false);
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", onClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [menuAbierto]);

  // Scroll del body
  useEffect(() => {
    if (!notiOpen) {
      document.body.style.overflow = menuAbierto ? "hidden" : "";
    }
    return () => {
      if (!notiOpen) document.body.style.overflow = "";
    };
  }, [menuAbierto, notiOpen]);

  const videoSrc = user?.profileVideo?.url || null;
  const imageSrc = user?.avatarUrl || null;
  const inicial = user?.username?.[0]?.toUpperCase() ?? "?";

  const roleBadge: Record<string, string> = {
    "user-pro": "PRO",
    "user-premium": "⭐",
    moderator: "MOD",
    admin: "ADM",
    superadmin: "SA",
  };

  function handleLogout() {
    setPerfilOpen(false);
    setMenuAbierto(false);
    logout();
  }

  function cerrarMenu() {
    setMenuAbierto(false);
  }

  function AvatarMedia({ size }: { size: "sm" | "md" | "lg" }) {
    const px = size === "sm" ? 38 : size === "md" ? 44 : 52;
    const cls =
      size === "sm"
        ? "navbar__avatar"
        : size === "md"
          ? "navbar__dropdown-avatar"
          : "navbar__mobile-avatar";
    if (videoSrc)
      return (
        <video
          src={videoSrc}
          className={`${cls}-video`}
          width={px}
          height={px}
          autoPlay
          muted
          loop
          playsInline
          style={{ width: px, height: px }}
        />
      );
    if (imageSrc)
      return (
        <Image
          src={imageSrc}
          alt={user?.username ?? "avatar"}
          width={px}
          height={px}
          className={`${cls}-img`}
        />
      );
    return (
      <div className={`${cls}-placeholder`} style={{ width: px, height: px }}>
        {inicial}
      </div>
    );
  }

  return (
    <>
      <nav
        className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="navbar__inner">
          {/* Logo */}
          <Link href="/" className="navbar__logo" aria-label="Nakama - Inicio">
            <Image
              src="/assets/nakama.jpg"
              alt="Nakama"
              width={44}
              height={44}
              className="navbar__logo-img"
              priority
            />
            <span className="navbar__logo-text">NAKAMA</span>
          </Link>

          {/* ════════ AUTENTICADO ════════ */}
          {!loading && isAuthenticated && user ? (
            <>
              {/* Links desktop */}
              <ul className="navbar__links" role="list">
                <li>
                  <Link href="/chat" className="navbar__link navbar__icon-link">
                    <ChatIcon />
                    <span className="navbar__link-label">Chats</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/grupos"
                    className="navbar__link navbar__icon-link"
                  >
                    <GroupIcon />
                    <span className="navbar__link-label">Grupos</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/comunidad-page"
                    className="navbar__link navbar__icon-link"
                  >
                    <ComunidadIcon />
                    <span className="navbar__link-label">Comunidad</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/buscar"
                    className="navbar__link navbar__icon-link"
                  >
                    <SearchIcon />
                    <span className="navbar__link-label">Buscar</span>
                  </Link>
                </li>
              </ul>

              {/* Acciones derechas */}
              <div className="navbar__actions">
                {/* ── Campana ── */}
                <div className="navbar__dropdown-wrap" ref={notiRef}>
                  <button
                    className="navbar__icon-btn"
                    onClick={() => {
                      setNotiOpen((p) => !p);
                      setPerfilOpen(false);
                    }}
                    aria-label="Notificaciones"
                    aria-expanded={notiOpen}
                  >
                    <BellIcon />
                    {unread > 0 && (
                      <span className="navbar__badge" aria-hidden="true">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </button>
                </div>

                {/* ── Avatar + menú perfil ── */}
                <div className="navbar__dropdown-wrap" ref={perfilRef}>
                  <button
                    className="navbar__avatar-btn"
                    onClick={() => {
                      setPerfilOpen((p) => !p);
                      setNotiOpen(false);
                    }}
                    aria-label="Menú de perfil"
                    aria-expanded={perfilOpen}
                  >
                    <AvatarMedia size="sm" />
                    {roleBadge[user.role] && (
                      <span className="navbar__role-badge">
                        {roleBadge[user.role]}
                      </span>
                    )}
                  </button>

                  {perfilOpen && (
                    <div className="navbar__dropdown navbar__dropdown--perfil">
                      <div className="navbar__dropdown-header">
                        <AvatarMedia size="md" />
                        <div>
                          <p className="navbar__dropdown-username">
                            @{user.username}
                          </p>
                          <p className="navbar__dropdown-rank">{user.rank}</p>
                        </div>
                      </div>
                      <div className="navbar__dropdown-stats">
                        <div className="navbar__dropdown-stat">
                          <strong>{user.followersCount ?? 0}</strong>
                          <span>seguidores</span>
                        </div>
                        <div className="navbar__dropdown-stat">
                          <strong>{user.followingCount ?? 0}</strong>
                          <span>siguiendo</span>
                        </div>
                      </div>
                      <div className="navbar__dropdown-divider" />
                      <Link
                        href="/perfil"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <UserIcon /> Mi perfil
                      </Link>
                      <Link
                        href="/dashboard"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <DashboardIcon /> Dashboard
                      </Link>
                      <Link
                        href="/chat"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <ChatIcon /> Mis chats
                      </Link>
                      <Link
                        href="/peliculas"
                        className="navbar__mobile-link"
                        onClick={cerrarMenu}
                      >
                        Peliculas
                      </Link>
                      <Link
                        href="/grupos"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <GroupIcon /> Mis grupos
                      </Link>
                      <Link
                        href="/buscar?tab=amigos"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <SearchPeopleIcon /> Buscar amigos
                      </Link>
                      {user.role === "user" && (
                        <>
                          <div className="navbar__dropdown-divider" />
                          <Link
                            href="/donar"
                            className="navbar__dropdown-link navbar__dropdown-link--premium"
                            onClick={() => setPerfilOpen(false)}
                          >
                            <Coffee size={18} style={{ marginRight: "6px" }} />
                            Donar
                          </Link>
                        </>
                      )}
                      <div className="navbar__dropdown-divider" />
                      <Link
                        href="/configuracion"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <SettingsIcon /> Configuración
                      </Link>
                      <button
                        className="navbar__dropdown-link navbar__dropdown-link--logout"
                        onClick={handleLogout}
                      >
                        <LogoutIcon /> Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Hamburger mobile */}
              <button
                className={`navbar__hamburger ${menuAbierto ? "navbar__hamburger--open" : ""}`}
                onClick={() => setMenuAbierto((p) => !p)}
                aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={menuAbierto}
              >
                <span />
                <span />
                <span />
              </button>
            </>
          ) : (
            /* ════════ NO AUTENTICADO ════════ */
            <>
              <ul className="navbar__links" role="list">
                <li>
                  <Link href="/" className="navbar__link navbar__link--active">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="navbar__link">
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link
                    href="/registro"
                    className="navbar__link navbar__link--outline"
                  >
                    Registrarse
                  </Link>
                </li>
                <Link
                  href="/peliculas"
                  className="navbar__mobile-link"
                  onClick={cerrarMenu}
                >
                  Peliculas
                </Link>
                <li>
                  <Link
                    href="/donar"
                    className="navbar__link navbar__link--premium"
                  >
                    <Coffee size={18} style={{ marginRight: "6px" }} />
                    Donar
                  </Link>
                </li>
              </ul>
              <button
                className={`navbar__hamburger ${menuAbierto ? "navbar__hamburger--open" : ""}`}
                onClick={() => setMenuAbierto((p) => !p)}
                aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={menuAbierto}
              >
                <span />
                <span />
                <span />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ════════ MOBILE MENU ════════ */}
      <div
        ref={menuRef}
        className={`navbar__mobile-menu ${menuAbierto ? "navbar__mobile-menu--open" : ""}`}
        role="menu"
        aria-hidden={!menuAbierto}
      >
        {isAuthenticated && user ? (
          <>
            <div className="navbar__mobile-user">
              <AvatarMedia size="lg" />
              <div>
                <p className="navbar__mobile-username">@{user.username}</p>
                <p className="navbar__mobile-rank">{user.rank}</p>
              </div>
            </div>
            <div className="navbar__mobile-stats">
              <div className="navbar__mobile-stat">
                <strong>{user.followersCount ?? 0}</strong>
                <span>seguidores</span>
              </div>
              <div className="navbar__mobile-stat">
                <strong>{user.followingCount ?? 0}</strong>
                <span>siguiendo</span>
              </div>
            </div>
            <div className="navbar__mobile-divider" />

            {/* Notificaciones en mobile menu */}
            <button
              className="navbar__mobile-link"
              onClick={() => {
                cerrarMenu();
                setTimeout(() => setNotiOpen(true), 150);
              }}
            >
              🔔 Notificaciones
              {unread > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "#e84040",
                    color: "#fff",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    borderRadius: "99px",
                    padding: "1px 7px",
                  }}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            <Link
              href="/perfil"
              className="navbar__mobile-link"
              onClick={cerrarMenu}
            >
              👤 Mi perfil
            </Link>
            <Link
              href="/dashboard"
              className="navbar__mobile-link"
              onClick={cerrarMenu}
            >
              📊 Dashboard
            </Link>
            <Link
              href="/chat"
              className="navbar__mobile-link"
              onClick={cerrarMenu}
            >
              💬 Mis chats
            </Link>
            <Link
              href="/peliculas"
              className="navbar__mobile-link"
              onClick={cerrarMenu}
            >
              Peliculas
            </Link>
            <Link
              href="/grupos"
              className="navbar__mobile-link"
              onClick={cerrarMenu}
            >
              👥 Mis grupos
            </Link>
            <Link
              href="/buscar"
              className="navbar__mobile-link"
              onClick={cerrarMenu}
            >
              🔍 Buscar amigos
            </Link>
            <Link
              href="/comunidad"
              className="navbar__mobile-link"
              onClick={cerrarMenu}
            >
              🌐 Comunidad
            </Link>
            <Link
              href="/configuracion"
              className="navbar__mobile-link"
              onClick={cerrarMenu}
            >
              ⚙️ Configuración
            </Link>

            {user.role === "user" && (
              <Link
                href="/donar"
                className="navbar__mobile-link navbar__mobile-link--premium flex items-center gap-2"
                onClick={cerrarMenu}
              >
                <Coffee size={18} />
                Donar
              </Link>
            )}
            <div className="navbar__mobile-divider" />
            <button
              className="navbar__mobile-link navbar__mobile-link--logout"
              onClick={handleLogout}
            >
              🚪 Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link href="/" className="navbar__mobile-link" onClick={cerrarMenu}>
              Inicio
            </Link>
            <Link
              href="/login"
              className="navbar__mobile-link"
              onClick={cerrarMenu}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="navbar__mobile-link"
              onClick={cerrarMenu}
            >
              Registrarse
            </Link>
            <Link
              href="/peliculas"
              className="navbar__mobile-link"
              onClick={cerrarMenu}
            >
              Peliculas
            </Link>
            <Link
              href="/donar"
              className="navbar__mobile-link navbar__mobile-link--premium"
              onClick={cerrarMenu}
            >
              <Coffee size={18} style={{ marginRight: "6px" }} />
              Donar
            </Link>
          </>
        )}
      </div>

      {/* ════════ MODAL NOTIFICACIONES ════════ */}
      {notiOpen && isAuthenticated && user && (
        <NotificationModal
          notifications={notifs}
          userRole={user.role as "user" | "pro" | "admin" | "superadmin"}
          onClose={() => setNotiOpen(false)}
          onMarkOneRead={markOneRead}
          onMarkAllRead={markAllRead}
          onDeleteOne={deleteOne}
          onDeleteAll={deleteAll}
        />
      )}
    </>
  );
}

/* ── Íconos ───────────────────────────────────────────────── */
function ChatIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function GroupIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function ComunidadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function DashboardIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function SearchPeopleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
