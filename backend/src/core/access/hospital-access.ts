import { Prisma } from '@prisma/client';

// Organization roles, lowest to highest. A hospital's creator (Hospital.userId)
// always counts as Owner even without a membership row, so hospitals created
// before organizations existed keep working.
export const ORG_ROLE_RANK = { Manager: 1, Admin: 2, Owner: 3 } as const;
export type OrgRole = keyof typeof ORG_ROLE_RANK;

export const rolesAtLeast = (min: OrgRole): OrgRole[] =>
  (Object.keys(ORG_ROLE_RANK) as OrgRole[]).filter((role) => ORG_ROLE_RANK[role] >= ORG_ROLE_RANK[min]);

// Prisma filter for "hospitals this user belongs to with at least `min` role".
// Pure, so it can be used inside any query (list scoping, relation filters).
export const manageableHospitalWhere = (userId: bigint, min: OrgRole = 'Manager'): Prisma.HospitalWhereInput => ({
  OR: [
    { userId },
    { organization: { members: { some: { userId, role: { in: rolesAtLeast(min) } } } } },
  ],
});
