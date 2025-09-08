// src/App.jsx - Versión Corregida y Optimizada
import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { ThreeDot } from 'react-loading-indicators';

// --- Configuración Básica ---
const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Just UDP Location Service Tracker',
  APP_VERSION: '1.0.0'
};

// --- Custom Hook para manejar la lógica de ubicación ---
function useLocationTracker() {
  const [latestLocation, setLatestLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalReceived: 0, lastUpdateTime: null });
  const { isConnected, connectionStatus, error: socketError, on } = useSocket();

  const fetchInitialData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      console.log('Obteniendo datos iniciales...');
      
      const response = await fetch(`${config.API_BASE_URL}/api/locations/latest`);
      
      if (!response.ok) {
        // Si no hay datos (404), no es un error de conexión, es que la BD está vacía.
        if (response.status === 404) {
          console.log('ℹ️ No hay datos iniciales disponibles en la base de datos.');
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const location = {
          id: data.data.id,
          latitude: parseFloat(data.data.latitude),
          longitude: parseFloat(data.data.longitude),
          timestamp: parseInt(data.data.timestamp_value),
          formattedDate: new Date(parseInt(data.data.timestamp_value)).toLocaleString()
        };
        
        setLatestLocation(location);
        setStats(prev => ({ ...prev, totalReceived: 1, lastUpdateTime: Date.now() }));
        console.log('✅ Datos iniciales cargados:', location);
      }
    } catch (err) {
      console.error('❌ Error obteniendo datos iniciales:', err);
      setError(`Error de conexión: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLocationUpdate = useCallback((data) => {
    console.log('Nueva ubicación recibida vía WebSocket:', data);
    
    if (data.data) {
      const newLocation = {
        id: data.data.id,
        latitude: parseFloat(data.data.latitude),
        longitude: parseFloat(data.data.longitude),
        timestamp: parseInt(data.data.timestamp_value),
        formattedDate: new Date(parseInt(data.data.timestamp_value)).toLocaleString()
      };
      
      setLatestLocation(newLocation);
      setStats(prev => ({ totalReceived: prev.totalReceived + 1, lastUpdateTime: Date.now() }));
      setError(null); // Limpiar error si se reciben datos
      console.log('✅ Ubicación actualizada en el estado local');
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      console.log('🔌 Configurando listeners de WebSocket...');
      const cleanup = on('location-update', handleLocationUpdate);
      return cleanup;
    }
  }, [isConnected, on, handleLocationUpdate]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (socketError && !error) {
      setError(`Error de WebSocket: ${socketError}`);
    }
  }, [socketError, error]);

  return { latestLocation, loading, error, stats, connectionStatus, isConnected, refresh: fetchInitialData };
}

// --- Componentes de UI ---
const LoadingSpinner = () => (
  <div className="flex items-center mx-auto justify-center p-8">
    <ThreeDot color="#FFFFFF" size="medium" text="" textColor="" />
  </div>
);

const ErrorMessage = ({ error, onRetry }) => (
  <div className="glassmorphism-strong mt-40 md:-mt-60 rounded-4xl min-w-[90%] mx-auto p-8 text-center">
    <div className="text-red-400 mb-4">
      <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
      <h3 className="text-xl font-bold">Error de Conexión</h3>
    </div>
    <p className="text-white/70 mb-4">{error}</p>
    <button onClick={onRetry} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">Reintentar</button>
  </div>
);

const LocationInfo = ({ location }) => (
  <div className='glassmorphism-strong rounded-4xl max-w-[100%] p-8'>
    <h2 className='text-2xl font-bold text-white text-center rounded-4xl mb-8'>Última Ubicación Recibida</h2>
    <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
      <div className='flex flex-row gap-2 justify-left transition-all duration-300 group-hover:scale-105'><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm4.28 10.28a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 1 0-1.06 1.06l1.72 1.72H8.25a.75.75 0 0 0 0 1.5h5.69l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3Z" clipRule="evenodd" /></svg><h3 className='text-l text-white rounded-xl inline-block'>Latitud:</h3></div>
      <span className='text-white/50 transition-all duration-300 group-hover:scale-105'>{location.latitude.toFixed(6)}</span>
    </div>
    <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
      <div className='flex flex-row gap-2 justify-left transition-all duration-300 group-hover:scale-105'><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm.53 5.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.72-1.72v5.69a.75.75 0 0 0 1.5 0v-5.69l1.72 1.72a.75.75 0 1 0 1.06-1.06l-3-3Z" clipRule="evenodd" /></svg><h3 className='text-l text-white rounded-xl inline-block'>Longitud:</h3></div>
      <span className='text-white/50'>{location.longitude.toFixed(6)}</span>
    </div>
    <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
      <div className='flex flex-row gap-2 group justify-left transition-all duration-300 group-hover:scale-105'><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" /></svg><h3 className='text-l text-white rounded-xl inline-block'>Timestamp:</h3></div>
      <span className='text-white/50'>{location.timestamp}</span>
    </div>
    <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
      <div className='flex flex-row gap-2 group justify-left transition-all duration-300 group-hover:scale-105'><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6"><path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" /><path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" /></svg><h3 className='text-l text-white rounded-xl inline-block'>Fecha:</h3></div>
      <span className='text-white/50 text-sm'>{location.formattedDate}</span>
    </div>
  </div>
);

// --- Componente del Mapa (Optimizado) ---

// Componente para centrar el mapa suavemente
function ChangeMapView({ coords }) {
  const map = useMap();
  map.setView(coords, map.getZoom());
  return null;
}

const LocationMap = ({ location }) => {
  const JAWG_ACCESS_TOKEN = 'icNC49f9tQCM0CwkpIHYIXmvNjTgtAVrdIf3PdM94merPcn8Bcx806NlkILQrOPS';
  const JAWG_MAP_ID = 'jawg-dark';

  const customIcon = new Icon({
    iconUrl: "/icon.svg",
    iconSize: [70, 70]
  });

  const position = [location.latitude, location.longitude];

  return (
    <div className='glassmorphism-strong rounded-4xl backdrop-blur-lg shadow-lg p-4 max-w-4xl w-full mx-4'>
      <MapContainer 
        center={position} 
        zoom={18} // Zoom actualizado
        style={{ height: '35rem', width: '100%', borderRadius: '1rem' }}
      >
        <TileLayer
          url={`https://{s}.tile.jawg.io/${JAWG_MAP_ID}/{z}/{x}/{y}{r}.png?access-token=${JAWG_ACCESS_TOKEN}`}
        />
        <Marker 
          position={position} 
          icon={customIcon}
        >
          <Popup>{`Location received: ${location.formattedDate}`}</Popup>
        </Marker>
        {/* Este componente se encarga de mover el mapa */}
        <ChangeMapView coords={position} />
      </MapContainer>
    </div>
  );
};

