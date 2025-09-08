// src/App.jsx - Versión con Animaciones en los Campos
import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { MapContainer } from 'react-leaflet/MapContainer'
import { TileLayer } from 'react-leaflet/TileLayer'
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { Marker } from 'react-leaflet';
import { Popup } from 'react-leaflet';

// Configuración básica
const config = {
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000',
  APP_NAME: process.env.REACT_APP_APP_NAME || 'Just UDT Location Service Tracker',
  APP_VERSION: '1.0.0'
};

// Hook personalizado para manejar las ubicaciones
function useLocationTracker() {
  const [latestLocation, setLatestLocation] = useState(null);
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalReceived: 0,
    lastUpdateTime: null
  });

  const { 
    isConnected, 
    connectionStatus, 
    error: socketError, 
    clientCount,
    on,
    off 
  } = useSocket();

  // Función para obtener datos iniciales via HTTP
  const fetchInitialData = useCallback(async () => {
    try {
      setError(null);
      console.log('Obteniendo datos iniciales...');
      
      const response = await fetch(`${config.API_BASE_URL}/api/locations/latest`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const location = {
          id: data.data.id,
          latitude: parseFloat(data.data.latitude),
          longitude: parseFloat(data.data.longitude),
          timestamp: parseInt(data.data.timestamp_value),
          created_at: data.data.created_at,
          formattedDate: new Date(parseInt(data.data.timestamp_value)).toLocaleString()
        };
        
        setLatestLocation(location);
        setAllLocations([location]);
        setStats(prev => ({
          ...prev,
          totalReceived: 1,
          lastUpdateTime: Date.now()
        }));
        
        console.log('✅ Datos iniciales cargados:', location);
      } 
    } catch (err) {
      console.error('❌ Error obteniendo datos iniciales:', err);
      setError(`Error de conexión: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Manejar nuevas ubicaciones recibidas via WebSocket
  const handleLocationUpdate = useCallback((data) => {
    console.log('Nueva ubicación recibida via WebSocket:', data);
    
    if (data.data) {
      const newLocation = {
        id: data.data.id,
        latitude: parseFloat(data.data.latitude),
        longitude: parseFloat(data.data.longitude),
        timestamp: parseInt(data.data.timestamp_value),
        created_at: data.data.created_at,
        formattedDate: new Date(parseInt(data.data.timestamp_value)).toLocaleString()
      };
      
      // Actualizar la ubicación más reciente
      setLatestLocation(newLocation);
      
      // Limpiar cualquier error previo
      setError(null);
      
      console.log('✅ Ubicación actualizada en el estado local');
    }
  }, []);

  // Manejar datos iniciales recibidos via WebSocket
  const handleInitialData = useCallback((response) => {
    console.log('Datos iniciales via WebSocket:', response);
    
    if (response.success && response.data && response.data.length > 0) {
      const locations = response.data.map(item => ({
        id: item.id,
        latitude: parseFloat(item.latitude),
        longitude: parseFloat(item.longitude),
        timestamp: parseInt(item.timestamp_value),
        created_at: item.created_at,
        formattedDate: new Date(parseInt(item.timestamp_value)).toLocaleString()
      }));
      
      setLatestLocation(locations[0]); // El más reciente
      setAllLocations(locations);
      setStats(prev => ({
        ...prev,
        totalReceived: locations.length,
        lastUpdateTime: Date.now()
      }));
      
      setLoading(false);
      console.log('✅ Datos iniciales procesados via WebSocket');
    } else if (response.success) {
      // Respuesta exitosa pero sin datos
      setLoading(false);
      console.log('ℹ️ No hay datos disponibles via WebSocket');
    } else {
      console.warn('⚠️ Error en datos iniciales via WebSocket:', response.error);
      setError(response.error || 'Error obteniendo datos iniciales');
      setLoading(false);
    }
  }, []);

  // Configurar listeners de WebSocket
  useEffect(() => {
    if (!isConnected) return;

    console.log(' Configurando listeners de WebSocket...');
    
    // Listener para nuevas ubicaciones
    const cleanupLocationUpdate = on('location-update', handleLocationUpdate);
    
    // Listener para datos iniciales
    const cleanupInitialData = on('initial-data', handleInitialData);
    
    return () => {
      console.log('Limpiando listeners de WebSocket...');
      cleanupLocationUpdate();
      cleanupInitialData();
    };
  }, [isConnected, on, handleLocationUpdate, handleInitialData]);

  // Obtener datos iniciales al cargar la página
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Manejar errores de socket
  useEffect(() => {
    if (socketError && !error) {
      setError(`Error de WebSocket: ${socketError}`);
    }
  }, [socketError, error]);

  return {
    latestLocation,
    allLocations,
    loading,
    error,
    stats,
    connectionStatus,
    isConnected,
    clientCount,
    refresh: fetchInitialData
  };
}

// Componente principal
function App() {

  const JAWG_ACCESS_TOKEN = 'icNC49f9tQCM0CwkpIHYIXmvNjTgtAVrdIf3PdM94merPcn8Bcx806NlkILQrOPS';
  const JAWG_MAP_ID = 'jawg-dark';

  const customIcon = new Icon({
    iconUrl: "icon.svg",
    iconSize: [70, 70]
  })

    const markers = [
    {
      geocode: [latestLocation.latitude, latestLocation.longitude],
      popUp: 'Hello! I am here'
    }
  ]

  const {
    latestLocation,
    allLocations,
    loading,
    error,
    stats,
    connectionStatus,
    isConnected,
    clientCount,
    refresh
  } = useLocationTracker();

  return (

    <>
      <div className="min-h-screen transition-all duration-500 dark">
        <div className="fixed inset-0 -z-10 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-900 to-violet-800">
          </div>
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-10 w-72 h-72 md:w-96 md:h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-40 animate-float"></div>
            <div className="absolute bottom-20 right-10 w-64 h-64 md:w-80 md:h-80 bg-gray-400 rounded-full filter blur-3xl opacity-30 animate-float"></div>
            <div className="absolute top-1/2 left-1/2 w-48 h-48 md:w-64 md:h-64 bg-zinc-500 rounded-full filter blur-3xl opacity-20 animate-float"></div>
          </div>
        </div>

        <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glassmorphism-strong min-w-[80%] md:min-w-[90%] py-3 px-4 rounded-4xl">
          <div className="">
            <h1 className=" py-1 px-3 text-center font-bold text-white/80 text-3xl">
              Just UDP Location Service
            </h1>
          </div>
        </header>

        <div className='flex flex-col md:flex-row items-center mt-22 md:mt-8 justify-between gap-2 max-w-[90%] mx-auto min-h-screen'>

          <div className='glassmorphism-strong rounded-4xl max-w-[100%] p-8  '>
            <h2 className='text-2xl font-bold text-white text-center rounded-4xl mb-8'>
              Last Location Received
            </h2>

            <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>

              <div className='flex flex-row gap-2 justify-left transition-all duration-300 group-hover:scale-105'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm4.28 10.28a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 1 0-1.06 1.06l1.72 1.72H8.25a.75.75 0 0 0 0 1.5h5.69l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3Z" clipRule="evenodd" />
                </svg>

                <h3 className='text-l text-white rounded-xl inline-block'>Latitude:</h3>
              </div>
              <span className='text-white/50 transition-all duration-300 group-hover:scale-105'>{latestLocation.latitude}</span>
            </div>

            <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
              <div className='flex flex-row gap-2 justify-left transition-all duration-300 group-hover:scale-105'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm.53 5.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.72-1.72v5.69a.75.75 0 0 0 1.5 0v-5.69l1.72 1.72a.75.75 0 1 0 1.06-1.06l-3-3Z" clipRule="evenodd" />
                </svg>
                <h3 className='text-l  text-white rounded-xl inline-block'>Longitude:</h3>
              </div>
              <span className='text-white/50'>{latestLocation.longitude}</span>
            </div>

            <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
              <div className='flex flex-row gap-2 group justify-left transition-all duration-300 group-hover:scale-105'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
                </svg>
                <h3 className='text-l  text-white rounded-xl inline-block'>Timestamp:</h3>
              </div>
              <span className='text-white/50'>{latestLocation.timestamp}</span>
            </div>

          </div>

          <div className='glassmorphism-strong rounded-4xl backdrop-blur-lg shadow-lg p-4 max-w-4xl w-full mx-4'>
            <MapContainer center={[latestLocation.latitude, latestLocation.longitude]} zoom={13}>
              <TileLayer
                url={`https://{s}.tile.jawg.io/${JAWG_MAP_ID}/{z}/{x}/{y}{r}.png?access-token=${JAWG_ACCESS_TOKEN}`}
              />

              {markers.map(marker => (
                <Marker position={marker.geocode} icon={customIcon}>
                  <Popup>{marker.popUp}</Popup>
                </Marker>
              ))}

            </MapContainer>
          </div>
        </div>


      </div>
    </>
    
  )
}

export default App;