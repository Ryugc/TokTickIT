import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network',
];

async function main() {
  console.log('Seeding IT categories...');
  for (const name of categories) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`- Upserted category: ${category.name} (id: ${category.id})`);
  }
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
