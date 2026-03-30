import { useState, useCallback } from 'react';
import type { LatLng } from '@jamieblair/windforge-core';

export interface MapPin {
  coordinate: LatLng;
  loading: boolean;
}

interface UseMapInteractionState {
  selectedCoordinate: LatLng | null;
  pin: MapPin | null;
  setSelectedCoordinate: (coord: LatLng) => void;
  setLoading: (loading: boolean) => void;
  clearPin: () => void;
}

export function useMapInteraction(): UseMapInteractionState {
  const [selectedCoordinate, setSelectedCoordinateState] = useState<LatLng | null>(null);
  const [pin, setPin] = useState<MapPin | null>(null);

  const setSelectedCoordinate = useCallback((coord: LatLng) => {
    setSelectedCoordinateState(coord);
    setPin({ coordinate: coord, loading: true });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setPin((prev) => (prev ? { ...prev, loading } : null));
  }, []);

  const clearPin = useCallback(() => {
    setSelectedCoordinateState(null);
    setPin(null);
  }, []);

  return { selectedCoordinate, pin, setSelectedCoordinate, setLoading, clearPin };
}
