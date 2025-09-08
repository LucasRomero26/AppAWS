// src/hooks/useSocket.js - Versión Corregida
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const config = {
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
  SOCKET_OPTIONS: {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
    forceNew: false
  }
};

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [clientCount, setClientCount] = useState(0);
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const listenersRef = useRef(new Map()); // Para rastrear listeners activos

  // Función para limpiar todos los listeners
  const cleanupListeners = useCallback(() => {
    if (socketRef.current) {
      listenersRef.current.forEach((handler, eventName) => {
        socketRef.current.off(eventName, handler);
      });
      listenersRef.current.clear();
    }
  }, []);

  // Función para crear y configurar el socket
  const createSocket = useCallback(() => {
    console.log('🔌 Creando conexión WebSocket...');
    
    // Limpiar socket anterior si existe
    if (socketRef.current) {
      cleanupListeners();
      socketRef.current.disconnect();
    }
    
    const socket = io(config.SOCKET_URL, config.SOCKET_OPTIONS);
    
    // Eventos de conexión
    socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', socket.id);
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      setLastUpdate(Date.now());
      
      // Solicitar datos iniciales
      socket.emit('request-initial-data');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setLastUpdate(Date.now());
      
      // Si la desconexión fue por error del servidor, intentar reconectar
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      setIsConnected(false);
      setConnectionStatus('error');
      setError(error.message || 'Error de conexión');
      setLastUpdate(Date.now());
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconectado en intento:', attemptNumber);
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      setLastUpdate(Date.now());
      
      // Solicitar datos iniciales después de reconectar
      socket.emit('request-initial-data');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Intentando reconectar WebSocket...', attemptNumber);
      setConnectionStatus('connecting');
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ Error de reconexión:', error);
      setConnectionStatus('error');
      setError('Error de reconexión');
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Falló la reconexión WebSocket');
      setConnectionStatus('disconnected');
      setError('No se pudo reconectar al servidor');
    });

    // Eventos de datos
    socket.on('connection-info', (info) => {
      console.log('ℹ️ Info de conexión recibida:', info);
      setClientCount(info.totalClients || 0);
    });

    socket.on('client-count-update', (data) => {
      console.log('👥 Actualización de clientes:', data.totalClients);
      setClientCount(data.totalClients || 0);
    });

    // Manejar pong del servidor
    socket.on('pong', (data) => {
      console.log('🏓 Pong recibido del servidor:', data.timestamp);
      setLastUpdate(Date.now());
    });

    // Manejar errores generales
    socket.on('error', (error) => {
      console.error('❌ Error de socket:', error);
      setError(error.message || 'Error de socket');
    });

    return socket;
  }, [cleanupListeners]);

  // Inicializar socket
  useEffect(() => {
    socketRef.current = createSocket();

    return () => {
      if (socketRef.current) {
        console.log('🧹 Cerrando conexión WebSocket...');
        cleanupListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [createSocket]);

  // Funciones para interactuar con el socket
  const emit = useCallback((eventName, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(eventName, data);
      return true;
    }
    console.warn('⚠️ Socket no conectado, no se puede emitir:', eventName);
    return false;
  }, []);

  const on = useCallback((eventName, handler) => {
    if (socketRef.current) {
      // Remover listener anterior si existe
      if (listenersRef.current.has(eventName)) {
        const oldHandler = listenersRef.current.get(eventName);
        socketRef.current.off(eventName, oldHandler);
      }
      
      // Agregar nuevo listener
      socketRef.current.on(eventName, handler);
      listenersRef.current.set(eventName, handler);
      
      // Retornar función para limpiar el listener
      return () => {
        if (socketRef.current) {
          socketRef.current.off(eventName, handler);
          listenersRef.current.delete(eventName);
        }
      };
    }
    return () => {};
  }, []);

  const off = useCallback((eventName, handler) => {
    if (socketRef.current) {
      socketRef.current.off(eventName, handler);
      if (handler && listenersRef.current.get(eventName) === handler) {
        listenersRef.current.delete(eventName);
      }
    }
  }, []);

  // Función para reconectar manualmente
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔄 Reconectando manualmente...');
      setConnectionStatus('connecting');
      setError(null);
      socketRef.current.connect();
    } else {
      // Crear nuevo socket si no existe
      socketRef.current = createSocket();
    }
  }, [createSocket]);

  // Función para desconectar
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Desconectando WebSocket...');
      cleanupListeners();
      socketRef.current.disconnect();
    }
  }, [cleanupListeners]);

  // Enviar ping cada 30 segundos para mantener la conexión activa
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('ping');
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionStatus,
    error,
    lastUpdate,
    clientCount,
    emit,
    on,
    off,
    reconnect,
    disconnect
  };
};