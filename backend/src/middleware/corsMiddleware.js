// src/middleware/corsMiddleware.js
const cors = require('cors');

// Configuración de CORS para desarrollo y producción
const getCorsOptions = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // URLs permitidas
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ];

  // En producción, agregar dominios específicos
  if (!isDevelopment && process.env.PRODUCTION_FRONTEND_URLS) {
    const productionUrls = process.env.PRODUCTION_FRONTEND_URLS.split(',');
    allowedOrigins.push(...productionUrls);
  }

  return {
    origin: (origin, callback) => {
      // Permitir solicitudes sin origin (aplicaciones móviles, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // En desarrollo, ser más permisivo
      if (isDevelopment) {
        return callback(null, true);
      }
      
      // En producción, verificar lista de origins permitidos
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn(`������ Origin bloqueado por CORS: ${origin}`);
        return callback(new Error('No permitido por política CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-Real-IP',
      'X-Forwarded-For'
    ],
    credentials: true,
    optionsSuccessStatus: 200, // Para navegadores legacy
    maxAge: 86400 // Cache preflight por 24 horas
  };
};

// Middleware personalizado para logging CORS
const corsLogger = (req, res, next) => {
  const origin = req.headers.origin || 'No origin';
  console.log(`������ CORS Request - Origin: ${origin}, Method: ${req.method}, URL: ${req.url}`);
  next();
};

// Configuración para Socket.IO
const getSocketCorsOptions = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return {
    origin: isDevelopment ? "*" : [
      process.env.FRONTEND_URL || 'http://localhost:3001',
      ...(process.env.PRODUCTION_FRONTEND_URLS ? 
          process.env.PRODUCTION_FRONTEND_URLS.split(',') : [])
    ],
    methods: ["GET", "POST"],
    credentials: true
  };
};

module.exports = {
  corsMiddleware: cors(getCorsOptions()),
  corsLogger,
  getSocketCorsOptions
};