import jsQR from 'jsqr'
import { onBeforeUnmount, ref, type Ref } from 'vue'

export type ScannerFailure = 'unsupported' | 'blocked'

// Reads QR codes from the camera (works in any browser with getUserMedia - no
// dependence on the BarcodeDetector API, which Safari/Firefox lack). Needs HTTPS
// or localhost, like any camera use. The same code is reported at most once per
// `repeatMs`, so holding a phone up doesn't fire a stream of check-ins.
export function useQrScanner(video: Ref<HTMLVideoElement | null>, onCode: (code: string) => void, repeatMs = 4000) {
  const active = ref(false)
  const failure = ref<ScannerFailure | null>(null)

  let stream: MediaStream | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastCode = ''
  let lastAt = 0
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null

  const tick = () => {
    const el = video.value
    if (!active.value || !el || !canvas) return
    if (el.readyState >= 2 && el.videoWidth > 0) {
      const scale = Math.min(1, 480 / el.videoWidth)
      canvas.width = Math.round(el.videoWidth * scale)
      canvas.height = Math.round(el.videoHeight * scale)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height)
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const hit = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })
        const now = Date.now()
        if (hit?.data && (hit.data !== lastCode || now - lastAt > repeatMs)) {
          lastCode = hit.data
          lastAt = now
          onCode(hit.data)
        }
      }
    }
    timer = setTimeout(tick, 200)
  }

  const start = async () => {
    failure.value = null
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      failure.value = 'unsupported'
      return
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    } catch {
      failure.value = 'blocked'
      return
    }
    const el = video.value
    if (!el) return stop()
    el.srcObject = stream
    el.setAttribute('playsinline', 'true')
    await el.play().catch(() => undefined)
    active.value = true
    tick()
  }

  const stop = () => {
    active.value = false
    if (timer) clearTimeout(timer)
    timer = null
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
    if (video.value) video.value.srcObject = null
  }

  onBeforeUnmount(stop)
  return { start, stop, active, failure }
}
