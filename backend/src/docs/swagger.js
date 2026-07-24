import swaggerJsdoc from 'swagger-jsdoc';

const publicApiUrl = process.env.PUBLIC_API_URL?.trim() || 'http://localhost:3001/api';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QA Lab API',
      version: '1.0.0',
      description: 'API documentation for QA Lab authentication, master data, invoices, and dashboard.',
    },
    servers: [{ url: publicApiUrl }],
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Customers' },
      { name: 'Products' },
      { name: 'Invoices' },
      { name: 'Dashboard' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@example.com' },
            password: { type: 'string', example: 'password123' },
          },
        },
        CustomerRequest: {
          type: 'object',
          required: ['customerCode', 'customerName', 'email', 'address', 'isActive'],
          properties: {
            customerCode: { type: 'string', example: 'CUST-003' },
            customerName: { type: 'string', example: 'PT Belajar QA' },
            email: { type: 'string', format: 'email', example: 'finance@example.com' },
            phone: { type: 'string', nullable: true, example: '08123456789' },
            address: { type: 'string', example: 'Jl. Pendidikan No. 1, Jakarta' },
            isActive: { type: 'boolean', example: true },
          },
        },
        ProductRequest: {
          type: 'object',
          required: ['productCode', 'productName', 'price', 'initialStock', 'isActive'],
          properties: {
            productCode: { type: 'string', example: 'PROD-003' },
            productName: { type: 'string', example: 'Jasa Training API' },
            price: { type: 'number', example: 150000 },
            initialStock: { type: 'integer', minimum: 0, example: 100 },
            isActive: { type: 'boolean', example: true },
          },
        },
        StatusRequest: {
          type: 'object',
          required: ['isActive'],
          properties: { isActive: { type: 'boolean', example: true } },
        },
        InvoiceRequest: {
          type: 'object',
          required: ['customerId', 'issueDate', 'dueDate', 'items'],
          properties: {
            customerId: { type: 'string', example: 'customer-uuid' },
            issueDate: { type: 'string', format: 'date', example: '2026-07-23' },
            dueDate: { type: 'string', format: 'date', example: '2026-07-30' },
            additionalInfo: { type: 'string', nullable: true, example: 'Pembayaran maksimal tujuh hari.' },
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['productId', 'quantity'],
                properties: {
                  productId: { type: 'string', example: 'product-uuid' },
                  quantity: { type: 'integer', minimum: 1, example: 2 },
                  discountPercent: { type: 'number', minimum: 0, maximum: 100, example: 10 },
                },
              },
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'OK' },
            data: { type: 'object' },
          },
        },
      },
      responses: {
        Unauthorized: { description: 'Unauthorized / token tidak valid' },
        NotFound: { description: 'Data tidak ditemukan' },
        ValidationError: { description: 'Data tidak valid' },
        Conflict: { description: 'Conflict / invalid state' },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          security: [],
          responses: { 200: { description: 'API is running' } },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login user',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
          responses: { 200: { description: 'Login berhasil' }, 400: { $ref: '#/components/responses/ValidationError' } },
        },
      },
      '/auth/profile': {
        get: {
          tags: ['Auth'],
          summary: 'Get authenticated user profile',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Profile berhasil diambil' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout user',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Logout berhasil' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
      },
      '/customers': collectionPaths('Customers', 'CustomerRequest'),
      '/customers/{id}': entityPaths('Customers', 'CustomerRequest'),
      '/customers/{id}/status': statusPath('Customers'),
      '/products': collectionPaths('Products', 'ProductRequest'),
      '/products/{id}': entityPaths('Products', 'ProductRequest'),
      '/products/{id}/status': statusPath('Products'),
      '/invoices': {
        get: securedOperation('Invoices', 'List invoices'),
        post: bodyOperation('Invoices', 'Create invoice draft', 'InvoiceRequest'),
      },
      '/invoices/{id}': {
        get: securedOperation('Invoices', 'Get invoice detail', true),
        put: bodyOperation('Invoices', 'Update draft invoice', 'InvoiceRequest', true),
        delete: securedOperation('Invoices', 'Delete draft invoice', true),
      },
      '/invoices/{id}/submit': actionPath('Invoices', 'Submit invoice'),
      '/invoices/{id}/pay': actionPath('Invoices', 'Mark invoice as paid'),
      '/invoices/{id}/cancel': actionPath('Invoices', 'Cancel invoice'),
      '/invoices/{id}/histories': {
        get: securedOperation('Invoices', 'Get invoice histories', true),
      },
      '/dashboard': {
        get: securedOperation('Dashboard', 'Get dashboard aggregation'),
      },
      '/dashboard/summary': {
        get: securedOperation('Dashboard', 'Get legacy dashboard summary'),
      },
    },
  },
  apis: [],
});

function idParam() {
  return { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
}

function securedOperation(tag, summary, withId = false) {
  return {
    tags: [tag],
    summary,
    security: [{ bearerAuth: [] }],
    ...(withId ? { parameters: [idParam()] } : {}),
    responses: {
      200: { description: 'Success' },
      401: { $ref: '#/components/responses/Unauthorized' },
      ...(withId ? { 404: { $ref: '#/components/responses/NotFound' } } : {}),
    },
  };
}

function bodyOperation(tag, summary, schema, withId = false) {
  return {
    ...securedOperation(tag, summary, withId),
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } },
    },
    responses: {
      200: { description: 'Success' },
      201: { description: 'Created' },
      400: { $ref: '#/components/responses/ValidationError' },
      401: { $ref: '#/components/responses/Unauthorized' },
      409: { $ref: '#/components/responses/Conflict' },
    },
  };
}

function collectionPaths(tag, schema) {
  return {
    get: securedOperation(tag, `List ${tag.toLowerCase()}`),
    post: bodyOperation(tag, `Create ${tag.slice(0, -1).toLowerCase()}`, schema),
  };
}

function entityPaths(tag, schema) {
  return {
    get: securedOperation(tag, `Get ${tag.slice(0, -1).toLowerCase()} detail`, true),
    put: bodyOperation(tag, `Update ${tag.slice(0, -1).toLowerCase()}`, schema, true),
    delete: securedOperation(tag, `Delete ${tag.slice(0, -1).toLowerCase()}`, true),
  };
}

function statusPath(tag) {
  return {
    patch: bodyOperation(tag, `Update ${tag.slice(0, -1).toLowerCase()} status`, 'StatusRequest', true),
  };
}

function actionPath(tag, summary) {
  return {
    post: securedOperation(tag, summary, true),
  };
}
