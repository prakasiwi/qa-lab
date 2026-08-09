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

async function syncCustomerCounter() {
  const customers = await prisma.customer.findMany({
    select: { customerCode: true },
  });
  const maxSequence = customers.reduce((max, customer) => {
    const match = /^CUST-(\d+)$/.exec(customer.customerCode);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);

  await prisma.customerCounter.upsert({
    where: { key: "CUSTOMER" },
    update: { nextNumber: maxSequence + 1 },
    create: { key: "CUSTOMER", nextNumber: maxSequence + 1 },
  });

  console.log(`Customer counter disinkronkan ke ${maxSequence + 1}`);
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

const money = (value) => Math.round(Number(value) * 100) / 100;
const taxRate = () => Number(process.env.TAX_PERCENTAGE || 11);

function calculateSeedInvoiceItem(product, item) {
  const quantity = Number(item.quantity);
  const discountPercent = Number(item.discountPercent || 0);
  const unitPrice = Number(product.price);
  const grossTotal = money(quantity * unitPrice);
  const discountAmount = money(grossTotal * discountPercent / 100);
  const lineTotal = money(grossTotal - discountAmount);

  return {
    productId: product.id,
    productCodeSnapshot: product.productCode,
    productNameSnapshot: product.productName,
    quantity,
    unitPrice,
    discountPercent,
    discountAmount,
    grossTotal,
    lineTotal,
    subtotal: lineTotal,
  };
}

function calculateSeedInvoiceSummary(items) {
  const subtotal = money(items.reduce((sum, item) => sum + item.grossTotal, 0));
  const totalDiscount = money(items.reduce((sum, item) => sum + item.discountAmount, 0));
  const taxableAmount = money(subtotal - totalDiscount);
  const rate = taxRate();
  const tax = money(taxableAmount * rate / 100);
  const grandTotal = money(taxableAmount + tax);
  return { subtotal, totalDiscount, taxRate: rate, tax, grandTotal };
}

async function createSeedInvoice({ invoiceNumber, customerCode, productCode, quantity, discountPercent = 0, status, additionalInfo, issueDate, dueDate, createdBy }) {
  const customer = await prisma.customer.findUnique({ where: { customerCode } });
  const product = await prisma.product.findUnique({ where: { productCode } });

  if (!customer) throw new Error(`Customer seed ${customerCode} tidak ditemukan`);
  if (!product) throw new Error(`Product seed ${productCode} tidak ditemukan`);

  const item = calculateSeedInvoiceItem(product, { quantity, discountPercent });
  const summary = calculateSeedInvoiceSummary([item]);
  const submittedAt = ['SUBMITTED', 'PAID'].includes(status) ? new Date(`${issueDate}T09:00:00.000Z`) : null;
  const paidAt = status === 'PAID' ? new Date(`${issueDate}T10:00:00.000Z`) : null;
  const cancelledAt = status === 'CANCELLED' ? new Date(`${issueDate}T11:00:00.000Z`) : null;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId: customer.id,
      customerCodeSnapshot: customer.customerCode,
      customerNameSnapshot: customer.customerName,
      customerAddressSnapshot: customer.address,
      issueDate: new Date(`${issueDate}T00:00:00.000Z`),
      dueDate: new Date(`${dueDate}T00:00:00.000Z`),
      status,
      additionalInfo,
      subtotal: summary.subtotal,
      totalDiscount: summary.totalDiscount,
      taxRate: summary.taxRate,
      tax: summary.tax,
      grandTotal: summary.grandTotal,
      submittedAt,
      paidAt,
      cancelledAt,
      createdBy,
      items: { create: [item] },
    },
  });

  await prisma.invoiceHistory.create({
    data: {
      invoiceId: invoice.id,
      previousStatus: null,
      currentStatus: 'DRAFT',
      action: 'CREATED',
      performedBy: createdBy,
    },
  });

  if (status === 'SUBMITTED') {
    await prisma.invoiceHistory.create({
      data: { invoiceId: invoice.id, previousStatus: 'DRAFT', currentStatus: 'SUBMITTED', action: 'SUBMIT', performedBy: createdBy },
    });
  }

  if (status === 'PAID') {
    await prisma.invoiceHistory.createMany({
      data: [
        { invoiceId: invoice.id, previousStatus: 'DRAFT', currentStatus: 'SUBMITTED', action: 'SUBMIT', performedBy: createdBy },
        { invoiceId: invoice.id, previousStatus: 'SUBMITTED', currentStatus: 'PAID', action: 'PAY', performedBy: createdBy },
      ],
    });
  }

  if (status === 'CANCELLED') {
    await prisma.invoiceHistory.create({
      data: { invoiceId: invoice.id, previousStatus: 'DRAFT', currentStatus: 'CANCELLED', action: 'CANCEL', performedBy: createdBy },
    });
  }

  return invoice;
}

