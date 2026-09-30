// Shared across every view that asks for the visitor's location
// (ExploreView, NearbyView, MapView) so the custom "Use your location?"
// dialog is only ever shown once per browser - the visitor's answer is
// remembered in localStorage and reused (or acted on directly) on every
// later visit instead of asking again.
import { ref } from 'vue'

type LocationChoice = 'granted' | 'denied'

const STORAGE_KEY = 'cf_location_choice'

function readChoice(): LocationChoice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

function writeChoice(choice: LocationChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // Private browsing / storage disabled - worst case we ask again next visit.
  }
}

export function useLocationPermission() {
  const showDialog = ref(false)
  let pendingResult: ((position: GeolocationPosition | null) => void) | null = null

  // Resolves once, either with a position (permission already granted, or
  // just granted by the visitor) or null (denied, unavailable, or dismissed).
  // Only opens the dialog when there's no remembered answer yet - otherwise
  // it acts on the remembered choice directly, without asking again.
  function ensureLocation(onResult: (position: GeolocationPosition | null) => void) {
    if (!navigator.geolocation) {
      onResult(null)
      return
    }

    const stored = readChoice()
    if (stored === 'denied') {
      onResult(null)
      return
    }
    if (stored === 'granted') {
      navigator.geolocation.getCurrentPosition(
        (position) => onResult(position),
        () => {
          // Previously granted but now blocked (e.g. revoked in browser
          // settings) - stop asking and remember the new state.
          writeChoice('denied')
          onResult(null)
        }
      )
      return
    }

    showDialog.value = true
    pendingResult = onResult
  }

  function allow() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        writeChoice('granted')
        pendingResult?.(position)
        pendingResult = null
      },
      () => {
        writeChoice('denied')
        pendingResult?.(null)
        pendingResult = null
      }
    )
  }

  function deny() {
    writeChoice('denied')
    pendingResult?.(null)
    pendingResult = null
  }

  return { showDialog, ensureLocation, allow, deny }
}
