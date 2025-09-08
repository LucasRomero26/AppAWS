// src/controllers/locationController.js
const LocationModel = require('../models/locationModel');

class LocationController {
  
  // Obtener todas las ubicaciones
  static async getAllLocations(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      const locations = await LocationModel.getAll(limit, offset);
      const total = await LocationModel.getCount();
      
      res.status(200).json({
        success: true,
        data: locations,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + locations.length < total
        }
      });
    } catch (error) {
      console.error('Error en getAllLocations:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener la ubicación más reciente
  static async getLatestLocation(req, res) {
    try {
      const location = await LocationModel.getLatest();
      
      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron datos de ubicación'
        });
      }

      res.status(200).json({
        success: true,
        data: location
      });
    } catch (error) {
      console.error('Error en getLatestLocation:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener ubicaciones en un rango de tiempo
  static async getLocationsByTimeRange(req, res) {
    try {
      const { startTime, endTime } = req.query;
      
      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'Los parámetros startTime y endTime son requeridos'
        });
      }

      const start = parseInt(startTime);
      const end = parseInt(endTime);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({
          success: false,
          message: 'Los timestamps deben ser números válidos'
        });
      }

      const locations = await LocationModel.getByTimeRange(start, end);
      
      res.status(200).json({
        success: true,
        data: locations,
        count: locations.length
      });
    } catch (error) {
      console.error('Error en getLocationsByTimeRange:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Crear nueva ubicación (usado por el servicio UDP)
  static async createLocation(locationData) {
    try {
      const newLocation = await LocationModel.create(locationData);
      return newLocation;
    } catch (error) {
      console.error('Error en createLocation:', error);
      throw error;
    }
  }

  // Obtener estadísticas básicas
  static async getStats(req, res) {
    try {
      const total = await LocationModel.getCount();
      const latest = await LocationModel.getLatest();
      
      res.status(200).json({
        success: true,
        data: {
          totalRecords: total,
          latestRecord: latest,
          serverTime: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error en getStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = LocationController;