async function syncProductAvailableStock() {
  const products = await prisma.product.findMany({
    include: {
      invoiceItems: {
        include: { invoice: true },
      },
    },
  });

  for (const product of products) {
    const usedStock = product.invoiceItems
      .filter((item) => ['SUBMITTED', 'PAID'].includes(item.invoice.status))
      .reduce((sum, item) => sum + item.quantity, 0);

    await prisma.product.update({
      where: { id: product.id },
      data: { availableStock: Math.max(0, product.initialStock - usedStock) },
    });
  }
}

async function seedInvoices() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@qalab.id" } });
  if (!admin) throw new Error("Admin user seed tidak ditemukan");

  const invoices = [
    {
      invoiceNumber: "INV-202608-000001",
      customerCode: "CUST-001",
      productCode: "PROD-001",
      quantity: 1,
      status: "DRAFT",
      additionalInfo: "Seed invoice status DRAFT untuk latihan QA.",
      issueDate: "2026-08-01",
      dueDate: "2026-08-08",
    },
    {
      invoiceNumber: "INV-202608-000002",
      customerCode: "CUST-002",
      productCode: "PROD-002",
      quantity: 1,
      discountPercent: 5,
      status: "SUBMITTED",
      additionalInfo: "Seed invoice status SUBMITTED untuk latihan QA.",
      issueDate: "2026-08-02",
      dueDate: "2026-08-09",
    },
    {
      invoiceNumber: "INV-202608-000003",
      customerCode: "CUST-003",
      productCode: "PROD-003",
      quantity: 2,
      discountPercent: 10,
      status: "PAID",
      additionalInfo: "Seed invoice status PAID untuk latihan QA.",
      issueDate: "2026-08-03",
      dueDate: "2026-08-10",
    },
    {
      invoiceNumber: "INV-202608-000004",
      customerCode: "CUST-004",
      productCode: "PROD-004",
      quantity: 1,
      status: "CANCELLED",
      additionalInfo: "Seed invoice status CANCELLED untuk latihan QA.",
      issueDate: "2026-08-04",
      dueDate: "2026-08-11",
    },
  ];
  const invoiceNumbers = invoices.map((invoice) => invoice.invoiceNumber);

  await prisma.invoice.deleteMany({
    where: {
      OR: [
        { invoiceNumber: { in: invoiceNumbers } },
        { invoiceNumber: { startsWith: "INV-SEED-" } },
      ],
    },
  });

  for (const invoice of invoices) {
    await createSeedInvoice({ ...invoice, createdBy: admin.id });
  }

  await syncProductAvailableStock();
  await prisma.invoiceCounter.upsert({
    where: { period: "202608" },
    update: { nextNumber: invoices.length + 1 },
    create: { period: "202608", nextNumber: invoices.length + 1 },
  });

  console.log(`${invoices.length} invoice seed berhasil dibuat`);
}

async function main() {
  console.log("Memulai proses seed...");

  await seedUsers();
  await seedCustomers();
  await syncCustomerCounter();
  await seedProducts();
  await seedInvoices();

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
