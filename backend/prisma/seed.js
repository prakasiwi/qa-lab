import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../src/config/databaseUrl.js";
import { getPermissionBootstrapActions } from "../src/modules/permissions/permission.catalog.js";

const adapter = new PrismaPg({
  connectionString: getDatabaseUrl(),
});

const prisma = new PrismaClient({
  adapter,
});

async function seedUsers() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const mfaSecretHash = await bcrypt.hash("qa-lab-mfa-seed", 10);
  const verifiedAt = new Date();

  const users = [
    {
      name: "Admin QA Lab",
      email: "admin@qalab.id",
      passwordHash,
      status: "ACTIVE",
      identifierVerifiedAt: verifiedAt,
    },
    {
      name: "Password Login User",
      email: "password@qalab.id",
      passwordHash,
      status: "ACTIVE",
      identifierVerifiedAt: verifiedAt,
    },
    {
      name: "MFA Login User",
      email: "mfa@qalab.id",
      passwordHash,
      status: "ACTIVE",
      identifierVerifiedAt: verifiedAt,
      mfaEnabled: true,
      mfaSecretHash,
    },
  ];

  const seededUsers = [];
  for (const user of users) {
    const seededUser = await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {},
      create: user,
    });
    seededUsers.push(seededUser);
  }

  console.log(`✓ ${users.length} user berhasil dibuat`);
  return seededUsers;
}

async function ensureSeedPermission(definition) {
  return prisma.$transaction(async (tx) => {
    const existingPermission = await tx.permission.findUnique({
      where: { code: definition.code },
    });
    const wasCreated = !existingPermission;
    const permission =
      existingPermission ||
      (await tx.permission.create({
        data: { ...definition, isActive: true },
      }));
    const bootstrapActions = getPermissionBootstrapActions(
      definition.code,
      wasCreated,
    );
    if (bootstrapActions.length > 0) {
      await tx.permissionAction.createMany({
        data: bootstrapActions.map(([resource, action]) => ({
          permissionId: permission.id,
          resource,
          action,
        })),
      });
    }
    return { permission, wasCreated };
  });
}

async function seedAccesses(users) {
  const roleDefinitions = [
    {
      code: "ADMIN",
      name: "Admin",
      description: "Administrative role for QA Lab.",
    },
    {
      code: "GENERAL",
      name: "General",
      description: "General application role for QA Lab users.",
    },
  ];
  const permissionDefinitions = [
    {
      code: "ADMIN",
      name: "Admin",
      description: "Full application and IAM management actions.",
    },
    {
      code: "GENERAL",
      name: "General",
      description:
        "Standard create and update actions within the user data scope.",
    },
    {
      code: "READ_ONLY",
      name: "Read Only",
      description: "Read-only access within the user data scope.",
    },
  ];
  const roles = Object.fromEntries(
    await Promise.all(
      roleDefinitions.map(async (definition) => [
        definition.code,
        await prisma.role.upsert({
          where: { code: definition.code },
          update: {},
          create: { ...definition, isActive: true },
        }),
      ]),
    ),
  );
  const permissionResults = await Promise.all(
    permissionDefinitions.map(async (definition) => [
      definition.code,
      await ensureSeedPermission(definition),
    ]),
  );
  const permissions = Object.fromEntries(
    permissionResults.map(([permissionCode, result]) => [
      permissionCode,
      result.permission,
    ]),
  );

  for (const definition of roleDefinitions) {
    await prisma.role.updateMany({
      where: { code: definition.code, description: null },
      data: { description: definition.description },
    });
  }
  for (const definition of permissionDefinitions) {
    await prisma.permission.updateMany({
      where: { code: definition.code, description: null },
      data: { description: definition.description },
    });
  }

  const assignmentByEmail = {
    "admin@qalab.id": { role: roles.ADMIN, permission: permissions.ADMIN },
    "password@qalab.id": {
      role: roles.GENERAL,
      permission: permissions.GENERAL,
    },
    "mfa@qalab.id": { role: roles.GENERAL, permission: permissions.GENERAL },
  };

  await prisma.$transaction(async (tx) => {
    for (const user of users) {
      const assignment = assignmentByEmail[user.email];
      if (!assignment)
        throw new Error(`Seed access tidak tersedia untuk ${user.email}`);
      await tx.userAccess.upsert({
        where: {
          userId_roleId: { userId: user.id, roleId: assignment.role.id },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: assignment.role.id,
          permissionId: assignment.permission.id,
          isActive: true,
        },
      });
    }
  });
}

async function seedCustomers(ownerUserId) {
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
        ownerUserId_customerCode: {
          ownerUserId,
          customerCode: customer.customerCode,
        },
      },
      update: {},
      create: { ...customer, ownerUserId },
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

  const requiredNextNumber = maxSequence + 1;
  const existingCounter = await prisma.customerCounter.findUnique({
    where: { key: "CUSTOMER" },
  });
  if (!existingCounter) {
    await prisma.customerCounter.create({
      data: { key: "CUSTOMER", nextNumber: requiredNextNumber },
    });
  } else if (existingCounter.nextNumber < requiredNextNumber) {
    await prisma.customerCounter.update({
      where: { key: "CUSTOMER" },
      data: { nextNumber: requiredNextNumber },
    });
  }

  console.log(`Customer counter minimal disinkronkan ke ${requiredNextNumber}`);
}

