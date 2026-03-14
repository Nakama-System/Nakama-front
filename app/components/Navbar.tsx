"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../context/authContext";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
import { NotificationModal } from "./NotificacionModal";
import {
  Coffee,
  Film,
  Users,
  MessageSquare,
  LayoutDashboard,
  Search,
  Globe,
  Settings,
  LogOut,
  User,
  Bell,
  UserSearch,
} from "lucide-react";
import "../styles/navbar.css";

export default function Navbar() {
  const { user, token, isAuthenticated, loading, logout } = useAuth();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const perfilRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const { notifs, unread, markOneRead, markAllRead, deleteOne, deleteAll } =
    useAdminNotifications(isAuthenticated ? token : null);

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

  // Click fuera del menú mobile — excluye el botón hamburger para no conflicto
  useEffect(() => {
    if (!menuAbierto) return;

    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const clickedHamburger =
        hamburgerRef.current && hamburgerRef.current.contains(target);
      const clickedMenu =
        menuRef.current && menuRef.current.contains(target);

      if (!clickedHamburger && !clickedMenu) {
        setMenuAbierto(false);
      }
    }

    // Delay para que el propio click que abrió no lo cierre
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", onClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [menuAbierto]);

  // Scroll del body cuando menú mobile abierto
  useEffect(() => {
    document.body.style.overflow = menuAbierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAbierto]);

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

  function toggleMenu() {
    setMenuAbierto((prev) => !prev);
  }

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
                    <MessageSquare size={18} aria-hidden="true" />
                    <span className="navbar__link-label">Chats</span>
                  </Link>
                </li>
                <li>
                  <Link href="/grupos" className="navbar__link navbar__icon-link">
                    <Users size={18} aria-hidden="true" />
                    <span className="navbar__link-label">Grupos</span>
                  </Link>
                </li>
                <li>
                  <Link href="/comunidad-page" className="navbar__link navbar__icon-link">
                    <Globe size={18} aria-hidden="true" />
                    <span className="navbar__link-label">Comunidad</span>
                  </Link>
                </li>
                <li>
                  <Link href="/buscar" className="navbar__link navbar__icon-link">
                    <Search size={18} aria-hidden="true" />
                    <span className="navbar__link-label">Buscar</span>
                  </Link>
                </li>
                <li>
                  <Link href="/peliculas" className="navbar__link navbar__icon-link">
                    <Film size={18} aria-hidden="true" />
                    <span className="navbar__link-label">Películas</span>
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
                    <Bell size={20} aria-hidden="true" />
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
                        <User size={16} aria-hidden="true" /> Mi perfil
                      </Link>
                      <Link
                        href="/dashboard"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <LayoutDashboard size={16} aria-hidden="true" /> Dashboard
                      </Link>
                      <Link
                        href="/chat"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <MessageSquare size={16} aria-hidden="true" /> Mis chats
                      </Link>
                      <Link
                        href="/peliculas"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <Film size={16} aria-hidden="true" /> Películas
                      </Link>
                      <Link
                        href="/grupos"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <Users size={16} aria-hidden="true" /> Mis grupos
                      </Link>
                      <Link
                        href="/buscar?tab=amigos"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <UserSearch size={16} aria-hidden="true" /> Buscar amigos
                      </Link>
                      {user.role === "user" && (
                        <>
                          <div className="navbar__dropdown-divider" />
                          <Link
                            href="/donar"
                            className="navbar__dropdown-link navbar__dropdown-link--premium"
                            onClick={() => setPerfilOpen(false)}
                          >
                            <Coffee size={16} aria-hidden="true" /> Donar
                          </Link>
                        </>
                      )}
                      <div className="navbar__dropdown-divider" />
                      <Link
                        href="/configuracion"
                        className="navbar__dropdown-link"
                        onClick={() => setPerfilOpen(false)}
                      >
                        <Settings size={16} aria-hidden="true" /> Configuración
                      </Link>
                      <button
                        className="navbar__dropdown-link navbar__dropdown-link--logout"
                        onClick={handleLogout}
                      >
                        <LogOut size={16} aria-hidden="true" /> Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Hamburger mobile */}
              <button
                ref={hamburgerRef}
                className={`navbar__hamburger ${menuAbierto ? "navbar__hamburger--open" : ""}`}
                onClick={toggleMenu}
                aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={menuAbierto}
                aria-controls="navbar-mobile-menu"
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
                  <Link href="/peliculas" className="navbar__link">
                    <Film size={16} aria-hidden="true" style={{ marginRight: 6 }} />
                    Películas
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="navbar__link">
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link href="/registro" className="navbar__link navbar__link--outline">
                    Registrarse
                  </Link>
                </li>
                <li>
                  <Link href="/donar" className="navbar__link navbar__link--premium">
                    <Coffee size={16} aria-hidden="true" style={{ marginRight: 6 }} />
                    Donar
                  </Link>
                </li>
              </ul>
              <button
                ref={hamburgerRef}
                className={`navbar__hamburger ${menuAbierto ? "navbar__hamburger--open" : ""}`}
                onClick={toggleMenu}
                aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={menuAbierto}
                aria-controls="navbar-mobile-menu"
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
        id="navbar-mobile-menu"
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

            <button
              className="navbar__mobile-link"
              onClick={() => {
                cerrarMenu();
                setTimeout(() => setNotiOpen(true), 150);
              }}
            >
              <Bell size={18} aria-hidden="true" />
              Notificaciones
              {unread > 0 && (
                <span className="navbar__mobile-badge">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            <Link href="/perfil" className="navbar__mobile-link" onClick={cerrarMenu}>
              <User size={18} aria-hidden="true" />
              Mi perfil
            </Link>
            <Link href="/dashboard" className="navbar__mobile-link" onClick={cerrarMenu}>
              <LayoutDashboard size={18} aria-hidden="true" />
              Dashboard
            </Link>
            <Link href="/chat" className="navbar__mobile-link" onClick={cerrarMenu}>
              <MessageSquare size={18} aria-hidden="true" />
              Mis chats
            </Link>
            <Link href="/peliculas" className="navbar__mobile-link" onClick={cerrarMenu}>
              <Film size={18} aria-hidden="true" />
              Películas
            </Link>
            <Link href="/grupos" className="navbar__mobile-link" onClick={cerrarMenu}>
              <Users size={18} aria-hidden="true" />
              Mis grupos
            </Link>
            <Link href="/buscar" className="navbar__mobile-link" onClick={cerrarMenu}>
              <UserSearch size={18} aria-hidden="true" />
              Buscar amigos
            </Link>
            <Link href="/comunidad" className="navbar__mobile-link" onClick={cerrarMenu}>
              <Globe size={18} aria-hidden="true" />
              Comunidad
            </Link>
            <Link href="/configuracion" className="navbar__mobile-link" onClick={cerrarMenu}>
              <Settings size={18} aria-hidden="true" />
              Configuración
            </Link>

            {user.role === "user" && (
              <Link
                href="/donar"
                className="navbar__mobile-link navbar__mobile-link--premium"
                onClick={cerrarMenu}
              >
                <Coffee size={18} aria-hidden="true" />
                Donar
              </Link>
            )}
            <div className="navbar__mobile-divider" />
            <button
              className="navbar__mobile-link navbar__mobile-link--logout"
              onClick={handleLogout}
            >
              <LogOut size={18} aria-hidden="true" />
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link href="/" className="navbar__mobile-link" onClick={cerrarMenu}>
              Inicio
            </Link>
            <Link href="/peliculas" className="navbar__mobile-link" onClick={cerrarMenu}>
              <Film size={18} aria-hidden="true" />
              Películas
            </Link>
            <Link href="/login" className="navbar__mobile-link" onClick={cerrarMenu}>
              Iniciar sesión
            </Link>
            <Link href="/registro" className="navbar__mobile-link" onClick={cerrarMenu}>
              Registrarse
            </Link>
            <Link
              href="/donar"
              className="navbar__mobile-link navbar__mobile-link--premium"
              onClick={cerrarMenu}
            >
              <Coffee size={18} aria-hidden="true" />
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
