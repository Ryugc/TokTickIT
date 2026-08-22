import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network',
];

const requesters = [
  {
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@toktickit.com',
    department: 'Human Resources',
    isActive: true,
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@toktickit.com',
    department: 'Engineering',
    isActive: true,
  },
  {
    name: 'David Lee',
    email: 'david.lee@toktickit.com',
    department: 'Finance',
    isActive: true,
  },
  {
    name: 'Michael Brown',
    email: 'michael.brown@toktickit.com',
    department: 'Marketing',
    isActive: true,
  },
  {
    name: 'Inactive Test User',
    email: 'inactive.user@toktickit.com',
    department: 'Operations',
    isActive: false,
  },
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

  console.log('Seeding Development Requesters...');
  for (const reqData of requesters) {
    const requester = await prisma.requesterUser.upsert({
      where: { email: reqData.email },
      update: {
        name: reqData.name,
        department: reqData.department,
        isActive: reqData.isActive,
      },
      create: reqData,
    });
    console.log(
      `- Upserted requester: ${requester.name} (id: ${requester.id}, active: ${requester.isActive})`
    );
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
