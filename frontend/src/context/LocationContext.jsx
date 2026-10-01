import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  loadLiveRoadGraph,
  requestCurrentPosition,
  reverseGeocodeLocation,
} from '../services/liveSimulationService.js';
import {
  applyLiveHazardsToGraph,
  createUnavailableConditions,
  loadLiveConditions,
} from '../services/liveConditionsService.js';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [nearbyGraph, setNearbyGraph] = useState(null);
  const [status, setStatus] = useState('prompt'); // 'prompt' | 'requesting' | 'active' | 'denied' | 'error' | 'unavailable'
  const [error, setError] = useState('');
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState('');
  const [liveConditions, setLiveConditions] = useState(null);
  const watchIdRef = useRef(null);
  const lastReverseGeocodeRef = useRef('');
  const nearbyGraphRef = useRef(null);
  const baseGraphRef = useRef(null);
  const graphRadiusRef = useRef(500);
  const conditionsLocationRef = useRef('');

  const refreshLiveConditions = useCallback(async (nextLocation, graph = baseGraphRef.current) => {
    if (!nextLocation || !Number.isFinite(nextLocation.lat)) return null;
    try {
      const conditions = await loadLiveConditions(nextLocation, graph);
      setLiveConditions(conditions);
      if (graph) {
        const hazardGraph = applyLiveHazardsToGraph(graph, conditions.hazards);
        nearbyGraphRef.current = hazardGraph;
        setNearbyGraph(hazardGraph);
      }
      return conditions;
    } catch (conditionsError) {
      setLiveConditions(createUnavailableConditions(conditionsError.message));
      return null;
    }
  }, []);

  const applyLocation = useCallback(async (nextLocation) => {
    if (!nextLocation || !Number.isFinite(nextLocation.lat) || !Number.isFinite(nextLocation.lon)) {
      return;
    }

    setLocation(nextLocation);
    setStatus('active');
    setError('');

    // 1. Immediately fetch live weather/conditions for these coordinates
    void refreshLiveConditions(nextLocation, nearbyGraphRef.current);

    // 2. Reverse geocode location
    const locationKey = `${nextLocation.lat.toFixed(4)}:${nextLocation.lon.toFixed(4)}`;
    if (lastReverseGeocodeRef.current !== locationKey) {
      lastReverseGeocodeRef.current = locationKey;
      try {
        const nextAddress = await reverseGeocodeLocation(nextLocation);
        setAddress(nextAddress);
      } catch {
        setAddress({ displayName: `${nextLocation.lat.toFixed(5)}°, ${nextLocation.lon.toFixed(5)}°`, address: {} });
      }
    }

    // 3. Fetch nearby OpenStreetMap roads if not yet loaded
    if (!nearbyGraphRef.current) {
      setIsGraphLoading(true);
      setGraphError('');
      try {
        const graph = await loadLiveRoadGraph({ ...nextLocation, radiusMeters: graphRadiusRef.current });
        baseGraphRef.current = graph;
        nearbyGraphRef.current = graph;
        setNearbyGraph(graph);
        await refreshLiveConditions(nextLocation, graph);
      } catch (err) {
        setGraphError(err.message || 'OpenStreetMap road network could not be loaded for your location.');
      } finally {
        setIsGraphLoading(false);
      }
    } else {
      const nextConditionsKey = `${nextLocation.lat.toFixed(3)}:${nextLocation.lon.toFixed(3)}`;
      if (conditionsLocationRef.current !== nextConditionsKey) {
        conditionsLocationRef.current = nextConditionsKey;
        await refreshLiveConditions(nextLocation);
      }
    }
  }, [refreshLiveConditions]);

  const handleLocationError = useCallback((locationError) => {
    let msg = 'Location access is unavailable.';
    if (locationError.code === 1 || locationError.message?.toLowerCase().includes('denied')) {
      msg = 'Location permission was denied. Click "Enable Location" to allow browser GPS access.';
      setStatus('denied');
    } else if (locationError.code === 2) {
      msg = 'Your GPS position could not be determined. Please verify your device GPS is turned on.';
      setStatus('error');
    } else if (locationError.code === 3) {
      msg = 'Location request timed out. Click "Enable Location" to retry.';
      setStatus('error');
    } else {
      msg = locationError.message || msg;
      setStatus('error');
    }
    setError(msg);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setError('This browser does not provide geolocation. Synthetic mode remains available.');
      return undefined;
    }

    // Check permission state where supported
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          setStatus('denied');
          setError('Location permission was denied. Click "Enable Location" to allow GPS.');
        } else if (result.state === 'granted') {
          setStatus('requesting');
        } else {
          setStatus('prompt');
        }
        result.onchange = () => {
          if (result.state === 'denied') {
            setStatus('denied');
            setError('Location permission was denied. Click "Enable Location" to allow GPS.');
          } else if (result.state === 'granted') {
            setStatus('requesting');
          }
        };
      }).catch(() => {});
    }

    // Watch position in real time using browser GPS
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        void applyLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
          speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
          accuracy: position.coords.accuracy || null,
          timestamp: position.timestamp || Date.now(),
        });
      },
      handleLocationError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [applyLocation, handleLocationError]);

  const requestLocation = useCallback(async () => {
    setStatus('requesting');
    setError('');
    try {
      const nextLocation = await requestCurrentPosition();
      await applyLocation(nextLocation);
      return nextLocation;
    } catch (locationError) {
      handleLocationError(locationError);
      throw locationError;
    }
  }, [applyLocation, handleLocationError]);

  const refreshNearbyGraph = useCallback(async (radiusMeters = graphRadiusRef.current) => {
    const currentLocation = location || (await requestLocation());
    graphRadiusRef.current = radiusMeters;
    setIsGraphLoading(true);
    setGraphError('');
    try {
      const graph = await loadLiveRoadGraph({ ...currentLocation, radiusMeters });
      baseGraphRef.current = graph;
      nearbyGraphRef.current = graph;
      setNearbyGraph(graph);
      await refreshLiveConditions(currentLocation, graph);
      return graph;
    } catch (err) {
      const msg = err.message || 'OpenStreetMap road network could not be loaded.';
      setGraphError(msg);
      throw err;
    } finally {
      setIsGraphLoading(false);
    }
  }, [location, refreshLiveConditions, requestLocation]);

  const value = useMemo(
    () => ({
      location,
      address,
      nearbyGraph,
      status,
      error,
      graphError,
      isGraphLoading,
      liveConditions,
      hasLiveLocation: Boolean(location),
      requestLocation,
      refreshNearbyGraph,
      refreshLiveConditions,
    }),
    [location, address, nearbyGraph, status, error, graphError, isGraphLoading, liveConditions, refreshNearbyGraph, refreshLiveConditions, requestLocation]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocationContext must be used inside LocationProvider');
  return context;
}
