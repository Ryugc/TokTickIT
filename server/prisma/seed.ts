import { PrismaClient, Role, TicketStatus, TicketPriority } from '@prisma/client';
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
  {
    name: 'Seed Admin',
    email: 'admin@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.ADMIN,
    department: 'IT Operations',
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: 'Seed Staff',
    email: 'staff@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.IT_STAFF,
    department: 'IT Support',
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: 'Seed Requester',
    email: 'requester@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.REQUESTER,
    department: 'Operations',
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: 'Temporary First Login User',
    email: 'tempuser@toktickit.com',
    passwordHash: bcrypt.hashSync('TempPassword123!', 10),
    role: Role.REQUESTER,
    department: 'Operations',
    isActive: true,
    mustChangePassword: true,
  },
  {
    name: 'Deactivated User',
    email: 'deactivated@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.REQUESTER,
    department: 'Operations',
    isActive: false,
    mustChangePassword: false,
  },
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
  {
    name: 'Inactive Test User',
    email: 'inactive.user@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.REQUESTER,
    department: 'Operations',
    isActive: false,
    mustChangePassword: false,
  },
  {
    name: 'Jane Staff',
    email: 'jane.staff@toktickit.com',
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
  {
    name: 'Inactive Staff User',
    email: 'inactive.staff@toktickit.com',
    passwordHash: defaultPasswordHash,
    role: Role.IT_STAFF,
    department: 'IT Support',
    isActive: false,
    mustChangePassword: false,
  },
  {
    name: 'Super Admin',
    email: 'superadmin@toktickit.com',
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

  const requesterUser = await prisma.user.findFirst({ where: { role: Role.REQUESTER, isActive: true } });
  const staffUser = await prisma.user.findFirst({ where: { role: Role.IT_STAFF, isActive: true } });
  const category = await prisma.category.findFirst();
  const relatedSystem = await prisma.relatedSystem.findFirst();

  if (!requesterUser || !staffUser || !category || !relatedSystem) {
    console.error('Missing dependencies for seeding tickets.');
    return;
  }

  console.log('Seeding Tickets across all 8 statuses with Actions Taken...');

  const ticketSeeds = [
    {
      ticketNumber: 'TCK-LAB4-001',
      summary: 'New Employee Laptop Request',
      description: 'Standard MacBook Pro setup required for new engineering hire.',
      requestedPriority: TicketPriority.HIGH,
      itPriority: TicketPriority.HIGH,
      currentStatus: TicketStatus.NEW,
      requesterId: requesterUser.id,
      assignedToId: null,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      actions: [],
    },
    {
      ticketNumber: 'TCK-LAB4-002',
      summary: 'Printer Toner Low on 4th Floor',
      description: 'Black toner cartridge needs replacement.',
      requestedPriority: TicketPriority.LOW,
      itPriority: TicketPriority.LOW,
      currentStatus: TicketStatus.OPEN,
      requesterId: requesterUser.id,
      assignedToId: staffUser.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      actions: [
        {
          description: 'Inspected printer status and ordered replacement toner cartridge.',
          result: 'Toner ordered from vendor, delivery expected tomorrow.',
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          performedById: staffUser.id,
        },
      ],
    },
    {
      ticketNumber: 'TCK-LAB4-003',
      summary: 'VPN Tunnel Drops Connections Intermittently',
      description: 'Remote staff reporting dropouts when streaming video calls.',
      requestedPriority: TicketPriority.URGENT,
      itPriority: TicketPriority.URGENT,
      currentStatus: TicketStatus.IN_PROGRESS,
      requesterId: requesterUser.id,
      assignedToId: staffUser.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      actions: [
        {
          description: 'Checked firewall session tables and bandwidth utilization.',
          result: 'Identified packet loss on ISP gateway link.',
          followUpRequired: true,
          followUpNote: 'Monitor link stability after ISP gateway restart.',
          attachmentNotes: 'Gateway traceroute logs attached.',
          performedById: staffUser.id,
        },
        {
          description: 'Reconfigured VPN IPsec timeout settings to 3600 seconds.',
          result: 'Session drops reduced by 90% during stress test.',
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          performedById: staffUser.id,
        },
      ],
    },
    {
      ticketNumber: 'TCK-LAB4-004',
      summary: 'Software License Key Request for CAD Suite',
      description: 'Requesting authorization key for SolidWorks desktop installation.',
      requestedPriority: TicketPriority.MEDIUM,
      itPriority: TicketPriority.MEDIUM,
      currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
      requesterId: requesterUser.id,
      assignedToId: staffUser.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      actions: [
        {
          description: 'Sent license agreement form to requester for signature.',
          result: 'Awaiting signed PDF from requester before releasing activation code.',
          followUpRequired: true,
          followUpNote: 'Follow up if response not received in 48 hours.',
          attachmentNotes: 'Sent agreement template v2.pdf',
          performedById: staffUser.id,
        },
      ],
    },
    {
      ticketNumber: 'TCK-LAB4-005',
      summary: 'Password Reset for ERP System Account',
      description: 'User locked out after 3 failed login attempts.',
      requestedPriority: TicketPriority.HIGH,
      itPriority: TicketPriority.HIGH,
      currentStatus: TicketStatus.RESOLVED,
      requesterId: requesterUser.id,
      assignedToId: staffUser.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      actions: [
        {
          description: 'Verified requester identity via phone call.',
          result: 'Identity confirmed.',
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          performedById: staffUser.id,
        },
        {
          description: 'Reset password and issued temporary credentials.',
          result: 'User successfully logged in and updated password.',
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          performedById: staffUser.id,
        },
      ],
    },
    {
      ticketNumber: 'TCK-LAB4-006',
      summary: 'Email Delivery Delay to External Clients',
      description: 'Reopened issue: Outbound emails stuck in queue again.',
      requestedPriority: TicketPriority.HIGH,
      itPriority: TicketPriority.HIGH,
      currentStatus: TicketStatus.REOPENED,
      requesterId: requesterUser.id,
      assignedToId: staffUser.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      actions: [
        {
          description: 'Flushed mail relay queue and restarted SMTP agent.',
          result: 'Pending queue cleared.',
          followUpRequired: true,
          followUpNote: 'Investigate root cause of mail queue stall.',
          attachmentNotes: null,
          performedById: staffUser.id,
        },
      ],
    },
    {
      ticketNumber: 'TCK-LAB4-007',
      summary: 'Dual Monitor Setup Assistance',
      description: 'Configuration of dual 4K monitors on docking station.',
      requestedPriority: TicketPriority.LOW,
      itPriority: TicketPriority.LOW,
      currentStatus: TicketStatus.CLOSED,
      requesterId: requesterUser.id,
      assignedToId: staffUser.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      actions: [
        {
          description: 'Connected DisplayPort cables and updated DisplayLink drivers.',
          result: 'Dual monitor desktop extension functioning.',
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          performedById: staffUser.id,
        },
        {
          description: 'Confirmed user satisfaction and closed request.',
          result: 'User signed off.',
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          performedById: staffUser.id,
        },
      ],
    },
    {
      ticketNumber: 'TCK-LAB4-008',
      summary: 'Duplicate Ergonomic Keyboard Request',
      description: 'Accidental duplicate submission by requester.',
      requestedPriority: TicketPriority.LOW,
      itPriority: TicketPriority.LOW,
      currentStatus: TicketStatus.CANCELLED,
      requesterId: requesterUser.id,
      assignedToId: null,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      actions: [],
    },
  ];

  for (const tData of ticketSeeds) {
    const { actions, ...ticketFields } = tData;
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: ticketFields.ticketNumber },
      update: {
        summary: ticketFields.summary,
        description: ticketFields.description,
        requestedPriority: ticketFields.requestedPriority,
        itPriority: ticketFields.itPriority,
        currentStatus: ticketFields.currentStatus,
        requesterId: ticketFields.requesterId,
        assignedToId: ticketFields.assignedToId,
        categoryId: ticketFields.categoryId,
        relatedSystemId: ticketFields.relatedSystemId,
      },
      create: ticketFields,
    });

    // Delete existing actions for idempotent re-seeding
    await prisma.actionTaken.deleteMany({ where: { ticketId: ticket.id } });

    for (const action of actions) {
      await prisma.actionTaken.create({
        data: {
          ...action,
          ticketId: ticket.id,
        },
      });
    }

    console.log(
      `- Upserted ticket: ${ticket.ticketNumber} [${ticket.currentStatus}] with ${actions.length} actions taken.`
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
