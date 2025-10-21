/**
 * WebSocket hook for real-time game updates
 */

import { useEffect, useRef, useState } from 'react';

export function useWebSocket(roomId, onMessage) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 1000;
  
  useEffect(() => {
    if (!roomId) return;
    
    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/gameroom/${roomId}/stream`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setError(null);
          reconnectAttemptsRef.current = 0;
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            onMessage?.(message);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };
        
        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setError('Connection error');
        };
        
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          
          // Attempt reconnection
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1;
            const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;
            
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setError('Failed to connect after multiple attempts');
          }
        };
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        setError(err.message);
      }
    };
    
    connect();
    
    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomId, onMessage]);
  
  const send = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };
  
  return {
    isConnected,
    error,
    send
  };
}
