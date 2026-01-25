"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface WebSocketOptions {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  heartbeatMessage?: string;
  onOpen?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onReconnect?: (attempt: number) => void;
  onMaxReconnectAttemptsReached?: () => void;
}

export interface WebSocketState {
  readyState: number;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastError: Event | null;
}

export function useWebSocket(options: WebSocketOptions) {
  const {
    url,
    protocols,
    reconnectInterval = 1000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    heartbeatMessage = JSON.stringify({ type: 'ping', timestamp: Date.now() }),
    onOpen,
    onMessage,
    onError,
    onClose,
    onReconnect,
    onMaxReconnectAttemptsReached,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    readyState: WebSocket.CLOSED,
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastError: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // 清理定时器
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // 启动心跳
  const startHeartbeat = useCallback(() => {
    clearTimeouts();
    heartbeatTimeoutRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(heartbeatMessage);
      }
    }, heartbeatInterval);
  }, [heartbeatMessage, heartbeatInterval, clearTimeouts]);

  // 指数退避重连
  const getReconnectDelay = useCallback((attempt: number) => {
    return Math.min(reconnectInterval * Math.pow(2, attempt), 30000);
  }, [reconnectInterval]);

  // 重连逻辑
  const reconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setState(prev => ({
        ...prev,
        isReconnecting: false,
        reconnectAttempts: reconnectAttemptsRef.current,
      }));
      onMaxReconnectAttemptsReached?.();
      return;
    }

    const delay = getReconnectDelay(reconnectAttemptsRef.current);
    reconnectAttemptsRef.current += 1;

    setState(prev => ({
      ...prev,
      isReconnecting: true,
      reconnectAttempts: reconnectAttemptsRef.current,
    }));

    onReconnect?.(reconnectAttemptsRef.current);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [maxReconnectAttempts, getReconnectDelay, onMaxReconnectAttemptsReached, onReconnect]);

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      lastError: null,
    }));

    try {
      wsRef.current = new WebSocket(url, protocols);

      wsRef.current.onopen = (event) => {
        console.log('WebSocket connected');
        reconnectAttemptsRef.current = 0;
        setState(prev => ({
          ...prev,
          readyState: WebSocket.OPEN,
          isConnected: true,
          isConnecting: false,
          isReconnecting: false,
          reconnectAttempts: 0,
        }));
        startHeartbeat();
        onOpen?.(event);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // 忽略 pong 消息
          if (message.type === 'pong') {
            return;
          }

          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setState(prev => ({
          ...prev,
          lastError: event,
        }));
        onError?.(event);
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        clearTimeouts();
        setState(prev => ({
          ...prev,
          readyState: WebSocket.CLOSED,
          isConnected: false,
          isConnecting: false,
        }));
        onClose?.(event);

        // 如果不是手动关闭，尝试重连
        if (event.code !== 1000 && event.code !== 1001) {
          reconnect();
        }
      };

      setState(prev => ({
        ...prev,
        readyState: WebSocket.CONNECTING,
      }));

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        lastError: error as Event,
      }));
    }
  }, [url, protocols, onOpen, onMessage, onError, onClose, startHeartbeat, reconnect, clearTimeouts]);

  // 发送消息
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(messageStr);
      return true;
    }
    console.warn('WebSocket is not connected');
    return false;
  }, []);

  // 手动关闭连接
  const disconnect = useCallback(() => {
    clearTimeouts();
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setState(prev => ({
      ...prev,
      readyState: WebSocket.CLOSED,
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempts: 0,
    }));
  }, [clearTimeouts]);

  // 手动重连
  const manualReconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // 组件挂载时连接
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    sendMessage,
    disconnect,
    reconnect: manualReconnect,
    connect,
  };
}