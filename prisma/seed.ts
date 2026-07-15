import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@serverpilot.local' },
    update: {},
    create: {
      email: 'admin@serverpilot.local',
      password: adminPassword,
      name: 'Admin',
      role: 'admin',
      isActive: true,
    },
  });
  console.log('Created admin user:', admin.email);

  // Create default packages
  const packages = [
    {
      name: 'Starter',
      description: 'Perfect for personal websites',
      diskSpace: 1024, // 1GB
      bandwidth: 10240, // 10GB
      emailAccounts: 5,
      databases: 2,
      subdomains: 5,
      ftpAccounts: 2,
      SSL: true,
      sshAccess: false,
    },
    {
      name: 'Professional',
      description: 'Ideal for small businesses',
      diskSpace: 5120, // 5GB
      bandwidth: 51200, // 50GB
      emailAccounts: 25,
      databases: 10,
      subdomains: 25,
      ftpAccounts: 10,
      SSL: true,
      sshAccess: true,
    },
    {
      name: 'Enterprise',
      description: 'For high-traffic websites',
      diskSpace: 20480, // 20GB
      bandwidth: 204800, // 200GB
      emailAccounts: 100,
      databases: 50,
      subdomains: 100,
      ftpAccounts: 50,
      SSL: true,
      sshAccess: true,
    },
  ];

  for (const pkg of packages) {
    const created = await prisma.package.upsert({
      where: { name: pkg.name },
      update: pkg,
      create: {
        ...pkg,
        createdById: admin.id,
      },
    });
    console.log('Created package:', created.name);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