async function seedProducts(ownerUserId) {
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
      availableStock: 9,
      isActive: true,
    },
    {
      productCode: "PROD-003",
      productName: "Jasa Pelatihan Quality Assurance",
      price: 999000,
      initialStock: 15,
      availableStock: 13,
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
        ownerUserId_productCode: {
          ownerUserId,
          productCode: product.productCode,
        },
      },
      update: {},
      create: { ...product, ownerUserId },
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
  const discountAmount = money((grossTotal * discountPercent) / 100);
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
  const totalDiscount = money(
    items.reduce((sum, item) => sum + item.discountAmount, 0),
  );
  const taxableAmount = money(subtotal - totalDiscount);
  const rate = taxRate();
  const tax = money((taxableAmount * rate) / 100);
  const grandTotal = money(taxableAmount + tax);
  return { subtotal, totalDiscount, taxRate: rate, tax, grandTotal };
}

async function createSeedInvoice({
  invoiceNumber,
  customerCode,
  productCode,
  quantity,
  discountPercent = 0,
  status,
  additionalInfo,
  issueDate,
  dueDate,
  createdBy,
}) {
  const existingInvoice = await prisma.invoice.findUnique({
    where: { invoiceNumber },
  });
  if (existingInvoice) return { invoice: existingInvoice, isCreated: false };

  const customer = await prisma.customer.findFirst({
    where: { customerCode, ownerUserId: createdBy },
  });
  const product = await prisma.product.findFirst({
    where: { productCode, ownerUserId: createdBy },
  });

  if (!customer)
    throw new Error(`Customer seed ${customerCode} tidak ditemukan`);
  if (!product) throw new Error(`Product seed ${productCode} tidak ditemukan`);

  const item = calculateSeedInvoiceItem(product, { quantity, discountPercent });
  const summary = calculateSeedInvoiceSummary([item]);
  const submittedAt = ["SUBMITTED", "PAID"].includes(status)
    ? new Date(`${issueDate}T09:00:00.000Z`)
    : null;
  const paidAt =
    status === "PAID" ? new Date(`${issueDate}T10:00:00.000Z`) : null;
  const cancelledAt =
    status === "CANCELLED" ? new Date(`${issueDate}T11:00:00.000Z`) : null;

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
      ownerUserId: createdBy,
      items: { create: [item] },
    },
  });

  await prisma.invoiceHistory.create({
    data: {
      invoiceId: invoice.id,
      previousStatus: null,
      currentStatus: "DRAFT",
      action: "CREATED",
      performedBy: createdBy,
    },
  });

  if (status === "SUBMITTED") {
    await prisma.invoiceHistory.create({
      data: {
        invoiceId: invoice.id,
        previousStatus: "DRAFT",
        currentStatus: "SUBMITTED",
        action: "SUBMIT",
        performedBy: createdBy,
      },
    });
  }

  if (status === "PAID") {
    await prisma.invoiceHistory.createMany({
      data: [
        {
          invoiceId: invoice.id,
          previousStatus: "DRAFT",
          currentStatus: "SUBMITTED",
          action: "SUBMIT",
          performedBy: createdBy,
        },
        {
          invoiceId: invoice.id,
          previousStatus: "SUBMITTED",
          currentStatus: "PAID",
          action: "PAY",
          performedBy: createdBy,
        },
      ],
    });
  }

  if (status === "CANCELLED") {
    await prisma.invoiceHistory.create({
      data: {
        invoiceId: invoice.id,
        previousStatus: "DRAFT",
        currentStatus: "CANCELLED",
        action: "CANCEL",
        performedBy: createdBy,
      },
    });
  }

  return { invoice, isCreated: true };
}

async function seedInvoices() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@qalab.id" },
  });
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
  let createdInvoiceCount = 0;
  for (const invoice of invoices) {
    const result = await createSeedInvoice({ ...invoice, createdBy: admin.id });
    if (result.isCreated) createdInvoiceCount += 1;
  }

  const requiredNextNumber = invoices.length + 1;
  const existingCounter = await prisma.invoiceCounter.findUnique({
    where: { period: "202608" },
  });
  if (!existingCounter) {
    await prisma.invoiceCounter.create({
      data: { period: "202608", nextNumber: requiredNextNumber },
    });
  } else if (existingCounter.nextNumber < requiredNextNumber) {
    await prisma.invoiceCounter.update({
      where: { period: "202608" },
      data: { nextNumber: requiredNextNumber },
    });
  }

  console.log(
    `${createdInvoiceCount} invoice seed baru dibuat; data yang sudah ada dipertahankan`,
  );
}

async function main() {
  console.log("Memulai proses seed...");

  const users = await seedUsers();
  await seedAccesses(users);
  const admin = await prisma.user.findUnique({
    where: { email: "admin@qalab.id" },
  });
  if (!admin) throw new Error("Admin user seed tidak ditemukan");
  await seedCustomers(admin.id);
  await syncCustomerCounter();
  await seedProducts(admin.id);
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
