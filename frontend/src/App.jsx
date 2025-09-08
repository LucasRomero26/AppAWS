// src/App.jsx - Corrected Version
import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { MapContainer } from 'react-leaflet/MapContainer'
import { TileLayer } from 'react-leaflet/TileLayer'
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { Marker } from 'react-leaflet';
import { Popup } from 'react-leaflet';
// Import loading component
import { FourSquare, ThreeDot } from 'react-loading-indicators';
// Basic configuration
const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Just UDP Location Service Tracker',
  APP_VERSION: '1.0.0'
};

// Custom hook to handle locations
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

  // Function to get initial data via HTTP
  const fetchInitialData = useCallback(async () => {
    try {
      setError(null);
      console.log('Getting initial data...');
      
      const response = await fetch(`${config.API_BASE_URL}/api/locations/latest`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
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
        
        console.log('✅ Initial data loaded:', location);
      } else {
        console.log('ℹ️ No data available');
      }
    } catch (err) {
      console.error('❌ Error getting initial data:', err);
      setError(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle new locations received via WebSocket
  const handleLocationUpdate = useCallback((data) => {
    console.log('New location received via WebSocket:', data);
    
    if (data.data) {
      const newLocation = {
        id: data.data.id,
        latitude: parseFloat(data.data.latitude),
        longitude: parseFloat(data.data.longitude),
        timestamp: parseInt(data.data.timestamp_value),
        created_at: data.data.created_at,
        formattedDate: new Date(parseInt(data.data.timestamp_value)).toLocaleString()
      };
      
      // Update latest location
      setLatestLocation(newLocation);
      
      // Update statistics
      setStats(prev => ({
        totalReceived: prev.totalReceived + 1,
        lastUpdateTime: Date.now()
      }));
      
      // Clear any previous error
      setError(null);
      
      console.log('✅ Location updated in local state');
    }
  }, []);

  // Handle initial data received via WebSocket
  const handleInitialData = useCallback((response) => {
    console.log('Initial data via WebSocket:', response);
    
    if (response.success && response.data && response.data.length > 0) {
      const locations = response.data.map(item => ({
        id: item.id,
        latitude: parseFloat(item.latitude),
        longitude: parseFloat(item.longitude),
        timestamp: parseInt(item.timestamp_value),
        created_at: item.created_at,
        formattedDate: new Date(parseInt(item.timestamp_value)).toLocaleString()
      }));
      
      setLatestLocation(locations[0]); // The most recent
      setAllLocations(locations);
      setStats(prev => ({
        ...prev,
        totalReceived: locations.length,
        lastUpdateTime: Date.now()
      }));
      
      setLoading(false);
      console.log('✅ Initial data processed via WebSocket');
    } else if (response.success) {
      // Successful response but no data
      setLoading(false);
      console.log('ℹ️ No data available via WebSocket');
    } else {
      console.warn('⚠️ Error in initial data via WebSocket:', response.error);
      setError(response.error || 'Error getting initial data');
      setLoading(false);
    }
  }, []);

  // Configure WebSocket listeners
  useEffect(() => {
    if (!isConnected) return;

    console.log('🔌 Setting up WebSocket listeners...');
    
    // Listener for new locations
    const cleanupLocationUpdate = on('location-update', handleLocationUpdate);
    
    // Listener for initial data
    const cleanupInitialData = on('initial-data', handleInitialData);
    
    return () => {
      console.log('🧹 Cleaning up WebSocket listeners...');
      cleanupLocationUpdate();
      cleanupInitialData();
    };
  }, [isConnected, on, handleLocationUpdate, handleInitialData]);

  // Get initial data when loading the page
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Handle socket errors
  useEffect(() => {
    if (socketError && !error) {
      setError(`WebSocket error: ${socketError}`);
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

// Loading Component
const LoadingSpinner = () => (
  <div className="flex items-center mx-auto justify-center p-8">
    <ThreeDot color="#FFFFFF" size="medium" text="" textColor="" />
  </div>
);

// Error Component
const ErrorMessage = ({ error, onRetry }) => (
  <div className="glassmorphism-strong mt-40 md:-mt-60 rounded-4xl min-w-[90%] mx-auto p-8 text-center">
    <div className="text-red-400 mb-4">
      <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <h3 className="text-xl font-bold">Connection Error</h3>
    </div>
    <p className="text-white/70 mb-4">{error}</p>
    <button 
      onClick={onRetry}
      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
    >
      Retry
    </button>
  </div>
);

// Location information component
const LocationInfo = ({ location }) => (
  <div className='glassmorphism-strong rounded-4xl max-w-[100%] p-8'>
    <h2 className='text-2xl font-bold text-white text-center rounded-4xl mb-8'>
      Latest Location Received
    </h2>

    <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
      <div className='flex flex-row gap-2 justify-left transition-all duration-300 group-hover:scale-105'>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm4.28 10.28a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 1 0-1.06 1.06l1.72 1.72H8.25a.75.75 0 0 0 0 1.5h5.69l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3Z" clipRule="evenodd" />
        </svg>
        <h3 className='text-l text-white rounded-xl inline-block'>Latitude:</h3>
      </div>
      <span className='text-white/50 transition-all duration-300 group-hover:scale-105'>
        {location.latitude.toFixed(6)}
      </span>
    </div>

    <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
      <div className='flex flex-row gap-2 justify-left transition-all duration-300 group-hover:scale-105'>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm.53 5.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.72-1.72v5.69a.75.75 0 0 0 1.5 0v-5.69l1.72 1.72a.75.75 0 1 0 1.06-1.06l-3-3Z" clipRule="evenodd" />
        </svg>
        <h3 className='text-l text-white rounded-xl inline-block'>Longitude:</h3>
      </div>
      <span className='text-white/50'>
        {location.longitude.toFixed(6)}
      </span>
    </div>

    <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
      <div className='flex flex-row gap-2 group justify-left transition-all duration-300 group-hover:scale-105'>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
        </svg>
        <h3 className='text-l text-white rounded-xl inline-block'>Timestamp:</h3>
      </div>
      <span className='text-white/50'>{location.timestamp}</span>
    </div>

    <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
      <div className='flex flex-row gap-2 group justify-left transition-all duration-300 group-hover:scale-105'>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6">
          <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
          <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
        </svg>
        <h3 className='text-l text-white rounded-xl inline-block'>Date:</h3>
      </div>
      <span className='text-white/50 text-sm'>{location.formattedDate}</span>
    </div>
  </div>
);

// Map Component
const LocationMap = ({ location }) => {
  const JAWG_ACCESS_TOKEN = 'icNC49f9tQCM0CwkpIHYIXmvNjTgtAVrdIf3PdM94merPcn8Bcx806NlkILQrOPS';
  const JAWG_MAP_ID = 'jawg-dark';

  const customIcon = new Icon({
    iconUrl: "/icon.svg", // Use absolute path from public
    iconSize: [70, 70]
  });

  const markers = [
    {
      geocode: [location.latitude, location.longitude],
      popUp: `Location received: ${location.formattedDate}`
    }
  ];

  return (
    <div className='glassmorphism-strong rounded-4xl backdrop-blur-lg shadow-lg p-4 max-w-4xl w-full mx-4'>
      <MapContainer 
        center={[location.latitude, location.longitude]} 
        zoom={13}
        key={`${location.latitude}-${location.longitude}`} // Force re-render when location changes
      >
        <TileLayer
          url={`https://{s}.tile.jawg.io/${JAWG_MAP_ID}/{z}/{x}/{y}{r}.png?access-token=${JAWG_ACCESS_TOKEN}`}
        />
        {markers.map((marker, index) => (
          <Marker 
            key={index} 
            position={marker.geocode} 
            icon={customIcon}
          >
            <Popup>{marker.popUp}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

// Main component
function App() {
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
          <h1 className="py-1 px-3 text-center font-bold text-white/80 text-3xl">
            {config.APP_NAME}
          </h1>
        </div>
      </header>

      <div className='flex flex-col md:flex-row items-center mt-22 md:mt-8 justify-between gap-2 max-w-[90%] mx-auto min-h-screen'>
        
        {/* Show loading, error or content */}
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
            <p className="text-white/70">No location data available</p>
            <button 
              onClick={refresh}
              className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;