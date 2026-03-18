// ═══════════════════════════════════════════════════════════
// hooks/useGameQuestions.ts — Nakama
//
// Reemplaza la función estática generateQuestions() con
// datos reales del backend.
// ═══════════════════════════════════════════════════════════

import { useCallback, useRef } from "react";

const API = "https://nakama-backend-render.onrender.com";

// Interfaz compatible con la que ya usa BattleGame
export interface Question {
  id:        string;
  texto:     string;
  opciones:  string[];
  correcta:  number;
  categoria: string;
}

// ─────────────────────────────────────────────────────────────
// Preguntas de fallback: se usan si el backend falla o no tiene
// suficientes preguntas cargadas aún.
// ─────────────────────────────────────────────────────────────
const FALLBACK_QUESTIONS: Question[] = [
  { id:"fb1",  texto:"¿Cuál es el ataque especial de Naruto?",           opciones:["Rasengan","Chidori","Amaterasu","Susanoo"],                        correcta:0, categoria:"shonen"   },
  { id:"fb2",  texto:"¿En qué lugar vive Goku de niño?",                 opciones:["Ciudad Parche","Monte Paozu","Ciudad Satán","Neo Ciudad"],          correcta:1, categoria:"shonen"   },
  { id:"fb3",  texto:"¿Qué significa 'isekai'?",                         opciones:["Mundo paralelo","Magia oscura","Mundo diferente","Viaje"],           correcta:2, categoria:"isekai"   },
  { id:"fb4",  texto:"¿Quién es el protagonista de Sword Art Online?",   opciones:["Asuna","Klein","Kirito","Silica"],                                  correcta:2, categoria:"isekai"   },
  { id:"fb5",  texto:"¿Cuál es el opening de Attack on Titan?",          opciones:["Gurenge","Guren no Yumiya","Inferno","My Hero"],                     correcta:1, categoria:"opening"  },
  { id:"fb6",  texto:"¿En qué año se estrenó Dragon Ball Z?",            opciones:["1984","1986","1989","1992"],                                        correcta:2, categoria:"clasico"  },
  { id:"fb7",  texto:"¿Cuál es la técnica prohibida de Edward Elric?",   opciones:["Alquimia humana","Piedra filosofal","Transmutación inversa","Gate"], correcta:0, categoria:"seinen"   },
  { id:"fb8",  texto:"¿Qué mecha pilota Shinji Ikari?",                  opciones:["Eva-00","Eva-01","Eva-02","Eva-03"],                                correcta:1, categoria:"mecha"    },
  { id:"fb9",  texto:"¿Cómo se llama la espada de Ichigo Kurosaki?",     opciones:["Benihime","Senbonzakura","Zangetsu","Ryūjin Jakka"],                correcta:2, categoria:"shonen"   },
  { id:"fb10", texto:"¿Quién mata a Jiraiya en Naruto Shippuden?",       opciones:["Itachi","Orochimaru","Pain","Madara"],                              correcta:2, categoria:"shonen"   },
];

// ─────────────────────────────────────────────────────────────
// Mezclar array (Fisher-Yates)
// ─────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────
export function useGameQuestions() {
  const cacheRef = useRef<Map<string, Question[]>>(new Map());

  /**
   * Obtiene preguntas del backend.
   * @param categorias  Array de categorías seleccionadas en la batalla.
   * @param count       Cantidad de preguntas (default 10).
   * @returns           Array de preguntas listas para el juego.
   */
  const fetchQuestions = useCallback(
    async (categorias: string[], count = 10): Promise<Question[]> => {
      const cacheKey = `${categorias.sort().join(",")}_${count}`;

      // Si ya tenemos preguntas en caché para esta combinación, re-mezclarlas
      if (cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!;
        return shuffle(cached).slice(0, count);
      }

      try {
        const token = typeof window !== "undefined"
          ? localStorage.getItem("nakama_token")
          : null;

        const params = new URLSearchParams({ count: String(count) });
        if (categorias.length > 0) {
          params.set("categorias", categorias.join(","));
        }

        const res = await fetch(`${API}/questions/random?${params}`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const questions: Question[] = data.questions ?? [];

        if (questions.length === 0) {
          throw new Error("Sin preguntas en el backend para estas categorías");
        }

        // Guardar en caché (sin mezclar, la mezcla se hace al recuperar)
        cacheRef.current.set(cacheKey, questions);

        return shuffle(questions).slice(0, count);
      } catch (err) {
        console.warn("[useGameQuestions] fallback a preguntas locales:", err);
        // Filtrar por categoría si es posible
        const filtered = FALLBACK_QUESTIONS.filter(
          q => categorias.length === 0 || categorias.includes(q.categoria)
        );
        const pool = filtered.length >= count ? filtered : FALLBACK_QUESTIONS;
        return shuffle(pool).slice(0, count);
      }
    },
    []
  );

  /**
   * Versión sincrónica de emergencia — solo usa fallback.
   * Se llama si el async falla antes de que llegue la respuesta.
   */
  const generateFallback = useCallback(
    (categorias: string[], count = 10): Question[] => {
      const filtered = FALLBACK_QUESTIONS.filter(
        q => categorias.length === 0 || categorias.includes(q.categoria)
      );
      const pool = filtered.length >= count ? filtered : FALLBACK_QUESTIONS;
      return shuffle(pool).slice(0, count);
    },
    []
  );

  return { fetchQuestions, generateFallback };
}