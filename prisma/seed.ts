import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const BASE_DIR = process.env.SERVERPILOT_DATA_DIR || path.join(__dirname, '..', 'data');

async function main() {
  console.log('Seeding database...');

  // ============================================
  // Admin User (ServerHQ)
  // ============================================
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@serverpilot.local';
  const adminPassRaw = process.env.ADMIN_PASSWORD || 'admin123';
  const adminPassword = await bcrypt.hash(adminPassRaw, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      name: 'Admin',
      role: 'admin',
      isActive: true,
    },
  });
  console.log('✓ Admin user:', admin.email);

  // ============================================
  // Reseller User
  // ============================================
  const resellerPassword = await bcrypt.hash('reseller123', 10);
  const reseller = await prisma.user.upsert({
    where: { email: 'reseller@serverpilot.local' },
    update: {},
    create: {
      email: 'reseller@serverpilot.local',
      password: resellerPassword,
      name: 'Reseller Test',
      role: 'reseller',
      isActive: true,
    },
  });
  console.log('✓ Reseller user:', reseller.email);

  // Create reseller limits
  await prisma.resellerLimit.upsert({
    where: { userId: reseller.id },
    update: {},
    create: {
      userId: reseller.id,
      maxAccounts: 50,
      maxDiskSpace: 51200, // 50GB
      maxBandwidth: 512000, // 500GB
    },
  });
  console.log('✓ Reseller limits created');

  // ============================================
  // Packages
  // ============================================
  const starterPkg = await prisma.package.upsert({
    where: { name: 'Starter' },
    update: {},
    create: {
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
      createdById: admin.id,
    },
  });
  console.log('✓ Package:', starterPkg.name);

  const proPkg = await prisma.package.upsert({
    where: { name: 'Professional' },
    update: {},
    create: {
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
      createdById: admin.id,
    },
  });
  console.log('✓ Package:', proPkg.name);

  const enterprisePkg = await prisma.package.upsert({
    where: { name: 'Enterprise' },
    update: {},
    create: {
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
      createdById: admin.id,
    },
  });
  console.log('✓ Package:', enterprisePkg.name);

  // ============================================
  // Test Client Account
  // ============================================
  const clientPassword = await bcrypt.hash('client123', 10);
  const clientAccount = await prisma.account.upsert({
    where: { username: 'client01' },
    update: {},
    create: {
      username: 'client01',
      password: clientPassword,
      domain: 'client01.com',
      documentRoot: path.join(BASE_DIR, 'client01', 'public_html'),
      isActive: true,
      packageId: starterPkg.id,
      userId: reseller.id,
      diskUsed: 256, // 256MB used
      bandwidthUsed: 1024, // 1GB used
    },
  });
  console.log('✓ Client account:', clientAccount.username, '@', clientAccount.domain);

  // ============================================
  // Second Test Client
  // ============================================
  const client2Password = await bcrypt.hash('client123', 10);
  const client2Account = await prisma.account.upsert({
    where: { username: 'client02' },
    update: {},
    create: {
      username: 'client02',
      password: client2Password,
      domain: 'client02.com',
      documentRoot: path.join(BASE_DIR, 'client02', 'public_html'),
      isActive: true,
      packageId: proPkg.id,
      userId: reseller.id,
      diskUsed: 1024, // 1GB used
      bandwidthUsed: 5120, // 5GB used
    },
  });
  console.log('✓ Client account:', client2Account.username, '@', client2Account.domain);

  // ============================================
  // Email Accounts for Client01
  // ============================================
  const email1 = await prisma.emailAccount.upsert({
    where: { email_accountId: { email: 'admin@client01.com', accountId: clientAccount.id } },
    update: {},
    create: {
      email: 'admin@client01.com',
      password: await bcrypt.hash('email123', 10),
      quota: 1024, // 1GB
      usedSpace: 128, // 128MB used
      accountId: clientAccount.id,
    },
  });
  console.log('✓ Email account:', email1.email);

  const email2 = await prisma.emailAccount.upsert({
    where: { email_accountId: { email: 'contato@client01.com', accountId: clientAccount.id } },
    update: {},
    create: {
      email: 'contato@client01.com',
      password: await bcrypt.hash('email123', 10),
      quota: 512, // 512MB
      usedSpace: 32, // 32MB used
      accountId: clientAccount.id,
    },
  });
  console.log('✓ Email account:', email2.email);

  // ============================================
  // Databases for Client01
  // ============================================
  const db1 = await prisma.database.upsert({
    where: { name_accountId: { name: 'client01_db', accountId: clientAccount.id } },
    update: {},
    create: {
      name: 'client01_db',
      type: 'mysql',
      accountId: clientAccount.id,
    },
  });
  console.log('✓ Database:', db1.name);

  const dbUser = await prisma.databaseUser.upsert({
    where: { username_databaseId: { username: 'client01_user', databaseId: db1.id } },
    update: {},
    create: {
      username: 'client01_user',
      password: await bcrypt.hash('dbpass123', 10),
      privileges: 'ALL PRIVILEGES',
      databaseId: db1.id,
    },
  });
  console.log('✓ Database user:', dbUser.username);

  // ============================================
  // Subdomains for Client01
  // ============================================
  const subdomain1 = await prisma.subdomain.upsert({
    where: { subdomain_accountId: { subdomain: 'blog', accountId: clientAccount.id } },
    update: {},
    create: {
      subdomain: 'blog',
      documentRoot: path.join(BASE_DIR, clientAccount.username, 'public_html', 'blog'),
      accountId: clientAccount.id,
    },
  });
  console.log('✓ Subdomain:', subdomain1.subdomain, '.', clientAccount.domain);

  const subdomain2 = await prisma.subdomain.upsert({
    where: { subdomain_accountId: { subdomain: 'api', accountId: clientAccount.id } },
    update: {},
    create: {
      subdomain: 'api',
      documentRoot: path.join(BASE_DIR, clientAccount.username, 'public_html', 'api'),
      accountId: clientAccount.id,
    },
  });
  console.log('✓ Subdomain:', subdomain2.subdomain, '.', clientAccount.domain);

  // ============================================
  // Create filesystem directories for accounts
  // ============================================
  for (const acc of [clientAccount, client2Account]) {
    const dir = path.join(BASE_DIR, acc.username, 'public_html');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), `<h1>Welcome to ${acc.domain}</h1>\n<p>This is the site for ${acc.username}.</p>\n`);
    fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nDisallow:\n');
    console.log('✓ Created directory:', dir);
  }

  // ============================================
  // Summary
  // ============================================
  console.log('');
  console.log('==========================================');
  console.log('  Seed completed successfully!');
  console.log('');
  console.log('  ServerHQ (Admin):');
  console.log('    Email:    ' + adminEmail);
  console.log('    Password: ' + adminPassRaw);
  console.log('');
  console.log('  SitePanel (Client 01):');
  console.log('    Username: client01');
  console.log('    Password: client123');
  console.log('    Domain:   client01.com');
  console.log('');
  console.log('  SitePanel (Client 02):');
  console.log('    Username: client02');
  console.log('    Password: client123');
  console.log('    Domain:   client02.com');
  console.log('==========================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
