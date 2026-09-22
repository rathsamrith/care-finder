import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'

import ScheduleEditor from '../schedule-editor.vue'

const get = vi.fn()
const put = vi.fn()
vi.mock('@/plugins/axios', () => ({ default: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) } }))

const render = async (days: unknown[] = []) => {
  get.mockResolvedValue({ data: { doctorId: 5, days } })
  const w = mount(ScheduleEditor, { props: { doctorId: 5 }, global: { plugins: [i18n] } })
  await flushPromises()
  return w
}
const checkboxes = (w: ReturnType<typeof mount>) => w.findAll('input[type="checkbox"]')
const saveButton = (w: ReturnType<typeof mount>) => w.findAll('button').find((b) => b.text() === 'Save working hours')!

describe('ScheduleEditor', () => {
  beforeEach(() => {
    get.mockReset()
    put.mockReset()
  })

  it('shows the stored week Monday-first, with hours for working days and "Day off" for the rest', async () => {
    const w = await render([
      { weekday: 1, intervals: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '17:00' }] },
      { weekday: 3, intervals: [{ start: '09:00', end: '11:00' }] }
    ])
    const enabled = checkboxes(w).map((c) => (c.element as HTMLInputElement).checked)
    expect(enabled).toEqual([true, false, true, false, false, false, false]) // Mon..Sun
    expect(w.findAll('input[type="time"]')).toHaveLength(6) // 2 + 1 intervals, start+end each
    expect((w.findAll('input[type="time"]')[0].element as HTMLInputElement).value).toBe('08:00')
    expect(w.text()).toContain('Day off')
    expect(w.text()).not.toContain('follow the hospital') // has a schedule
  })

  it('with nothing set, explains that bookings follow the hospital hours', async () => {
    const w = await render([])
    expect(w.text()).toContain("bookings follow the hospital's opening hours")
  })

  it('switching a day on adds default hours; the save sends only the working days', async () => {
    put.mockResolvedValue({ data: {} })
    const w = await render([])
    await checkboxes(w)[0].setValue(true) // Monday
    await checkboxes(w)[6].setValue(true) // Sunday (weekday 0)
    await saveButton(w).trigger('click')
    await flushPromises()
    expect(put).toHaveBeenCalledWith('/doctors/5/schedule', {
      days: [
        { weekday: 1, intervals: [{ start: '08:00', end: '17:00' }] },
        { weekday: 0, intervals: [{ start: '08:00', end: '17:00' }] }
      ]
    })
    expect(w.emitted('saved')).toHaveLength(1)
  })

  it('an extra range starts where the last one ended; at most 4 ranges per day', async () => {
    const w = await render([{ weekday: 2, intervals: [{ start: '08:00', end: '12:00' }] }])
    const add = () => w.findAll('button').find((b) => b.text() === 'Add hours')
    await add()!.trigger('click')
    expect((w.findAll('input[type="time"]')[2].element as HTMLInputElement).value).toBe('12:00')
    await add()!.trigger('click')
    await add()!.trigger('click')
    expect(w.findAll('input[type="time"]')).toHaveLength(8) // 4 ranges
    expect(add()).toBeUndefined()
  })

  it('removing the last range switches the day off', async () => {
    const w = await render([{ weekday: 1, intervals: [{ start: '08:00', end: '12:00' }] }])
    await w.find('button[aria-label="Remove"]').trigger('click')
    expect((checkboxes(w)[0].element as HTMLInputElement).checked).toBe(false)
  })

  it('shows the server\'s reason when saving fails, and does not report success', async () => {
    put.mockRejectedValue(
      Object.assign(new Error('bad'), { response: { status: 400, data: { message: 'Time ranges on the same day cannot overlap' } } })
    )
    const w = await render([{ weekday: 1, intervals: [{ start: '08:00', end: '12:00' }] }])
    await saveButton(w).trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('cannot overlap')
    expect(w.emitted('saved')).toBeUndefined()
  })

  it('shows an error if the hours cannot be loaded', async () => {
    get.mockRejectedValue(new Error('network'))
    const w = mount(ScheduleEditor, { props: { doctorId: 5 }, global: { plugins: [i18n] } })
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('Could not load')
  })
})
