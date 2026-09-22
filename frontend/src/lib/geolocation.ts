export type LocationFailure = 'unsupported' | 'denied' | 'unavailable'

export class LocationError extends Error {
  constructor(public reason: LocationFailure) {
    super(reason)
  }
}

// One position reading as a promise. The caller says what to show for each
// failure - a denied permission needs different advice than a missing GPS.
export function getPosition(timeoutMs = 10_000): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return reject(new LocationError('unsupported'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      (e) => reject(new LocationError(e.code === 1 ? 'denied' : 'unavailable')),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 }
    )
  })
}
