import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Roles observed in the Laravel codebase's hasRole() checks and Admin panel
// permission middleware. The exact permission-string list (the Admin panel's
// "{Entity} {action}" convention) lives in Laravel's database/seeders/ and
// was not part of the API inventory this migration was built from - seed it
// here once that list is pulled, see MIGRATION_ROADMAP.md.
const ROLES = ['admin', 'hospital', 'doctor', 'user'] as const;

// Local dev/test logins only - not for any deployed environment.
const DEFAULT_PASSWORD = 'password123';
const DEFAULT_USERS = [
  {
    email: 'patient@carefinder.test',
    firstName: 'Penny',
    lastName: 'Patient',
    role: 'user' as const,
  },
  {
    email: 'hospital@carefinder.test',
    firstName: 'Harper',
    lastName: 'Hospital',
    role: 'hospital' as const,
  },
  {
    email: 'doctor@carefinder.test',
    firstName: 'Dana',
    lastName: 'Doctor',
    role: 'doctor' as const,
  },
];

async function main() {
  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name_guardName: { name, guardName: 'api' } },
      create: { name, guardName: 'api' },
      update: {},
    });
  }
  console.log(`Seeded roles: ${ROLES.join(', ')}`);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const roleByName = new Map(
    (await prisma.role.findMany({ where: { name: { in: ROLES as unknown as string[] } } })).map(
      (role) => [role.name, role],
    ),
  );

  const users = new Map<string, { id: bigint }>();
  for (const { email, firstName, lastName, role } of DEFAULT_USERS) {
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        password: passwordHash,
        roles: { create: { roleId: roleByName.get(role)!.id } },
      },
      update: {},
    });
    users.set(role, user);
  }

  // Category.name has no unique constraint, so upsert-by-id (fragile across
  // autoincrement) isn't safe here - find-or-create by name instead.
  let category = await prisma.category.findFirst({ where: { name: 'General Hospital' } });
  if (!category) {
    category = await prisma.category.create({
      data: { name: 'General Hospital', description: 'General care and emergency services' },
    });
  }

  const hospitalOwnerId = users.get('hospital')!.id;
  const existingHospital = await prisma.hospital.findFirst({ where: { userId: hospitalOwnerId } });
  const hospital =
    existingHospital ??
    (await prisma.hospital.create({
      data: {
        name: 'Care Finder Demo Hospital',
        owner: { connect: { id: hospitalOwnerId } },
        category: { connect: { id: category.id } },
        // Every hospital belongs to an organization, with its owner as Owner.
        organization: {
          create: { name: 'Care Finder Demo Hospital', members: { create: { userId: hospitalOwnerId, role: 'Owner' } } },
        },
        openTime: new Date('1970-01-01T08:00:00Z'),
        closeTime: new Date('1970-01-01T20:00:00Z'),
        phoneNumber: '+855701234567',
        streetAddress: 'Street 123',
        village: 'Village 1',
        commune: 'Commune 1',
        district: 'District 1',
        province: 'Phnom Penh',
        latitude: '11.5564',
        longitude: '104.9282',
        mission: 'Demo hospital seeded for local UI testing.',
        vision: 'Demo hospital seeded for local UI testing.',
      },
    }));

  await prisma.doctor.upsert({
    where: { userId: users.get('doctor')!.id },
    create: {
      userId: users.get('doctor')!.id,
      hospitalId: hospital.id,
    },
    update: {},
  });

  // Backs the "Suggest an edit" flow on hospital profiles - SystemRequest
  // has no hospitalId FK, so the correction form folds the hospital
  // name/id into requestDetails and categorizes it under this row.
  const existingCorrectionCategory = await prisma.systemRequestCategory.findFirst({
    where: { name: 'Hospital Correction' },
  });
  if (!existingCorrectionCategory) {
    await prisma.systemRequestCategory.create({ data: { name: 'Hospital Correction' } });
  }

  console.log('Seeded default test logins (password: "password123"):');
  for (const { email, role } of DEFAULT_USERS) {
    console.log(`  ${email}  (${role})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
