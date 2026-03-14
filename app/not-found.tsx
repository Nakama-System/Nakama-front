// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+JP:wght@300;400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .nf {
          min-height: 100dvh;
          background: #080810;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          font-family: 'Noto Sans JP', sans-serif;
        }

        /* ── fondo ── */
        .nf__bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .nf__radial {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 50% 60%, rgba(180,30,30,.18) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 20% 80%, rgba(255,80,0,.08) 0%, transparent 60%);
        }
        .nf__grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%);
        }

        /* ── kanji decorativo ── */
        .nf__kanji {
          position: absolute;
          font-family: 'Noto Sans JP', sans-serif;
          font-weight: 300;
          font-size: clamp(180px, 30vw, 380px);
          color: rgba(255,255,255,.025);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          user-select: none;
          letter-spacing: -0.05em;
          animation: nf-kanji-pulse 6s ease-in-out infinite;
        }
        @keyframes nf-kanji-pulse {
          0%, 100% { opacity: .4; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: .7; transform: translate(-50%, -50%) scale(1.04); }
        }

        /* ── partículas ── */
        .nf__particles { position: absolute; inset: 0; }
        .nf__p {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: #e63946;
          animation: nf-float linear infinite;
        }
        .nf__p:nth-child(1)  { left: 15%; top: 70%; animation-duration: 8s;  animation-delay: 0s;    width: 3px; height: 3px; }
        .nf__p:nth-child(2)  { left: 30%; top: 80%; animation-duration: 11s; animation-delay: -2s; }
        .nf__p:nth-child(3)  { left: 55%; top: 75%; animation-duration: 9s;  animation-delay: -4s;   background: #ff6b35; }
        .nf__p:nth-child(4)  { left: 70%; top: 85%; animation-duration: 13s; animation-delay: -1s; }
        .nf__p:nth-child(5)  { left: 85%; top: 72%; animation-duration: 7s;  animation-delay: -3s;   background: #ff6b35; width: 3px; height: 3px; }
        .nf__p:nth-child(6)  { left: 45%; top: 90%; animation-duration: 10s; animation-delay: -5s; }
        @keyframes nf-float {
          0%   { transform: translateY(0)   opacity(1); opacity: .8; }
          100% { transform: translateY(-80vh); opacity: 0; }
        }

        /* ── contenido ── */
        .nf__content {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 2rem;
          animation: nf-enter .8s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes nf-enter {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .nf__eyebrow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .75rem;
          margin-bottom: 1.5rem;
          animation: nf-enter .8s .1s cubic-bezier(.16,1,.3,1) both;
        }
        .nf__line {
          width: 40px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #e63946);
        }
        .nf__line:last-child {
          background: linear-gradient(90deg, #e63946, transparent);
        }
        .nf__tag {
          font-size: .7rem;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: #e63946;
          font-weight: 400;
        }

        .nf__code {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(100px, 22vw, 220px);
          line-height: .85;
          letter-spacing: -0.02em;
          background: linear-gradient(180deg, #ffffff 0%, #555 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: .25rem;
          animation: nf-enter .8s .2s cubic-bezier(.16,1,.3,1) both;
          position: relative;
        }
        .nf__code::after {
          content: '404';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, #e63946 0%, #ff6b35 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          opacity: 0;
          animation: nf-glitch 4s 2s infinite;
        }
        @keyframes nf-glitch {
          0%, 92%, 100% { opacity: 0; transform: none; }
          93%            { opacity: 1; transform: translate(-3px, 0) skewX(-5deg); }
          95%            { opacity: 1; transform: translate(3px, 0)  skewX(5deg); }
          97%            { opacity: 1; transform: translate(-2px, 0); }
        }

        .nf__titulo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(1.6rem, 4vw, 2.6rem);
          letter-spacing: .08em;
          color: #fff;
          margin-bottom: .75rem;
          animation: nf-enter .8s .3s cubic-bezier(.16,1,.3,1) both;
        }
        .nf__titulo span {
          color: #e63946;
        }

        .nf__desc {
          font-size: .95rem;
          color: rgba(255,255,255,.45);
          line-height: 1.7;
          max-width: 360px;
          margin: 0 auto 2.5rem;
          animation: nf-enter .8s .4s cubic-bezier(.16,1,.3,1) both;
        }

        .nf__btn {
          display: inline-flex;
          align-items: center;
          gap: .6rem;
          padding: .85rem 2.2rem;
          background: #e63946;
          color: #fff;
          text-decoration: none;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.1rem;
          letter-spacing: .12em;
          border: none;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
          transition: background .2s, transform .2s;
          animation: nf-enter .8s .5s cubic-bezier(.16,1,.3,1) both;
        }
        .nf__btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,.15);
          transform: translateX(-100%) skewX(-15deg);
          transition: transform .4s;
        }
        .nf__btn:hover::before { transform: translateX(120%) skewX(-15deg); }
        .nf__btn:hover { background: #c1121f; transform: translateY(-2px); }

        .nf__btn svg { transition: transform .2s; }
        .nf__btn:hover svg { transform: translateX(3px); }

        .nf__logo {
          display: block;
          font-family: 'Bebas Neue', sans-serif;
          font-size: .85rem;
          letter-spacing: .25em;
          color: rgba(255,255,255,.2);
          margin-top: 3rem;
          animation: nf-enter .8s .6s cubic-bezier(.16,1,.3,1) both;
        }
      `}</style>

      <div className="nf">
        {/* Fondo */}
        <div className="nf__bg">
          <div className="nf__radial" />
          <div className="nf__grid" />
          <span className="nf__kanji" aria-hidden="true">迷</span>
          <div className="nf__particles" aria-hidden="true">
            {[1,2,3,4,5,6].map(i => <span key={i} className="nf__p" />)}
          </div>
        </div>

        {/* Contenido */}
        <div className="nf__content">
          <div className="nf__eyebrow">
            <span className="nf__line" />
            <span className="nf__tag">Error del sistema</span>
            <span className="nf__line" />
          </div>

          <div className="nf__code" aria-label="Error 404">404</div>

          <h1 className="nf__titulo">
            Ruta <span>no encontrada</span>
          </h1>

          <p className="nf__desc">
            Esta página no existe o fue movida.<br />
            Volvé al inicio y retomá tu camino, nakama.
          </p>

          <Link href="/" className="nf__btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver al inicio
          </Link>

          <span className="nf__logo" aria-hidden="true">NAKAMA</span>
        </div>
      </div>
    </>
  );
}