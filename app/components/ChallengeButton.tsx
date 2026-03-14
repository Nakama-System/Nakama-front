"use client";

import { useRouter } from "next/navigation";

interface ChallengeButtonProps {
  communityId?: string;
  variant?: "primary" | "floating";
}

export default function ChallengeButton({ communityId, variant = "primary" }: ChallengeButtonProps) {
  const router = useRouter();

  function irACrearDesafio() {
    const params = communityId ? `?communityId=${communityId}` : "";
    router.push(`/createchallenge${params}`);
  }

  if (variant === "floating") {
    return (
      <button
        onClick={irACrearDesafio}
        title="Crear desafío anime"
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #ff6a00 0%, #e05000 100%)",
          color: "#fff",
          fontSize: "1.5rem",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(255,106,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        ⚔️
      </button>
    );
  }

  return (
    <button
      onClick={irACrearDesafio}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 22px",
        borderRadius: 10,
        border: "none",
        background: "linear-gradient(135deg, #ff6a00 0%, #e05000 100%)",
        color: "#fff",
        fontWeight: 700,
        fontSize: "0.9rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        cursor: "pointer",
        boxShadow: "0 4px 18px rgba(255,106,0,0.35)",
      }}
    >
      ⚔️ Crear Desafío Anime
    </button>
  );
}