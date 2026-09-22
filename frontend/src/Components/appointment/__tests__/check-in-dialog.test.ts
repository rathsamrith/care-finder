import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'
import { LocationError } from '@/lib/geolocation'

import CheckInDialog from '../check-in-dialog.vue'

const get = vi.fn()
const post = vi.fn()
const getPosition = vi.fn()
vi.mock('@/plugins/axios', () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }))
const downloadIcs = vi.fn()
vi.mock('@/lib/ics', async (orig) => ({ ...(await orig<typeof import('@/lib/ics')>()), downloadIcs: (...a: unknown[]) => downloadIcs(...a) }))
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,QR') } }))
vi.mock('@/lib/geolocation', async (orig) => ({ ...(await orig<typeof import('@/lib/geolocation')>()), getPosition: () => getPosition() }))

const pass = {
  reference: 'CF-000007',
  title: 'Heart check',
  patientName: 'Sokha Chan',
  hospital: 'Sunrise General',
  hospitalAddress: '12 Street 20, Phnom Penh',
  doctor: 'Dr Dara Vann',
  room: 'Room 204',
  date: '2026-10-05',
  time: '10:00',
  endTime: '10:30',
  arriveBy: '09:45'
}
const info = (over: object = {}) => ({ code: '3-DYVX-3K3G', status: 'Confirmed', window: 'open', opensAt: '09:00', closesAt: '10:30', ticket: null, appointment: pass, ...over })
const ticket = { queueLabel: 'P-2', patientFirstName: 'Sokha', doctor: 'Dr Dara', room: 'Room 204', appointmentTime: '10:00', peopleAhead: 1, estimatedWaitMinutes: 30 }

const wrappers: ReturnType<typeof mount>[] = []
async function open(data = info()) {
  get.mockResolvedValue({ data })
  const w = mount(CheckInDialog, { props: { open: true, appointmentId: 7 }, attachTo: document.body, global: { plugins: [i18n] } })
  wrappers.push(w)
  await flushPromises()
  return w
}
// reka-ui renders dialog content in a portal on <body>
const body = () => document.body
const phoneButton = () => [...body().querySelectorAll('button')].find((b) => b.textContent?.includes("I'm here")) as HTMLButtonElement | undefined
const text = () => body().textContent ?? ''

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  getPosition.mockReset()
  downloadIcs.mockReset()
  vi.spyOn(window, 'print').mockImplementation(() => undefined)
})
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('check-in dialog', () => {
  it('loads this appointment\'s code and shows it as a QR and as text', async () => {
    await open()
    expect(get).toHaveBeenCalledWith('/appointments/7/check-in-code')
    expect(body().querySelector('[data-testid="code"]')?.textContent).toBe('3-DYVX-3K3G')
    expect(body().querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,QR')
    expect(text()).toContain('Check-in is open from 09:00 to 10:30.')
  })

  it('checks in from the phone with the location, then shows the ticket', async () => {
    getPosition.mockResolvedValue({ latitude: 11.5, longitude: 104.9 })
    post.mockResolvedValue({ data: ticket })
    const w = await open()
    phoneButton()!.click()
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/appointments/7/check-in', { latitude: 11.5, longitude: 104.9 })
    expect(body().querySelector('[data-testid="queue-label"]')?.textContent?.trim()).toBe('P-2')
    expect(text()).toContain("You're checked in, Sokha")
    expect(w.emitted('checkedIn')).toHaveLength(1)
  })

  it('does not offer phone check-in before the window opens, but still shows the code and when it opens', async () => {
    await open(info({ window: 'early' }))
    expect(text()).toContain('Check-in opens at 09:00.')
    expect(phoneButton()!.disabled).toBe(true)
    expect(body().querySelector('[data-testid="code"]')).not.toBeNull()
  })

  it('says check-in has closed after the window', async () => {
    await open(info({ window: 'late' }))
    expect(text()).toContain('Check-in closed at 10:30. Please see reception.')
    expect(phoneButton()!.disabled).toBe(true)
  })

  it('explains an appointment the hospital has not confirmed, with no code to show', async () => {
    await open(info({ status: 'Pending' }))
    expect(text()).toContain('The hospital has not confirmed this appointment yet.')
    expect(body().querySelector('[data-testid="code"]')).toBeNull()
    expect(phoneButton()).toBeUndefined()
  })

  it('shows the ticket straight away when already checked in', async () => {
    await open(info({ status: 'Arrived', ticket: { ...ticket, queueLabel: 'B-3', alreadyCheckedIn: true } }))
    expect(body().querySelector('[data-testid="queue-label"]')?.textContent?.trim()).toBe('B-3')
    expect(phoneButton()).toBeUndefined()
  })

  it('gives location-specific advice when location is refused or unavailable, and does not call the API', async () => {
    await open()
    getPosition.mockRejectedValue(new LocationError('denied'))
    phoneButton()!.click()
    await flushPromises()
    expect(body().querySelector('[role="alert"]')?.textContent).toContain('Allow location access')
    expect(post).not.toHaveBeenCalled()
  })

  it("shows the server's reason when it refuses (for example too far away) and can be retried", async () => {
    getPosition.mockResolvedValue({ latitude: 13.3, longitude: 103.8 })
    post.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 400, data: { message: 'You seem to be 233 km from the hospital. Get closer, or check in at the kiosk or reception.' } } }))
    const w = await open()
    phoneButton()!.click()
    await flushPromises()
    expect(body().querySelector('[role="alert"]')?.textContent).toContain('233 km from the hospital')
    expect(w.emitted('checkedIn')).toBeUndefined()
    expect(phoneButton()!.disabled).toBe(false)
  })
})

