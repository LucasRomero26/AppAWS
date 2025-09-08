// src/routes/locationRoutes.js
const express = require('express');
const LocationController = require('../controllers/locationController');

const router = express.Router();

// GET /api/locations - Obtener todas las ubicaciones con paginación
router.get('/', LocationController.getAllLocations);

// GET /api/locations/latest - Obtener la ubicación más reciente
router.get('/latest', LocationController.getLatestLocation);

// GET /api/locations/range - Obtener ubicaciones por rango de tiempo
router.get('/range', LocationController.getLocationsByTimeRange);

// GET /api/locations/stats - Obtener estadísticas
router.get('/stats', LocationController.getStats);

// Middleware para manejar rutas no encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    availableEndpoints: [
      'GET /api/locations',
      'GET /api/locations/latest',
      'GET /api/locations/range?startTime=&endTime=',
      'GET /api/locations/stats'
    ]
  });
});

module.exports = router;