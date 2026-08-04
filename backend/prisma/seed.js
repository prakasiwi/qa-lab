import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../src/config/databaseUrl.js";

const adapter = new PrismaPg({
  connectionString: getDatabaseUrl(),
});

const prisma = new PrismaClient({
  adapter,
});

async function seedUsers() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = [
    {
      name: "Admin QA Lab",
      email: "admin@qalab.id",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    {
      name: "QA Engineer",
      email: "qa@qalab.id",
      passwordHash,
      role: "QA",
      isActive: true,
    },
    {
      name: "Budi Pratama",
      email: "student@qalab.id",
      passwordHash,
      role: "STUDENT",
      isActive: true,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
      },
      create: user,
    });
  }

  console.log(`✓ ${users.length} user berhasil dibuat`);
}

async function seedCustomers() {
  const customers = [
    {
      customerCode: "CUST-001",
      customerName: "PT Nusantara Teknologi Digital",
      email: "procurement@nusatech.co.id",
      phone: "0215550101",
      address: "Jl. Jenderal Sudirman No. 45, Jakarta Pusat, DKI Jakarta",
      isActive: true,
    },
    {
      customerCode: "CUST-002",
      customerName: "CV Solusi Data Indonesia",
      email: "finance@solusidata.co.id",
      phone: "0225550202",
      address: "Jl. Asia Afrika No. 88, Bandung, Jawa Barat",
      isActive: true,
    },
    {
      customerCode: "CUST-003",
      customerName: "PT Big Data Analytics",
      email: "administrasi@smkteknologisby.sch.id",
      phone: "0315550303",
      address: "Jl. Raya Darmo No. 17, Surabaya, Jawa Timur",
      isActive: true,
    },
    {
      customerCode: "CUST-004",
      customerName: "Dinas IT Kota Malang",
      email: "layanan@kominfo.malangkota.go.id",
      phone: "03415550404",
      address: "Jl. Mayjen Sungkono No. 99, Malang, Jawa Timur",
      isActive: true,
    },
    {
      customerCode: "CUST-005",
      customerName: "Rizky Maulana",
      email: "rizky.maulana@example.com",
      phone: "081234567895",
      address: "Jl. Kaliurang KM 7, Sleman, DI Yogyakarta",
      isActive: true,
    },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: {
        customerCode: customer.customerCode,
      },
      update: {
        customerName: customer.customerName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        isActive: customer.isActive,
      },
      create: customer,
    });
  }

  console.log(`✓ ${customers.length} customer berhasil dibuat`);
}

async function seedProducts() {
  const products = [
    {
      productCode: "PROD-001",
      productName: "Jasa Pengujian Aplikasi Web",
      price: 3500000,
      initialStock: 20,
      availableStock: 20,
      isActive: true,
    },
    {
      productCode: "PROD-002",
      productName: "Jasa Implementasi Automation Testing",
      price: 7500000,
      initialStock: 10,
      availableStock: 10,
      isActive: true,
    },
    {
      productCode: "PROD-003",
      productName: "Jasa Pelatihan Quality Assurance",
      price: 999000,
      initialStock: 15,
      availableStock: 15,
      isActive: true,
    },
    {
      productCode: "PROD-004",
      productName: "Laptop Bisnis Intel Core i5 16GB RAM",
      price: 12500000,
      initialStock: 8,
      availableStock: 8,
      isActive: true,
    },
    {
      productCode: "PROD-005",
      productName: "Router WiFi 6 Dual Band",
      price: 1250000,
      initialStock: 25,
      availableStock: 25,
      isActive: true,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        productCode: product.productCode,
      },
      update: {
        productName: product.productName,
        price: product.price,
        initialStock: product.initialStock,
        availableStock: product.availableStock,
        isActive: product.isActive,
      },
      create: product,
    });
  }

  console.log(`✓ ${products.length} product berhasil dibuat`);
}

async function main() {
  console.log("Memulai proses seed...");

  await seedUsers();
  await seedCustomers();
  await seedProducts();

  console.log("✓ Seluruh proses seed selesai");
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