// --- Componente Principal de la App ---
function App() {
  const { latestLocation, loading, error, refresh } = useLocationTracker();

  return (
    <div className="min-h-screen transition-all duration-500 dark">
      <div className="fixed inset-0 -z-10 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-900 to-violet-800"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 md:w-96 md:h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-40 animate-float"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 md:w-80 md:h-80 bg-gray-400 rounded-full filter blur-3xl opacity-30 animate-float"></div>
          <div className="absolute top-1/2 left-1/2 w-48 h-48 md:w-64 md:h-64 bg-zinc-500 rounded-full filter blur-3xl opacity-20 animate-float"></div>
        </div>
      </div>

      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glassmorphism-strong min-w-[80%] md:min-w-[90%] py-3 px-4 rounded-4xl">
        <div className="">
          <h1 className="py-1 px-3 text-center font-bold text-white/80 text-3xl">
            {config.APP_NAME}
          </h1>
        </div>
      </header>

      <main className='flex flex-col md:flex-row items-center mt-22 md:mt-8 justify-between gap-2 max-w-[90%] mx-auto min-h-screen'>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage error={error} onRetry={refresh} />
        ) : latestLocation ? (
          <>
            <LocationInfo location={latestLocation} />
            <LocationMap location={latestLocation} />
          </>
        ) : (
          <div className="glassmorphism-strong min-w-[90%] mx-auto rounded-4xl p-8 text-center">
            <p className="text-white/70">Esperando datos de ubicación...</p>
            <button onClick={refresh} className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
              Refrescar
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
