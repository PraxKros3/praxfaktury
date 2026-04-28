import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log('Používateľ už existuje:', existing.email);
    return;
  }

  const password = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'admin@nif.local',
      password,
      defaultVatRate: 23,
      currency: 'EUR',
      invoiceDueDays: 14,
    },
  });

  console.log('Vytvorený používateľ:');
  console.log('  Email:  ', user.email);
  console.log('  Heslo:   admin123');
  console.log('');
  console.log('Po prihlásení nastav Toggl API token a KROS token v Nastaveniach.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
