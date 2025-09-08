// src/services/udpService.js
const dgram = require('dgram');
const LocationController = require('../controllers/locationController');

class UDPService {
  constructor(port, socketService) {
    this.port = port;
    this.server = dgram.createSocket('udp4');
    this.socketService = socketService;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Manejar mensajes recibidos
    this.server.on('message', async (msg, rinfo) => {
      try {
        console.log(`\n=== UDP Message Received ===`);
        console.log(`From: ${rinfo.address}:${rinfo.port}`);
        console.log(`Raw message: ${msg}`);
        
        // Parsear el JSON
        const locationData = JSON.parse(msg.toString());
        console.log(`Parsed data:`, locationData);
        
        // Validar que tenga los campos requeridos
        if (!this.validateLocationData(locationData)) {
          console.warn('Datos de ubicación inválidos:', locationData);
          return;
        }

        // Guardar en la base de datos
        const savedLocation = await LocationController.createLocation(locationData);
        console.log('Ubicación guardada en BD:', savedLocation.id);

        // Preparar datos para el frontend (solo lat, lon, timestamp)
        const frontendData = {
          id: savedLocation.id,
          latitude: savedLocation.latitude,
          longitude: savedLocation.longitude,
          timestamp_value: savedLocation.timestamp_value,
          created_at: savedLocation.created_at
        };

        // Emitir a todos los clientes conectados via WebSocket
        this.socketService.broadcastNewLocation(frontendData);
        
        console.log(`=== Processed Successfully ===\n`);
        
      } catch (error) {
        console.error('Error procesando mensaje UDP:', error);
        
        if (error instanceof SyntaxError) {
          console.error('JSON inválido recibido:', msg.toString());
        }
      }
    });

    // Manejar errores del servidor
    this.server.on('error', (error) => {
      console.error('Error en servidor UDP:', error);
      this.server.close();
    });

    // Cuando el servidor está listo
    this.server.on('listening', () => {
      const address = this.server.address();
      console.log(`✅ Servidor UDP escuchando en puerto ${address.port}`);
    });

    // Cuando el servidor se cierra
    this.server.on('close', () => {
      console.log('������ Servidor UDP cerrado');
    });
  }

  // Validar que los datos de ubicación tengan los campos requeridos
  validateLocationData(data) {
    const requiredFields = ['lat', 'lon', 'time'];
    
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        console.warn(`Campo requerido faltante: ${field}`);
        return false;
      }
    }

    // Validar tipos de datos
    if (typeof data.lat !== 'number' || typeof data.lon !== 'number') {
      console.warn('lat y lon deben ser números');
      return false;
    }

    if (typeof data.time !== 'number') {
      console.warn('time debe ser un número (timestamp)');
      return false;
    }

    // Validar rangos razonables
    if (data.lat < -90 || data.lat > 90) {
      console.warn('Latitud fuera de rango válido (-90 a 90)');
      return false;
    }

    if (data.lon < -180 || data.lon > 180) {
      console.warn('Longitud fuera de rango válido (-180 a 180)');
      return false;
    }

    return true;
  }

  // Iniciar el servidor UDP
  start() {
    return new Promise((resolve, reject) => {
      this.server.bind(this.port, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  // Detener el servidor UDP
  stop() {
    return new Promise((resolve) => {
      this.server.close(() => {
        resolve();
      });
    });
  }

  // Método para enviar datos de prueba (útil para testing)
  static sendTestData(port, host = 'localhost') {
    const client = dgram.createSocket('udp4');
    const testData = {
      "lat": 37.4219983,
      "lon": -122.084,
      "time": Date.now(),
      "acc": 5.0,
      "alt": 5.0,
      "spd": 0.0,
      "prov": "fused"
    };

    const message = Buffer.from(JSON.stringify(testData));
    
    client.send(message, 0, message.length, port, host, (error) => {
      if (error) {
        console.error('Error enviando datos de prueba:', error);
      } else {
        console.log('Datos de prueba enviados exitosamente');
      }
      client.close();
    });
  }
}

module.exports = UDPService;