// src/services/socketService.js
const { Server } = require('socket.io');

class SocketService {
  constructor(server, corsOptions) {
    this.io = new Server(server, {
      cors: corsOptions,
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.connectedClients = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ Cliente WebSocket conectado: ${socket.id}`);
      
      // Guardar información del cliente
      this.connectedClients.set(socket.id, {
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // Enviar estadísticas de conexión
      socket.emit('connection-info', {
        clientId: socket.id,
        connectedAt: new Date().toISOString(),
        totalClients: this.connectedClients.size
      });

      // Manejar solicitud de datos iniciales
      socket.on('request-initial-data', async () => {
        try {
          const LocationController = require('../controllers/locationController');
          const LocationModel = require('../models/locationModel');
          
          // Obtener los últimos registros
          const recentData = await LocationModel.getAll(10, 0);
          
          socket.emit('initial-data', {
            success: true,
            data: recentData,
            timestamp: new Date().toISOString()
          });
          
          console.log(`������ Datos iniciales enviados a ${socket.id}`);
        } catch (error) {
          console.error('Error enviando datos iniciales:', error);
          socket.emit('initial-data', {
            success: false,
            error: 'Error al obtener datos iniciales'
          });
        }
      });

      // Manejar ping del cliente para mantener conexión activa
      socket.on('ping', () => {
        if (this.connectedClients.has(socket.id)) {
          this.connectedClients.get(socket.id).lastActivity = new Date();
        }
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Manejar solicitud de estadísticas
      socket.on('request-stats', () => {
        const stats = {
          totalClients: this.connectedClients.size,
          clientInfo: this.connectedClients.get(socket.id),
          serverTime: new Date().toISOString()
        };
        socket.emit('stats-update', stats);
      });

      // Manejar desconexión
      socket.on('disconnect', (reason) => {
        console.log(`������ Cliente WebSocket desconectado: ${socket.id}, razón: ${reason}`);
        this.connectedClients.delete(socket.id);
        
        // Notificar a otros clientes sobre el cambio en el número de conexiones
        this.io.emit('client-count-update', {
          totalClients: this.connectedClients.size
        });
      });

      // Manejar errores
      socket.on('error', (error) => {
        console.error(`Error en socket ${socket.id}:`, error);
      });

      // Notificar a todos los clientes sobre nueva conexión
      this.io.emit('client-count-update', {
        totalClients: this.connectedClients.size
      });
    });

    // Manejar errores del servidor Socket.IO
    this.io.on('error', (error) => {
      console.error('Error en servidor Socket.IO:', error);
    });
  }

  // Transmitir nueva ubicación a todos los clientes conectados
  broadcastNewLocation(locationData) {
    const message = {
      type: 'new-location',
      data: locationData,
      timestamp: new Date().toISOString(),
      totalClients: this.connectedClients.size
    };

    console.log(`������ Transmitiendo nueva ubicación a ${this.connectedClients.size} clientes`);
    this.io.emit('location-update', message);
  }

  // Transmitir mensaje personalizado
  broadcastMessage(eventName, data) {
    this.io.emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
      totalClients: this.connectedClients.size
    });
  }

  // Enviar mensaje a un cliente específico
  sendToClient(clientId, eventName, data) {
    if (this.io.sockets.sockets.has(clientId)) {
      this.io.to(clientId).emit(eventName, {
        ...data,
        timestamp: new Date().toISOString()
      });
      return true;
    }
    return false;
  }

  // Obtener estadísticas de conexiones
  getConnectionStats() {
    return {
      totalClients: this.connectedClients.size,
      clients: Array.from(this.connectedClients.entries()).map(([id, info]) => ({
        id,
        ...info
      }))
    };
  }

  // Limpiar conexiones inactivas
  cleanupInactiveConnections(maxInactiveMinutes = 30) {
    const now = new Date();
    let cleaned = 0;

    for (const [clientId, clientInfo] of this.connectedClients.entries()) {
      const inactiveMinutes = (now - clientInfo.lastActivity) / (1000 * 60);
      
      if (inactiveMinutes > maxInactiveMinutes) {
        if (this.io.sockets.sockets.has(clientId)) {
          this.io.sockets.sockets.get(clientId).disconnect(true);
        }
        this.connectedClients.delete(clientId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`������ Limpiadas ${cleaned} conexiones inactivas`);
    }

    return cleaned;
  }
}

module.exports = SocketService;