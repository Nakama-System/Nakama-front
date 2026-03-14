"use client";

import { useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";

export interface BattlePlayer {
  userId:    string;
  username:  string;
  avatarUrl: string | null;
  status:    "pending" | "accepted" | "declined";
  score:     number;
}

export interface BattleState {
  roomId:     string;
  nombre:     string;
  players:    BattlePlayer[];
  estado:     "waiting" | "active" | "finished" | "cancelled";
  categorias: string[];
}

interface UseBattleSocketProps {
  socket:          Socket | null;
  roomId:          string;
  onStateUpdate?:  (state: BattleState) => void;
  onPlayerOnline?: (userId: string, username: string) => void;
  onPlayerLeft?:   (userId: string) => void;
  onPlayerAnswered?:(userId: string, questionIndex: number) => void;
  onScoreUpdate?:  (userId: string, score: number) => void;
  onBattleEnded?:  (ganadorId: string, players: BattlePlayer[]) => void;
}

export function useBattleSocket({
  socket,
  roomId,
  onStateUpdate,
  onPlayerOnline,
  onPlayerLeft,
  onPlayerAnswered,
  onScoreUpdate,
  onBattleEnded,
}: UseBattleSocketProps) {
  const cbRef = useRef({
    onStateUpdate, onPlayerOnline, onPlayerLeft,
    onPlayerAnswered, onScoreUpdate, onBattleEnded,
  });
  useEffect(() => {
    cbRef.current = {
      onStateUpdate, onPlayerOnline, onPlayerLeft,
      onPlayerAnswered, onScoreUpdate, onBattleEnded,
    };
  });

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit("battle:join", { roomId }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) console.warn("[useBattleSocket] battle:join error:", res.error);
    });

    socket.on("battle:state_update",    (d) => cbRef.current.onStateUpdate?.(d));
    socket.on("battle:player_online",   (d) => cbRef.current.onPlayerOnline?.(d.userId, d.username));
    socket.on("battle:player_left",     (d) => cbRef.current.onPlayerLeft?.(d.userId));
    socket.on("battle:player_answered", (d) => cbRef.current.onPlayerAnswered?.(d.userId, d.questionIndex));
    socket.on("battle:scores",          (d) => cbRef.current.onScoreUpdate?.(d.userId, d.score));
    socket.on("battle:ended",           (d) => cbRef.current.onBattleEnded?.(d.ganadorId, d.players));

    return () => {
      socket.emit("battle:leave", { roomId });
      socket.off("battle:state_update");
      socket.off("battle:player_online");
      socket.off("battle:player_left");
      socket.off("battle:player_answered");
      socket.off("battle:scores");
      socket.off("battle:ended");
    };
  }, [socket, roomId]);

  const sendReady = useCallback(() => {
    socket?.emit("battle:ready", { roomId });
  }, [socket, roomId]);

  const sendAnswer = useCallback((questionIndex: number, answerId: string, timeLeft: number) => {
    socket?.emit("battle:answer", { roomId, questionIndex, answerId, timeLeft });
  }, [socket, roomId]);

  const updateScore = useCallback((score: number) => {
    socket?.emit("battle:score_update", { roomId, score });
  }, [socket, roomId]);

  const finishBattle = useCallback((finalScores: { userId: string; score: number }[]) => {
    socket?.emit("battle:finish", { roomId, finalScores });
  }, [socket, roomId]);

  return { sendReady, sendAnswer, updateScore, finishBattle };
}