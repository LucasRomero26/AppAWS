// server.js
const express = require('express');
const http = require('http');
require('dotenv').config();

// Importar configuraciones y servicios
const { testConnection } = require('./src/config/database');
const { corsMiddleware, corsLogger, getSocketCorsOptions } = require('./src/middleware/corsMiddleware');
const locationRoutes = require('./src/routes/locationRoutes');
const UDPService = require('./src/services/udpService');
const SocketService = require('./src/services/socketService');

// Configuración del servidor
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const UDP_PORT = process.env.UDP_PORT || 6001;

// Middlewares globales
app.use(corsLogger);
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para logging de requests
app.use((req, res, next) => {
  console.log(`������ ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'Connected',
      udp: 'Listening on port ' + UDP_PORT,
      websocket: 'Active'
    }
  });
});

// Rutas API
app.use('/api/locations', locationRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'UDP Tracker Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      locations: '/api/locations',
      latest: '/api/locations/latest',
      range: '/api/locations/range',
      stats: '/api/locations/stats'
    },
    services: {
      udp_port: UDP_PORT,
      websocket: 'Available',
      database: 'PostgreSQL'
    }
  });
});

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    requestedUrl: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/locations',
      'GET /api/locations/latest',
      'GET /api/locations/range',
      'GET /api/locations/stats'
    ]
  });
});

// Middleware global para manejo de errores
app.use((error, req, res, next) => {
  console.error('❌ Error global:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error 
    })
  });
});

// Función para inicializar todos los servicios
async function initializeServices() {
  try {
    console.log('������ Iniciando servicios del servidor...\n');

    // 1. Probar conexión a la base de datos
    console.log('1. Probando conexión a PostgreSQL...');
    await testConnection();
    console.log('✅ Conexión a PostgreSQL establecida\n');

    // 2. Inicializar servicio WebSocket
    console.log('2. Inicializando WebSocket...');
    const socketService = new SocketService(server, getSocketCorsOptions());
    console.log('✅ WebSocket inicializado\n');

    // 3. Inicializar servicio UDP
    console.log('3. Inicializando servicio UDP...');
    const udpService = new UDPService(UDP_PORT, socketService);
    await udpService.start();
    console.log('✅ Servicio UDP inicializado\n');

    // 4. Iniciar servidor HTTP
    console.log('4. Iniciando servidor HTTP...');
    server.listen(PORT, () => {
      console.log('✅ Servidor HTTP iniciado\n');
      console.log('='.repeat(50));
      console.log('������ SERVIDOR COMPLETAMENTE INICIALIZADO');
      console.log('='.repeat(50));
      console.log(`������ Servidor HTTP: http://localhost:${PORT}`);
      console.log(`������ Servidor UDP: puerto ${UDP_PORT}`);
      console.log(`������ WebSocket: ws://localhost:${PORT}`);
      console.log(`������ Base de datos: PostgreSQL`);
      console.log(`������️  Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(50));
      console.log('\n������ Endpoints disponibles:');
      console.log(`   GET  ${SERVER_URL}/`);
      console.log(`   GET  ${SERVER_URL}/health`);
      console.log(`   GET  ${SERVER_URL}/api/locations`);
      console.log(`   GET  ${SERVER_URL}/api/locations/latest`);
      console.log(`   GET  ${SERVER_URL}/api/locations/range`);
      console.log(`   GET  ${SERVER_URL}/api/locations/stats`);
      console.log('\n������ Para enviar datos UDP, usa el puerto:', UDP_PORT);
      console.log('   Formato JSON esperado:', JSON.stringify({
        lat: 37.4219983,
        lon: -122.084,
        time: Date.now(),
        acc: 5.0,
        alt: 5.0,
        spd: 0.0,
        prov: "fused"
      }, null, 2));
    });

    // Configurar limpieza de conexiones inactivas cada 30 minutos
    setInterval(() => {
      socketService.cleanupInactiveConnections();
    }, 30 * 60 * 1000);

    return { udpService, socketService };

  } catch (error) {
    console.error('❌ Error inicializando servicios:', error);
    process.exit(1);
  }
}

// Variable para almacenar la URL del servidor
const SERVER_URL = process.env.NODE_ENV === 'production' 
  ? `https://${process.env.VERCEL_URL || 'tu-backend.vercel.app'}`
  : `http://localhost:${PORT}`;

// Manejo graceful de cierre del servidor
process.on('SIGTERM', () => {
  console.log('\n������ Recibida señal SIGTERM, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n������ Recibida señal SIGINT (Ctrl+C), cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  console.error('En promesa:', promise);
  process.exit(1);
});

// Inicializar el servidor
if (require.main === module) {
  initializeServices();
}

module.exports = { app, server };