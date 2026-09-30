import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import en from '../en.json'
import km from '../km.json'

const flatten = (obj: Record<string, any>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object'
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  )

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return name === 'locales' ? [] : walk(full)
    return /\.(vue|ts|js)$/.test(name) ? [full] : []
  })

describe('locales', () => {
  const enKeys = flatten(en)
  const kmKeys = flatten(km)

  it('km has exactly the same keys as en', () => {
    expect(enKeys.filter((k) => !kmKeys.includes(k))).toEqual([])
    expect(kmKeys.filter((k) => !enKeys.includes(k))).toEqual([])
  })

  it('has no empty translations', () => {
    const empty = (obj: Record<string, any>) =>
      flatten(obj).filter((k) => {
        const v = k.split('.').reduce((o: any, p) => o?.[p], obj)
        return typeof v === 'string' && v.trim() === ''
      })
    expect(empty(en)).toEqual([])
    expect(empty(km)).toEqual([])
  })

  it('every literal t()/$t() key used in src exists', () => {
    const known = new Set(enKeys)
    const missing: string[] = []
    const re = /(?:\$t|\bt|i18n\.global\.t|translate)\(\s*(['"])([A-Za-z0-9_.]+)\1/g
    for (const file of walk(join(__dirname, '../..'))) {
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(re)) {
        if (m[2].includes('.') && !known.has(m[2])) missing.push(`${file}: ${m[2]}`)
      }
    }
    expect(missing).toEqual([])
  })
})
