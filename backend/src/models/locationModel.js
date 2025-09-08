// src/models/locationModel.js
const { pool } = require('../config/database');

class LocationModel {
  
  // Crear un nuevo registro de ubicación
  static async create(locationData) {
    const query = `
      INSERT INTO location_data (
        latitude, longitude, timestamp_value, accuracy, altitude, speed, provider
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      locationData.lat,
      locationData.lon,
      locationData.time,
      locationData.acc || null,
      locationData.alt || null,
      locationData.spd || null,
      locationData.prov || null
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error al crear registro de ubicación:', error);
      throw error;
    }
  }

  // Obtener todos los registros de ubicación (con paginación)
  static async getAll(limit = 50, offset = 0) {
    const query = `
      SELECT id, latitude, longitude, timestamp_value, created_at
      FROM location_data
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error al obtener registros de ubicación:', error);
      throw error;
    }
  }

  // Obtener el último registro de ubicación
  static async getLatest() {
    const query = `
      SELECT id, latitude, longitude, timestamp_value, created_at
      FROM location_data
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error al obtener último registro:', error);
      throw error;
    }
  }

  // Obtener registros en un rango de tiempo
  static async getByTimeRange(startTime, endTime) {
    const query = `
      SELECT id, latitude, longitude, timestamp_value, created_at
      FROM location_data
      WHERE timestamp_value BETWEEN $1 AND $2
      ORDER BY timestamp_value ASC
    `;

    try {
      const result = await pool.query(query, [startTime, endTime]);
      return result.rows;
    } catch (error) {
      console.error('Error al obtener registros por rango de tiempo:', error);
      throw error;
    }
  }

  // Obtener el conteo total de registros
  static async getCount() {
    const query = 'SELECT COUNT(*) as total FROM location_data';

    try {
      const result = await pool.query(query);
      return parseInt(result.rows[0].total);
    } catch (error) {
      console.error('Error al obtener conteo de registros:', error);
      throw error;
    }
  }

  // Eliminar registros antiguos (limpieza)
  static async deleteOldRecords(daysOld = 30) {
    const query = `
      DELETE FROM location_data
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
    `;

    try {
      const result = await pool.query(query);
      return result.rowCount;
    } catch (error) {
      console.error('Error al eliminar registros antiguos:', error);
      throw error;
    }
  }
}

module.exports = LocationModel;