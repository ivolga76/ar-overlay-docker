import { useEffect, useRef, useCallback, useState } from 'react';

export default function useServerSync() {
  const wsRef = useRef(null);
  const handlersRef = useRef({});
  const reconnectTimeout = useRef(null);
  const [connected, setConnected] = useState(false);
  const mountedRef = useRef(true);
  // Generation counter — only the latest connection matters
  const genRef = useRef(0);

  const send = useCallback((data) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const on = useCallback((type, handler) => {
    handlersRef.current[type] = handler;
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    // Already connected or connecting
    const ws = wsRef.current;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    const gen = ++genRef.current;
    const socket = new WebSocket('ws://localhost:3001');
    wsRef.current = socket;

    socket.onopen = () => {
      if (gen !== genRef.current) return; // stale socket
      console.log('[sync] connected');
      setConnected(true);
    };

    socket.onmessage = (event) => {
      if (gen !== genRef.current) return;
      try {
        const msg = JSON.parse(event.data);
        const handler = handlersRef.current[msg.type];
        if (handler) handler(msg);
      } catch (e) {
        console.error('[sync] bad message:', e.message);
      }
    };

    socket.onclose = () => {
      if (gen !== genRef.current) return; // stale socket
      setConnected(false);
      console.log('[sync] disconnected, reconnecting in 1s...');
      if (mountedRef.current && !reconnectTimeout.current) {
        reconnectTimeout.current = setTimeout(() => {
          reconnectTimeout.current = null;
          connect();
        }, 1000);
      }
    };

    socket.onerror = () => {
      // onclose will fire after this
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      const ws = wsRef.current;
      if (ws) {
        wsRef.current = null;
        try { ws.close(); } catch (_) {}
      }
    };
  }, [connect]);

  return { send, on, connected };
}