describe('the digital pass', () => {
  it('shows the appointment details and the booking reference', async () => {
    await open()
    expect(body().querySelector('[data-testid="banner"]')?.textContent?.trim()).toBe('Appointment confirmed')
    expect(text()).toContain('Booking ref CF-000007')
    const details = body().querySelector('[data-testid="details"]')!.textContent!
    for (const expected of ['Sokha Chan', 'Dr Dara Vann', 'Room 204', 'Mon, 5 Oct 2026', '10:00 - 10:30', 'Sunrise General', '12 Street 20, Phnom Penh']) {
      expect(details).toContain(expected)
    }
  })

  it('banner for an unconfirmed appointment is the neutral title', async () => {
    await open(info({ status: 'Pending' }))
    expect(body().querySelector('[data-testid="banner"]')?.textContent?.trim()).toBe('Check in for your appointment')
  })

  it('banner says "checked in" once the patient has arrived', async () => {
    await open(info({ status: 'Arrived', ticket }))
    expect(body().querySelector('[data-testid="banner"]')?.textContent?.trim()).toBe("You're checked in")
  })

  it('tells them when to arrive and what to do', async () => {
    await open()
    const list = body().querySelector('[data-testid="checklist"]')!.textContent!
    expect(list).toContain('Arrive by 09:45')
    expect(list).toContain('Keep your check-in code ready')
    expect(list).toContain('kiosk, from your phone, or at reception')
  })

  it('the checklist goes away once checked in', async () => {
    await open(info({ status: 'Arrived', ticket }))
    expect(body().querySelector('[data-testid="checklist"]')).toBeNull()
  })

  it('"Add to calendar" downloads an .ics named after the booking, with time, place and code', async () => {
    await open()
    ;[...body().querySelectorAll('button')].find((b) => b.textContent?.includes('Add to calendar'))!.click()
    await flushPromises()
    expect(downloadIcs).toHaveBeenCalledTimes(1)
    const [filename, raw] = downloadIcs.mock.calls[0] as [string, string]
    const content = raw.split('\r\n ').join('') // long lines are folded (CRLF + space) in the file; unfold to read them
    expect(filename).toBe('CF-000007.ics')
    expect(content).toContain('DTSTART:20261005T100000')
    expect(content).toContain('DTEND:20261005T103000')
    expect(content).toContain('SUMMARY:Heart check - Sunrise General')
    expect(content).toContain(String.raw`LOCATION:Sunrise General\, 12 Street 20\, Phnom Penh`) // commas escaped for iCalendar
    expect(content).toContain('3-DYVX-3K3G') // the code travels with the event
  })

  it('"Save as PDF" opens the print dialog, and the pass is what gets printed', async () => {
    await open()
    ;[...body().querySelectorAll('button')].find((b) => b.textContent?.includes('Save as PDF'))!.click()
    expect(window.print).toHaveBeenCalledTimes(1)
    expect(body().querySelector('.print-pass')).not.toBeNull()
    // interactive parts stay out of the printout
    const hidden = [...body().querySelectorAll('[class*="print:hidden"]')].map((e) => e.textContent ?? '')
    expect(hidden.some((t) => t.includes('Save as PDF'))).toBe(true)
    expect(hidden.some((t) => t.includes("I'm here"))).toBe(true)
  })

  it('"Done" closes the dialog', async () => {
    const w = await open()
    ;[...body().querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Done')!.click()
    expect(w.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('still works against a response without pass details (no crash, no pass actions)', async () => {
    await open({ ...info(), appointment: undefined } as any)
    expect(body().querySelector('[data-testid="code"]')?.textContent).toBe('3-DYVX-3K3G')
    expect(body().querySelector('[data-testid="details"]')).toBeNull()
    expect([...body().querySelectorAll('button')].some((b) => b.textContent?.includes('Add to calendar'))).toBe(false)
  })
})
