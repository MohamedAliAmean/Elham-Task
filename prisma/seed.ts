import { PrismaClient } from '@prisma/client';
import { SEED_SLOTS } from './seed-data';

const prisma = new PrismaClient();

async function main() {
  for (const slot of SEED_SLOTS) {
    const data = { startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt) };
    await prisma.slot.upsert({ where: { id: slot.id }, update: data, create: { id: slot.id, ...data } });
  }
  console.log(`Seeded ${SEED_SLOTS.length} slots.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
