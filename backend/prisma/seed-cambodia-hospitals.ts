// Imports real hospitals/clinics for Cambodia from OpenStreetMap (via the
// Overpass API) into the `hospitals` table, for demo purposes.
//
// Every Hospital row requires its own owner User (userId is @unique) and a
// Category - OSM has neither, so this creates one placeholder "owner"
// account per facility (email encodes the OSM id so re-runs upsert instead
// of duplicating) and buckets facilities into a "General Hospital" or
// "Clinic" category by their OSM tag.
//
// OSM's `opening_hours` is a free-form rule string (not a single open/close
// pair) and there's no column for website/email on Hospital, so those are
// intentionally left unmapped rather than guessed at.
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OVERPASS_QUERY = `
[out:json][timeout:60];
area["ISO3166-1"="KH"]->.searchArea;
(
  node["amenity"="hospital"](area.searchArea);
  way["amenity"="hospital"](area.searchArea);
  relation["amenity"="hospital"](area.searchArea);
  node["healthcare"="hospital"](area.searchArea);
  way["healthcare"="hospital"](area.searchArea);
  node["amenity"="clinic"](area.searchArea);
);
out center;
`;

// Local dev/demo logins only - not for any deployed environment.
const DEFAULT_PASSWORD = 'password123';

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function fetchFacilities(): Promise<OsmElement[]> {
  const url = new URL(OVERPASS_URL);
  url.searchParams.set('data', OVERPASS_QUERY);

  console.log('Fetching medical facility data from Overpass API...');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'care-finder-demo-import/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Overpass request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { elements: OsmElement[] };
  return data.elements;
}

function buildStreetAddress(tags: Record<string, string>): string | null {
  if (tags['addr:full']) return tags['addr:full'];
  const parts = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return tags['addr:city'] ?? null;
}

async function main() {
  const elements = await fetchFacilities();
  console.log(`Found ${elements.length} facilities. Filtering to usable records...`);

  const usable = elements.filter((el) => {
    const tags = el.tags ?? {};
    const name = tags.name || tags['name:en'];
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    return Boolean(name && lat && lon);
  });
  console.log(
    `${usable.length}/${elements.length} facilities have a name and coordinates - importing those.`,
  );

  await prisma.role.upsert({
    where: { name_guardName: { name: 'hospital', guardName: 'api' } },
    create: { name: 'hospital', guardName: 'api' },
    update: {},
  });
  const hospitalRole = await prisma.role.findFirstOrThrow({
    where: { name: 'hospital', guardName: 'api' },
  });

  const categoryByType = new Map<string, { id: bigint }>();
  for (const [type, name, description] of [
    ['hospital', 'General Hospital', 'General care and emergency services'],
    ['clinic', 'Clinic', 'Outpatient and primary care services'],
  ] as const) {
    let category = await prisma.category.findFirst({ where: { name } });
    if (!category) {
      category = await prisma.category.create({ data: { name, description } });
    }
    categoryByType.set(type, category);
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let created = 0;
  let updated = 0;
  for (const el of usable) {
    const tags = el.tags!;
    const name = (tags.name || tags['name:en'])!;
    const lat = el.lat ?? el.center!.lat;
    const lon = el.lon ?? el.center!.lon;
    const facilityType = tags.amenity === 'clinic' ? 'clinic' : 'hospital';
    const category = categoryByType.get(facilityType)!;
    // Encodes the OSM id so re-running this script upserts instead of
    // creating duplicate owners/hospitals for the same facility.
    const ownerEmail = `hospital.osm-${el.id}@carefinder.import`;

    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      create: {
        email: ownerEmail,
        name,
        password: passwordHash,
        roles: { create: { roleId: hospitalRole.id } },
      },
      update: { name },
    });

    const data = {
      name,
      categoryId: category.id,
      // Left null - HospitalsService.resolveUrl()/'No Cover' fallback turns
      // a null coverImage into the "no image" sentinel the frontend expects.
      // Storing the literal string here would get prefixed into a broken URL.
      coverImage: null,
      phoneNumber: tags.phone || tags['contact:phone'] || null,
      streetAddress: buildStreetAddress(tags),
      latitude: String(lat),
      longitude: String(lon),
    };

    const existing = await prisma.hospital.findFirst({ where: { userId: owner.id } });
    if (existing) {
      await prisma.hospital.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      // Every hospital belongs to an organization with its owner as Owner.
      const organization = await prisma.organization.create({
        data: { name: data.name, members: { create: { userId: owner.id, role: 'Owner' } } },
      });
      await prisma.hospital.create({ data: { ...data, userId: owner.id, organizationId: organization.id } });
      created++;
    }
  }

  console.log(`Imported Cambodia facilities: ${created} created, ${updated} updated.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
