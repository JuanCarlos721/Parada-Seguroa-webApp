import { useEffect, useMemo, useState } from 'react'
import {
  haversineMeters,
  type CityProfile,
  type TransitUnitTemplate,
} from '../data/cityProfiles'

export interface SimulatedUnit extends TransitUnitTemplate {
  coords: [number, number]
  distanceMeters: number
  etaMinutes: number
  etaBadge: string
}

function interpolatePolyline(
  points: [number, number][],
  progress: number,
): [number, number] {
  if (points.length === 0) return [0, 0]
  if (points.length === 1) return points[0]

  const clamped = ((progress % 1) + 1) % 1
  const segLengths: number[] = []
  let totalLength = 0

  for (let i = 0; i < points.length - 1; i++) {
    const len = haversineMeters(points[i], points[i + 1])
    segLengths.push(len)
    totalLength += len
  }

  if (totalLength === 0) return points[0]

  let targetDist = clamped * totalLength
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i]
    if (targetDist <= segLen || i === segLengths.length - 1) {
      const ratio = segLen === 0 ? 0 : targetDist / segLen
      const [lat1, lng1] = points[i]
      const [lat2, lng2] = points[i + 1]
      return [lat1 + (lat2 - lat1) * ratio, lng1 + (lng2 - lng1) * ratio]
    }
    targetDist -= segLen
  }

  return points[points.length - 1]
}

export function useSimulatedUnits(profile: CityProfile): SimulatedUnit[] {
  const [progressMap, setProgressMap] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const unit of profile.units) {
      init[unit.id] = unit.initialProgress
    }
    return init
  })

  // Reinicia el progreso al cambiar de ciudad
  useEffect(() => {
    const init: Record<string, number> = {}
    for (const unit of profile.units) {
      init[unit.id] = unit.initialProgress
    }
    setProgressMap(init)
  }, [profile])

  // Avanza suavemente las unidades simuladas cada 1.2s
  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgressMap((prev) => {
        const next: Record<string, number> = {}
        for (const unit of profile.units) {
          const current = prev[unit.id] ?? unit.initialProgress
          next[unit.id] = (current + unit.speedPerTick) % 1
        }
        return next
      })
    }, 1200)

    return () => window.clearInterval(timer)
  }, [profile])

  return useMemo(() => {
    return profile.units.map((unit) => {
      const p = progressMap[unit.id] ?? unit.initialProgress
      const coords = interpolatePolyline(profile.routePolyline, p)
      const distanceMeters = Math.max(
        40,
        Math.round(haversineMeters(coords, profile.stopCoords) / 10) * 10,
      )
      const etaMinutes = Math.max(1, Math.round(distanceMeters / 210))
      return {
        ...unit,
        coords,
        distanceMeters,
        etaMinutes,
        etaBadge: `${etaMinutes} min · ${distanceMeters}m`,
      }
    })
  }, [profile, progressMap])
}
