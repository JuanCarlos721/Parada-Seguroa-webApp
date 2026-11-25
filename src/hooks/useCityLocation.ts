import { useCallback, useEffect, useState } from 'react'
import { detectClosestCity, type CityId } from '../data/cityProfiles'

export type GeoStatus = 'detecting' | 'active' | 'fallback'

export interface UseCityLocationResult {
  cityId: CityId
  userCoords: [number, number] | null
  geoStatus: GeoStatus
  manualOverride: boolean
  selectCity: (city: CityId) => void
  requestGps: () => void
}

export function useCityLocation(defaultCity: CityId = 'tijuana'): UseCityLocationResult {
  const [cityId, setCityId] = useState<CityId>(defaultCity)
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('detecting')
  const [manualOverride, setManualOverride] = useState(false)

  const requestGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeoStatus('fallback')
      return
    }

    setGeoStatus('detecting')
    setManualOverride(false)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ]
        setUserCoords(coords)
        setCityId(detectClosestCity(coords))
        setGeoStatus('active')
      },
      () => {
        setGeoStatus('fallback')
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      },
    )
  }, [])

  useEffect(() => {
    requestGps()
  }, [requestGps])

  const selectCity = useCallback((city: CityId) => {
    setManualOverride(true)
    setCityId(city)
  }, [])

  return {
    cityId,
    userCoords,
    geoStatus,
    manualOverride,
    selectCity,
    requestGps,
  }
}
