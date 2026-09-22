// Fills Hospital.province from each hospital's coordinates. Dry run by default:
//
//   npm run provinces:fill             # show what would change, write nothing
//   npm run provinces:fill -- --apply  # write it
//
// Method: match the hospital to its nearest commune centre (the web app ships ~1,200
// commune coordinates in frontend/src/province/) and take that commune's province.
// Only hospitals whose province is EMPTY are touched (never overwrites), and a
// hospital is skipped - left empty for a person to decide - when it sits close to a
// province border, is far from any commune, or its name clearly names another
// province. Stored spellings are the ones the Explore page's filter matches on.
// Safe to re-run; run it after importing new hospitals (prisma/seed-cambodia-hospitals.ts).
import { createRequire } from 'module'
import { pathToFileURL, fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'
import path from 'path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FE = path.resolve(HERE, '../../frontend/src')
const require = createRequire(path.resolve(HERE, '../') + '/')
const { PrismaClient } = require('@prisma/client')
const { communes } = await import(pathToFileURL(`${FE}/province/commune.js`).href)
const { provinces } = await import(pathToFileURL(`${FE}/province/province.js`).href)

// Spelling used by the Explore page's province filter (exact-match on hospital.province).
const explore = fs.readFileSync(`${FE}/views/web/discovery/explore-view.vue`, 'utf8')
  .match(/const provinces = \[([\s\S]*?)\]/)[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
const exploreByNorm = new Map(explore.map((n) => [norm(n), n]))

const provName = new Map()
const unmapped = []
for (const p of provinces) {
  const name = exploreByNorm.get(norm(p.name_en))
  if (!name) unmapped.push(p.name_en)
  provName.set(p.id, name ?? p.name_en)
}
console.log('provinces in data:', provinces.length, '| explore list:', explore.length, '| unmatched spellings:', unmapped.join(', ') || 'none')

const pts = communes
  .filter((c) => c.geodata?.lat && c.geodata?.long)
  .map((c) => ({ lat: +c.geodata.lat, lng: +c.geodata.long, province: c.id.slice(0, 2) }))
console.log('communes with coordinates:', pts.length, 'of', communes.length)

const km = (aLat, aLng, bLat, bLng) => {
  const x = (bLng - aLng) * Math.cos(((aLat + bLat) / 2) * Math.PI / 180)
  const y = bLat - aLat
  return Math.sqrt(x * x + y * y) * 111.32
}

const classify = (lat, lng) => {
  let best = null
  for (const c of pts) {
    const d = km(lat, lng, c.lat, c.lng)
    if (!best || d < best.d) best = { d, province: c.province }
  }
  // nearest commune that belongs to a DIFFERENT province = how close the border is
  let other = null
  for (const c of pts) {
    if (c.province === best.province) continue
    const d = km(lat, lng, c.lat, c.lng)
    if (!other || d < other.d) other = { d, province: c.province }
  }
  return { ...best, otherD: other.d, other: other.province }
}

const prisma = new PrismaClient()
const hospitals = await prisma.hospital.findMany({ where: { province: null }, select: { id: true, name: true, latitude: true, longitude: true } })
const rows = []
const skipped = []
for (const h of hospitals) {
  const lat = parseFloat(h.latitude), lng = parseFloat(h.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 9.5 || lat > 15 || lng < 102 || lng > 108) { skipped.push(h); continue }
  const r = classify(lat, lng)
  // confident = nearest commune is reasonably close AND clearly closer than any commune of another province
  const far = r.d > 25
  const border = r.otherD < r.d * 1.4
  rows.push({ ...h, ...r, province: r.province, name: h.name, far, border })
}
const byProv = {}
rows.forEach((r) => (byProv[provName.get(r.province)] = (byProv[provName.get(r.province)] || 0) + 1))
console.log('candidates (province is null):', hospitals.length, '| with usable coordinates:', rows.length, '| skipped (bad/missing/outside Cambodia):', skipped.length)
console.log('per province:', Object.entries(byProv).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '))
// A name that clearly names a DIFFERENT province (whole words only, so "Rokakandal"
// does not count as "Kandal") means name and coordinates disagree: don't guess.
const words = (str) => ' ' + str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim() + ' '
const provWords = [...provName.values()].map((n) => ({ n, w: words(n) })).filter((x) => x.w.trim().length >= 4)
for (const r of rows) {
  const padded = words(r.name || '')
  const hit = provWords.find((x) => padded.includes(x.w))
  r.conflict = Boolean(hit && hit.n !== provName.get(r.province))
  r.namedProvince = hit?.n
}
const confident = rows.filter((r) => !r.far && !r.border && !r.conflict)
const ambiguous = rows.filter((r) => r.far || r.border || r.conflict)
console.log('confident:', confident.length, '| ambiguous (near a border or far from any commune):', ambiguous.length)
if (confident.length) {
  const sorted = confident.map((r) => r.d).sort((a, b) => a - b)
  console.log('distance to nearest commune (confident): median', sorted[Math.floor(sorted.length / 2)].toFixed(1), 'km, max', sorted[sorted.length - 1].toFixed(1), 'km')
}
ambiguous.forEach((r) => console.log('  left unset:', r.id.toString().padStart(3), (r.name || '').slice(0, 32).padEnd(32), '->', provName.get(r.province), r.conflict ? `(but name says ${r.namedProvince})` : `(${r.d.toFixed(1)}km) vs ${provName.get(r.other)} (${r.otherD.toFixed(1)}km)`))
console.log('sample confident:', confident.slice(0, 4).map((r) => `${(r.name || '').slice(0, 24)}=>${provName.get(r.province)}`).join(' | '))

// Independent check: names that mention a province should agree with the prediction.
{
  const names = [...provName.values()].map((n) => ({ n, key: norm(n) })).filter((x) => x.key.length >= 4)
  let agree = 0, disagree = []
  for (const r of rows) {
    const hit = names.find((x) => norm(r.name || '').includes(x.key))
    if (!hit) continue
    if (hit.n === provName.get(r.province)) agree++
    else disagree.push(`${r.id} "${(r.name || '').slice(0, 40)}" named ${hit.n}, predicted ${provName.get(r.province)}${r.far || r.border ? ' [ambiguous]' : ''}`)
  }
  const total = agree + disagree.length
  console.log(`name check: ${total} hospitals name a province -> ${agree} agree (${total ? Math.round((agree / total) * 100) : 0}%), ${disagree.length} disagree`)
  disagree.forEach((d) => console.log('  disagree:', d))
}

if (!process.argv.includes('--apply')) console.log('Dry run - nothing was written. Re-run with --apply to write.')
if (process.argv.includes('--apply')) {
  const all = confident
  const undoFile = path.join(os.tmpdir(), `provinces-filled-${Date.now()}.json`)
  fs.writeFileSync(undoFile, JSON.stringify(all.map((r) => r.id.toString())))
  console.log('ids of the hospitals about to be filled (to undo: set province = NULL for them):', undoFile)
  let updated = 0
  for (const [code, name] of provName) {
    const ids = all.filter((r) => r.province === code).map((r) => r.id)
    if (!ids.length) continue
    // only ever fills empty provinces - never overwrites one someone set
    const res = await prisma.hospital.updateMany({ where: { id: { in: ids }, province: null }, data: { province: name } })
    updated += res.count
  }
  console.log('APPLIED: updated', updated, 'hospitals')
}
await prisma.$disconnect()
