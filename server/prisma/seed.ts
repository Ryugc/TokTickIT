import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

const categories = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network',
];

const relatedSystems = [
  'Active Directory',
  'Email & Calendar',
  'VPN Access',
  'ERP System',
  'Workstation Hardware',
  'Internal Wi-Fi',
];

const users = [
  // 4 Active Requesters
  {
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.REQUESTER,
    department: 'Human Resources',
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.REQUESTER,
    department: 'Engineering',
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: 'David Lee',
    email: 'david.lee@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.REQUESTER,
    department: 'Finance',
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: 'Michael Brown',
    email: 'michael.brown@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.REQUESTER,
    department: 'Marketing',
    isActive: true,
    mustChangePassword: false,
  },
  // 1 Inactive Requester
  {
    name: 'Inactive Test User',
    email: 'inactive.user@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.REQUESTER,
    department: 'Operations',
    isActive: false,
    mustChangePassword: false,
  },
  // 3 Active IT Staff
  {
    name: 'Jane Staff',
    email: 'staff@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.IT_STAFF,
    department: 'IT Support',
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: 'Tech Support One',
    email: 'tech1@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.IT_STAFF,
    department: 'IT Support',
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: 'Tech Support Two',
    email: 'tech2@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.IT_STAFF,
    department: 'Infrastructure',
    isActive: true,
    mustChangePassword: false,
  },
  // 1 Inactive IT Staff
  {
    name: 'Inactive Staff User',
    email: 'inactive.staff@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.IT_STAFF,
    department: 'IT Support',
    isActive: false,
    mustChangePassword: false,
  },
  // 1 Active Admin
  {
    name: 'Super Admin',
    email: 'admin@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.ADMIN,
    department: 'IT Operations',
    isActive: true,
    mustChangePassword: false,
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

  console.log('Seeding Related Systems...');
  for (const name of relatedSystems) {
    const system = await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`- Upserted related system: ${system.name} (id: ${system.id})`);
  }

  console.log('Seeding System Users (Requesters, Staff, Admin)...');
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        passwordHash: userData.passwordHash,
        role: userData.role,
        department: userData.department,
        isActive: userData.isActive,
        mustChangePassword: userData.mustChangePassword,
      },
      create: userData,
    });
    console.log(
      `- Upserted user: ${user.name} (${user.email}, role: ${user.role}, active: ${user.isActive})`
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


