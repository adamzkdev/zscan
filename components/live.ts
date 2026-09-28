"use client";

import { useEffect, useRef } from "react";

export type LiveEvent =
  | { type: "block"; data: { height: number; hash: string; tx_count: number } }
  | { type: "mempool"; data: { txid: string; kind: string; fee: number | null; size: number } };

/** WebSocket URL for live events. Same origin behind a reverse proxy; API port in local dev. */
function wsUrl() {
  // Set at runtime by the server (PUBLIC_WS_URL) so one build fits every deployment.
  const configured = document.body.dataset.wsUrl;
  if (configured) return configured;
  const { protocol, host } = window.location;
  return `${protocol === "https:" ? "wss" : "ws"}://${host}/v1/ws`;
}

/** Subscribes to live events with automatic reconnect. */
export function useLive(onEvent: (e: LiveEvent) => void) {
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      ws = new WebSocket(wsUrl());
      ws.onmessage = (m) => {
        try {
          handler.current(JSON.parse(m.data));
        } catch {}
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, []);
}
