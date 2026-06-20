import { useEffect, useRef, useCallback, useState } from 'react';

export default function useServerSync(token = null, subscribeUserId = null) {
  const wsRef = useRef(null);
  const handlersRef = useRef({});
  const reconnectTimeout = useRef(null);
  const [connected, setConnected] = useState(false);
  const mountedRef = useRef(true);
  // Generation counter — only the latest connection matters
  const genRef = useRef(0);
  // Keep token and subscribeUserId in refs so the connect closure always has latest
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const subscribeUserIdRef = useRef(subscribeUserId);
  subscribeUserIdRef.current = subscribeUserId;

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
    const wsUrl = import.meta.env.DEV
      ? 'ws://localhost:3001'
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      if (gen !== genRef.current) return; // stale socket
      console.log('[sync] connected');

      // Send auth token if available (admin mode)
      const currentToken = tokenRef.current;
      if (currentToken) {
        socket.send(JSON.stringify({ type: 'auth', token: currentToken }));
        console.log('[sync] auth token sent');
      }
      // Send subscribe if in overlay mode (no token)
      const currentSubId = subscribeUserIdRef.current;
      if (!currentToken && currentSubId) {
        socket.send(JSON.stringify({ type: 'subscribe', userId: currentSubId }));
        console.log('[sync] subscribed to user:', currentSubId);
      }

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

  // Reconnect when token or subscribeUserId changes
  useEffect(() => {
    const ws = wsRef.current;
    if (ws) {
      try { ws.close(); } catch (_) {}
      wsRef.current = null;
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    connect();
  }, [token, subscribeUserId]);

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
