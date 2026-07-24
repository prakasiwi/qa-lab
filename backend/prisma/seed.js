import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({ where: { email: 'admin@example.com' }, update: {}, create: { name: 'Admin QA Lab', email: 'admin@example.com', passwordHash, role: 'ADMIN' } });
  await prisma.customer.upsert({ where: { customerCode: 'CUST-001' }, update: {}, create: { customerCode: 'CUST-001', customerName: 'PT Nusantara Belajar', email: 'customer1@example.com', phone: '081234567890', address: 'Jakarta', isActive: true } });
  await prisma.customer.upsert({ where: { customerCode: 'CUST-002' }, update: {}, create: { customerCode: 'CUST-002', customerName: 'SMK Telkom', email: 'customer2@example.com', phone: '081111111111', address: 'Bandung', isActive: true } });
  await prisma.product.upsert({ where: { productCode: 'PROD-001' }, update: {}, create: { productCode: 'PROD-001', productName: 'Jasa Training QA Manual', price: 1500000, initialStock: 20, availableStock: 20 } });
  await prisma.product.upsert({ where: { productCode: 'PROD-002' }, update: {}, create: { productCode: 'PROD-002', productName: 'Jasa Training Automation', price: 2500000, initialStock: 10, availableStock: 10 } });
}
main().then(() => console.log('Seed selesai')).finally(() => prisma.$disconnect());
