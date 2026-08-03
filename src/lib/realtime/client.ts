"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Singleton socket.io client. Strict Mode safe via lazy init + ref guard.
 * Connects through the Caddy gateway via ?XTransformPort=3030.
 */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io("/?XTransformPort=3030", {
    path: "/",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function joinElectionRoom(electionId: string, onUpdate: (data: unknown) => void): () => void {
  const s = getSocket();
  const room = `election:${electionId}`;
  s.emit("join", { room });
  const handler = (data: unknown) => {
    if (data && typeof data === "object" && "electionId" in data && (data as any).electionId === electionId) {
      onUpdate(data);
    }
  };
  s.on("results", handler);
  return () => {
    s.emit("leave", { room });
    s.off("results", handler);
  };
}
