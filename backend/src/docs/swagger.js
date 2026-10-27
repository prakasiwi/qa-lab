import swaggerJsdoc from "swagger-jsdoc";

const publicApiUrl =
  process.env.PUBLIC_API_URL?.trim() || "http://localhost:3001/api";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "QA Lab API",
      version: "1.0.0",
      description:
        "API documentation for QA Lab authentication, master data, invoices, and dashboard.",
    },
    servers: [{ url: publicApiUrl }],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Users" },
      { name: "Roles" },
      { name: "Permissions" },
      { name: "Customers" },
      { name: "Products" },
      { name: "Invoices" },
      { name: "Dashboard" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "admin@qalab.id",
            },
            password: { type: "string", example: "password123" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password", "confirmPassword"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password", minLength: 12 },
            confirmPassword: { type: "string", format: "password" },
          },
        },
        ChallengeRequest: {
          type: "object",
          required: ["token"],
          properties: { token: { type: "string", writeOnly: true } },
        },
        MfaVerifyRequest: {
          type: "object",
          required: ["challengeId", "otp"],
          properties: {
            challengeId: { type: "string" },
            otp: { type: "string", pattern: "^\\d{6}$", writeOnly: true },
          },
        },
        MfaResendRequest: {
          type: "object",
          required: ["challengeId"],
          properties: { challengeId: { type: "string" } },
        },
        AccessSelectionRequest: {
          type: "object",
          required: ["selectionProof", "roleId"],
          properties: {
            selectionProof: { type: "string", writeOnly: true },
            roleId: { type: "string" },
          },
        },
        ResendVerificationRequest: {
          type: "object",
          required: ["email"],
          properties: { email: { type: "string", format: "email" } },
        },
        ActivateAccountRequest: {
          type: "object",
          required: ["token", "password", "confirmPassword"],
          properties: {
            token: { type: "string", writeOnly: true },
            password: { type: "string", format: "password", minLength: 12 },
            confirmPassword: { type: "string", format: "password" },
          },
        },
        ForgotPasswordRequest: {
          type: "object",
          required: ["email"],
          properties: { email: { type: "string", format: "email" } },
        },
        ResetPasswordRequest: {
          type: "object",
          required: ["token", "password", "confirmPassword"],
          properties: {
            token: { type: "string", writeOnly: true },
            password: {
              type: "string",
              format: "password",
              minLength: 12,
              maxLength: 128,
              description:
                "Must include at least one lowercase letter, uppercase letter, number, and symbol.",
            },
            confirmPassword: {
              type: "string",
              format: "password",
              description: "Must exactly match password.",
            },
          },
        },
        CreateUserRequest: {
          type: "object",
          required: ["name", "email", "accessAssignments"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            phone: { type: "string", nullable: true, maxLength: 30 },
            email: { type: "string", format: "email" },
            accessAssignments: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["roleId", "permissionId"],
                properties: {
                  roleId: { type: "string" },
                  permissionId: { type: "string" },
                },
              },
            },
          },
        },
        UserStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["ACTIVE", "INACTIVE", "LOCKED"] },
          },
        },
        RoleRequest: {
          type: "object",
          required: ["code", "name"],
          properties: {
            code: {
              type: "string",
              pattern: "^[A-Z][A-Z0-9_]*$",
              example: "FINANCE_MANAGER",
            },
            name: { type: "string", example: "Finance Manager" },
            description: { type: "string", nullable: true, maxLength: 500 },
            isActive: { type: "boolean", default: true },
          },
        },
        RoleUpdateRequest: {
          type: "object",
          required: ["name", "isActive", "updatedAt"],
          properties: {
            code: {
              type: "string",
              readOnly: true,
              description: "Stable after creation.",
            },
            name: { type: "string", example: "Finance Manager" },
            description: { type: "string", nullable: true, maxLength: 500 },
            isActive: { type: "boolean" },
            updatedAt: {
              type: "string",
              format: "date-time",
              description:
                "Optimistic concurrency token from the latest response.",
            },
          },
        },
        PermissionActionRequest: {
          type: "object",
          required: ["resource", "action"],
          properties: {
            resource: { type: "string", example: "invoices" },
            action: { type: "string", example: "view" },
          },
        },
        PermissionRequest: {
          type: "object",
          required: ["code", "name"],
          properties: {
            code: {
              type: "string",
              pattern: "^[A-Z][A-Z0-9_]*$",
              example: "INVOICE_VIEWER",
            },
            name: { type: "string", example: "Invoice Viewer" },
            description: { type: "string", nullable: true, maxLength: 500 },
            isActive: { type: "boolean", default: true },
            actions: {
              type: "array",
              items: { $ref: "#/components/schemas/PermissionActionRequest" },
            },
          },
        },
        PermissionUpdateRequest: {
          type: "object",
          required: ["name", "isActive", "actions", "updatedAt"],
          properties: {
            code: {
              type: "string",
              readOnly: true,
              description: "Stable after creation.",
            },
            name: { type: "string", example: "Invoice Viewer" },
            description: { type: "string", nullable: true, maxLength: 500 },
            isActive: { type: "boolean" },
            actions: {
              type: "array",
              items: { $ref: "#/components/schemas/PermissionActionRequest" },
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description:
                "Optimistic concurrency token from the latest response.",
            },
          },
        },
        IamImpact: {
          type: "object",
          properties: {
            activeAssignments: {
              type: "integer",
              minimum: 0,
              description: "Active UserAccess rows affected by deactivation.",
            },
            activeUsers: {
              type: "integer",
              minimum: 0,
              description: "Distinct users with active assignments.",
            },
            activeSessions: {
              type: "integer",
              minimum: 0,
              description:
                "Unrevoked, unexpired sessions affected by authorization changes.",
            },
          },
        },
        Role: {
          type: "object",
          properties: {
            id: { type: "string" },
            code: { type: "string" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            isActive: { type: "boolean" },
            assignedUsers: {
              type: "integer",
              minimum: 0,
              description: "Distinct assigned users.",
            },
            impact: { $ref: "#/components/schemas/IamImpact" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Permission: {
          type: "object",
          properties: {
            id: { type: "string" },
            code: { type: "string" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            isActive: { type: "boolean" },
            actions: {
              type: "array",
              items: { $ref: "#/components/schemas/PermissionActionRequest" },
            },
            assignedUsers: {
              type: "integer",
              minimum: 0,
              description: "Distinct assigned users.",
            },
            impact: { $ref: "#/components/schemas/IamImpact" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        PermissionCatalogAction: {
          type: "object",
          required: ["key", "label"],
          properties: {
            key: { type: "string", example: "view" },
            label: { type: "string", example: "View" },
          },
        },
        PermissionCatalogRow: {
          type: "object",
          required: [
            "resourceKey",
            "menuLabel",
            "submenuLabel",
            "isActive",
            "isRegistered",
            "actions",
          ],
          properties: {
            resourceKey: {
              type: "string",
              example: "customers",
              description: "Stable server-owned resource key.",
            },
            menuLabel: { type: "string", example: "Master Data" },
            submenuLabel: {
              type: "string",
              example: "Customers",
              description: "A dash is used when the resource has no submenu.",
            },
            isActive: { type: "boolean", example: true },
            isRegistered: { type: "boolean", example: true },
            actions: {
              type: "array",
              items: { $ref: "#/components/schemas/PermissionCatalogAction" },
            },
          },
        },
        PermissionCatalog: {
          type: "object",
          required: ["items", "actionsByResource"],
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/PermissionCatalogRow" },
            },
            actionsByResource: {
              type: "object",
              additionalProperties: {
                type: "array",
                items: { type: "string" },
              },
              description:
                "Compatibility lookup used by server-side validation.",
            },
          },
        },
        UserUpdateRequest: {
          type: "object",
          required: [
            "name",
            "email",
            "mfaEnabled",
            "updatedAt",
            "accessAssignments",
          ],
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            phone: { type: "string", nullable: true, maxLength: 30 },
            email: {
              type: "string",
              format: "email",
              description: "Read-only on update; must match the current value.",
            },
            mfaEnabled: { type: "boolean" },
            updatedAt: {
              type: "string",
              format: "date-time",
              description:
                "Optimistic concurrency token from the latest response.",
            },
            accessAssignments: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["roleId", "permissionId"],
                properties: {
                  roleId: { type: "string" },
                  permissionId: { type: "string" },
                },
              },
            },
          },
        },
        CreateCustomerRequest: {
          type: "object",
          description:
            "Ownership is assigned from the authenticated QA Lab access. ownerUserId is not accepted.",
          required: ["customerName", "email", "address", "isActive"],
          properties: {
            customerName: { type: "string", example: "PT Belajar QA" },
            email: {
              type: "string",
              format: "email",
              description:
                "Must be unique within the authenticated owner scope.",
              example: "finance@example.com",
            },
            phone: { type: "string", nullable: true, example: "08123456789" },
            address: {
              type: "string",
              example: "Jl. Pendidikan No. 1, Jakarta",
            },
            isActive: { type: "boolean", example: true },
          },
        },
        UpdateCustomerRequest: {
          type: "object",
          description:
            "Ownership cannot be supplied or changed. Permissions authorize operations but never expand row ownership.",
          required: ["customerName", "email", "address", "isActive"],
          properties: {
            customerName: { type: "string", example: "PT Belajar QA" },
            email: {
              type: "string",
              format: "email",
              description: "Must be unique within the target owner scope.",
              example: "finance@example.com",
            },
            phone: { type: "string", nullable: true, example: "08123456789" },
            address: {
              type: "string",
              example: "Jl. Pendidikan No. 1, Jakarta",
            },
            isActive: { type: "boolean", example: true },
          },
        },
        ProductRequest: {
          type: "object",
          description:
            "Ownership is server-managed. ownerUserId and stock-derived fields are not accepted.",
          required: [
            "productCode",
            "productName",
            "price",
            "initialStock",
            "isActive",
          ],
          properties: {
            productCode: { type: "string", example: "PROD-003" },
            productName: { type: "string", example: "Jasa Training API" },
            price: { type: "number", example: 150000 },
            initialStock: { type: "integer", minimum: 0, example: 100 },
            isActive: { type: "boolean", example: true },
          },
        },
        StatusRequest: {
          type: "object",
          required: ["isActive"],
          properties: { isActive: { type: "boolean", example: true } },
        },
        InvoiceRequest: {
          type: "object",
          description:
            "ownerUserId and createdBy are server-managed. The authenticated user may reference only owned customers and products.",
          required: ["customerId", "issueDate", "dueDate", "items"],
          properties: {
            customerId: { type: "string", example: "customer-uuid" },
            issueDate: {
              type: "string",
              format: "date",
              example: "2026-07-23",
            },
            dueDate: { type: "string", format: "date", example: "2026-07-30" },
            additionalInfo: {
              type: "string",
              nullable: true,
              example: "Pembayaran maksimal tujuh hari.",
            },
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["productId", "quantity"],
                properties: {
                  productId: { type: "string", example: "product-uuid" },
                  quantity: { type: "integer", minimum: 1, example: 2 },
                  discountPercent: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    example: 10,
                  },
                },
              },
            },
          },
        },
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "OK" },
            data: { type: "object" },
          },
        },
      },
      responses: {
        Unauthorized: { description: "Unauthorized / token tidak valid" },
        NotFound: { description: "Data tidak ditemukan" },
        ValidationError: { description: "Data tidak valid" },
        Conflict: { description: "Conflict / invalid state" },
      },
    },
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          security: [],
          responses: { 200: { description: "API is running" } },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary:
            "Validate password and either request MFA OTP or continue to role selection",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: { description: "Login berhasil" },
            400: { $ref: "#/components/responses/ValidationError" },
            403: { $ref: "#/components/responses/Forbidden" },
            429: { description: "Too many login attempts" },
          },
        },
      },
      "/auth/register": {
        post: publicBodyOperation(
          "Auth",
          "Register a GENERAL account and send Identifier verification",
          "RegisterRequest",
          201,
        ),
      },
      "/auth/verify-identifier": {
        post: publicBodyOperation(
          "Auth",
          "Verify Identifier and activate a registered account",
          "ChallengeRequest",
        ),
      },
      "/auth/resend-verification": {
        post: publicBodyOperation(
          "Auth",
          "Resend Identifier verification with a generic response",
          "ResendVerificationRequest",
        ),
      },
      "/auth/activate-account": {
        post: publicBodyOperation(
          "Auth",
          "Set the first password and activate an invited account",
          "ActivateAccountRequest",
        ),
      },
      "/auth/activation-context": {
        get: publicTokenQueryOperation(
          "Auth",
          "Validate an invitation token without activating the account",
        ),
      },
      "/auth/forgot-password": {
        post: publicBodyOperation(
          "Auth",
          "Request a one-time password reset with a generic response",
          "ForgotPasswordRequest",
        ),
      },
      "/auth/resend-reset-password": {
        post: publicBodyOperation(
          "Auth",
          "Resend a password reset link with a generic response",
          "ForgotPasswordRequest",
        ),
      },
      "/auth/reset-context": {
        get: publicTokenQueryOperation(
          "Auth",
          "Validate a password reset token without changing the password",
        ),
      },
      "/auth/reset-password": {
        post: publicBodyOperation(
          "Auth",
          "Reset the password, consume the token, and revoke all existing sessions",
          "ResetPasswordRequest",
        ),
      },
      "/auth/mfa/verify": {
        post: publicBodyOperation(
          "Auth",
          "Atomically verify a one-time MFA OTP and require role selection",
          "MfaVerifyRequest",
        ),
      },
      "/auth/mfa/resend": {
        post: publicBodyOperation(
          "Auth",
          "Resend a one-time MFA OTP without creating a session",
          "MfaResendRequest",
        ),
      },
      "/auth/select-role": {
        post: publicBodyOperation(
          "Auth",
          "Consume a password or MFA role-selection proof and create a session",
          "AccessSelectionRequest",
        ),
      },
      "/users": {
        get: adminUserListOperation(),
        post: adminGrantBodyOperation(
          "Users",
          "Create and invite a user",
          "CreateUserRequest",
        ),
      },
      "/users/access-options": {
        get: adminGrantSecuredOperation(
          "Users",
          "List active Role and Permission choices",
        ),
      },
      "/users/{id}": {
        get: adminSecuredOperation("Users", "Get user detail", true),
        patch: adminGrantBodyOperation(
          "Users",
          "Update user profile, MFA, and desired access assignments",
          "UserUpdateRequest",
          true,
        ),
      },
      "/users/{id}/status": {
        patch: adminBodyOperation(
          "Users",
          "Update user status with IAM manager lockout protection",
          "UserStatusRequest",
          true,
        ),
      },
      "/users/{id}/resend-invitation": {
        post: adminSecuredOperation(
          "Users",
          "Resend a pending activation invitation",
          true,
        ),
      },
      "/users/{id}/resend-verification": {
        post: adminSecuredOperation(
          "Users",
          "Resend email for a user pending verification",
          true,
        ),
      },
      "/users/{id}/sessions": {
        get: adminSecuredOperation("Users", "List a user sessions", true),
      },
      "/users/{id}/sessions/{sessionId}": {
        delete: adminNestedOperation("Revoke a user session", [
          "id",
          "sessionId",
        ]),
      },
      "/roles": {
        get: iamListOperation(
          "Roles",
          "List roles with distinct assigned-user counts",
          "Role",
        ),
        post: iamBodyOperation("Roles", "Create role", "RoleRequest"),
      },
      "/roles/{id}": {
        get: iamSecuredOperation(
          "Roles",
          "Get role detail with active assignment and session impact counts",
          true,
          "Role",
        ),
        patch: iamBodyOperation(
          "Roles",
          "Update role metadata or activation status using updatedAt; role code is immutable",
          "RoleUpdateRequest",
          true,
        ),
      },
      "/permissions/catalog": {
        get: iamSecuredOperation(
          "Permissions",
          "Get structured server-owned permission catalog rows and validation lookup",
          false,
          "PermissionCatalog",
        ),
      },
      "/permissions/action-catalog": {
        get: iamSecuredOperation(
          "Permissions",
          "Get structured server-owned permission catalog rows and validation lookup",
          false,
          "PermissionCatalog",
        ),
      },
      "/permissions": {
        get: iamListOperation(
          "Permissions",
          "List permissions with distinct assigned-user counts",
          "Permission",
        ),
        post: iamBodyOperation(
          "Permissions",
          "Create permission",
          "PermissionRequest",
        ),
      },
      "/permissions/{id}": {
        get: iamSecuredOperation(
          "Permissions",
          "Get permission detail with active assignment and session impact counts",
          true,
          "Permission",
        ),
        patch: iamBodyOperation(
          "Permissions",
          "Replace permission metadata and action matrix using updatedAt; permission code is immutable",
          "PermissionUpdateRequest",
          true,
        ),
      },
      "/auth/profile": {
        get: {
          tags: ["Auth"],
          summary: "Get authenticated user profile",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Profile berhasil diambil" },
            401: { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout user",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Logout berhasil" },
            401: { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/customers": {
        get: masterDataListOperation(
          "Customers",
          "List customers owned by the authenticated user",
        ),
        post: bodyOperation(
          "Customers",
          "Create customer with auto-generated code",
          "CreateCustomerRequest",
        ),
      },
      "/customers/{id}": {
        get: securedOperation(
          "Customers",
          "Get owned customer detail; cross-owner IDs return 404",
          true,
        ),
        put: bodyOperation(
          "Customers",
          "Update customer",
          "UpdateCustomerRequest",
          true,
        ),
        delete: deleteOperation("Customers", "Delete customer", true),
      },
      "/customers/{id}/status": statusPath("Customers"),
      "/products": {
        get: masterDataListOperation(
          "Products",
          "List products owned by the authenticated user",
        ),
        post: bodyOperation("Products", "Create product", "ProductRequest"),
      },
      "/products/{id}": entityPaths("Products", "ProductRequest"),
      "/products/{id}/status": statusPath("Products"),
      "/invoices": {
        get: invoiceListOperation(),
        post: bodyOperation(
          "Invoices",
          "Create invoice draft",
          "InvoiceRequest",
        ),
      },
      "/invoices/{id}": {
        get: securedOperation("Invoices", "Get invoice detail", true),
        put: bodyOperation(
          "Invoices",
          "Update draft invoice",
          "InvoiceRequest",
          true,
        ),
        delete: deleteOperation("Invoices", "Delete draft invoice", true),
      },
      "/invoices/{id}/submit": actionPath("Invoices", "Submit invoice"),
      "/invoices/{id}/pay": actionPath("Invoices", "Mark invoice as paid"),
      "/invoices/{id}/cancel": actionPath("Invoices", "Cancel invoice"),
      "/invoices/{id}/histories": {
        get: securedOperation("Invoices", "Get invoice histories", true),
      },
      "/dashboard": {
        get: securedOperation(
          "Dashboard",
          "Get owner-scoped dashboard aggregation with at most 20 low-stock items",
        ),
      },
      "/dashboard/summary": {
        get: securedOperation("Dashboard", "Get legacy dashboard summary"),
      },
    },
  },
  apis: [],
});

function idParam() {
  return {
    name: "id",
    in: "path",
    required: true,
    description: "Resource CUID or UUID.",
    schema: { type: "string" },
  };
}

function securedOperation(tag, summary, withId = false) {
  return {
    tags: [tag],
    summary,
    security: [{ bearerAuth: [] }],
    ...(withId ? { parameters: [idParam()] } : {}),
    responses: {
      200: { description: "Success" },
      401: { $ref: "#/components/responses/Unauthorized" },
      ...(withId ? { 404: { $ref: "#/components/responses/NotFound" } } : {}),
    },
  };
}

function paginationParams() {
  return [
    {
      name: "page",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 1, default: 1 },
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "integer", enum: [10, 25, 50, 100], default: 10 },
    },
  ];
}

function paginatedOperation(tag, summary) {
  const operation = {
    ...securedOperation(tag, summary),
    parameters: paginationParams(),
  };
  operation.responses[400] = { $ref: "#/components/responses/ValidationError" };
  return operation;
}

function masterDataListOperation(tag, summary) {
  const operation = paginatedOperation(tag, summary);
  operation.parameters.push(
    {
      name: "search",
      in: "query",
      required: false,
      schema: { type: "string", maxLength: 150 },
    },
    {
      name: "status",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["active", "inactive"] },
    },
  );
  return operation;
}

function bodyOperation(tag, summary, schema, withId = false) {
  return {
    ...securedOperation(tag, summary, withId),
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: `#/components/schemas/${schema}` },
        },
      },
    },
    responses: {
      200: { description: "Success" },
      201: { description: "Created" },
      400: { $ref: "#/components/responses/ValidationError" },
      401: { $ref: "#/components/responses/Unauthorized" },
      409: { $ref: "#/components/responses/Conflict" },
      422: { description: "Business validation failed" },
      ...(withId ? { 404: { $ref: "#/components/responses/NotFound" } } : {}),
    },
  };
}

function publicBodyOperation(tag, summary, schema, successStatus = 200) {
  return {
    tags: [tag],
    summary,
    security: [],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: `#/components/schemas/${schema}` },
        },
      },
    },
    responses: {
      [successStatus]: { description: "Success" },
      400: { $ref: "#/components/responses/ValidationError" },
      429: { description: "Too many requests" },
    },
  };
}

function publicTokenQueryOperation(tag, summary) {
  return {
    tags: [tag],
    summary,
    security: [],
    parameters: [
      {
        name: "token",
        in: "query",
        required: true,
        schema: { type: "string", minLength: 20 },
      },
    ],
    responses: {
      200: { description: "Token is valid for its intended public flow" },
      400: { $ref: "#/components/responses/ValidationError" },
      429: { description: "Too many requests" },
    },
  };
}

function adminBodyOperation(tag, summary, schema, withId = false) {
  const operation = bodyOperation(tag, summary, schema, withId);
  operation.responses[403] = {
    description: "Required iam_users permission is missing",
  };
  return operation;
}

function adminSecuredOperation(tag, summary, withId = false) {
  const operation = securedOperation(tag, summary, withId);
  operation.responses[403] = {
    description: "Required iam_users permission is missing",
  };
  operation.responses[409] = { $ref: "#/components/responses/Conflict" };
  return operation;
}

function adminGrantBodyOperation(tag, summary, schema, withId = false) {
  const operation = bodyOperation(tag, summary, schema, withId);
  operation.responses[403] = {
    description:
      "Both iam_users:manage and iam_permissions:manage are required",
  };
  return operation;
}

function adminGrantSecuredOperation(tag, summary) {
  const operation = securedOperation(tag, summary);
  operation.responses[403] = {
    description:
      "Both iam_users:manage and iam_permissions:manage are required",
  };
  return operation;
}

function adminNestedOperation(summary, parameterNames) {
  const operation = adminSecuredOperation("Users", summary);
  operation.parameters = parameterNames.map((name) => ({
    name,
    in: "path",
    required: true,
    description:
      name === "id"
        ? "Target user CUID or UUID."
        : name === "accessId"
          ? "User access CUID or UUID."
          : "Session UUID.",
    schema: { type: "string", minLength: 1 },
  }));
  return operation;
}

function adminUserListOperation() {
  const operation = paginatedOperation("Users", "List and filter users");
  operation.parameters.push(
    { name: "search", in: "query", schema: { type: "string", maxLength: 150 } },
    {
      name: "status",
      in: "query",
      schema: {
        type: "string",
        enum: [
          "PENDING_VERIFICATION",
          "PENDING_ACTIVATION",
          "ACTIVE",
          "INACTIVE",
          "LOCKED",
        ],
      },
    },
    { name: "verified", in: "query", schema: { type: "boolean" } },
    { name: "mfaEnabled", in: "query", schema: { type: "boolean" } },
    {
      name: "role",
      in: "query",
      schema: { type: "string", description: "Active Role code" },
    },
  );
  operation.responses[403] = {
    description: "Required iam_users:view permission is missing",
  };
  return operation;
}

function invoiceListOperation() {
  const operation = paginatedOperation(
    "Invoices",
    "List and filter invoices owned by the authenticated user",
  );
  operation.parameters.push(
    {
      name: "search",
      in: "query",
      schema: {
        type: "string",
        maxLength: 150,
        description: "Invoice number, customer code, or customer name",
      },
    },
    {
      name: "status",
      in: "query",
      schema: {
        type: "string",
        enum: ["DRAFT", "SUBMITTED", "PAID", "CANCELLED"],
      },
    },
    { name: "customerId", in: "query", schema: { type: "string" } },
  );
  return operation;
}

function iamSecuredOperation(
  tag,
  summary,
  withId = false,
  responseSchema = undefined,
) {
  const operation = securedOperation(tag, summary, withId);
  operation.responses[403] = {
    description: "Required IAM permission is missing",
  };
  if (responseSchema) {
    operation.responses[200].content = {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            data: { $ref: `#/components/schemas/${responseSchema}` },
          },
        },
      },
    };
  }
  return operation;
}

function iamListOperation(tag, summary, itemSchema) {
  const operation = iamSecuredOperation(tag, summary);
  operation.parameters = [
    ...paginationParams(),
    {
      name: "search",
      in: "query",
      required: false,
      schema: { type: "string", maxLength: 150 },
    },
    {
      name: "status",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["active", "inactive"] },
    },
  ];
  operation.responses[400] = { $ref: "#/components/responses/ValidationError" };
  operation.responses[200].content = {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { $ref: `#/components/schemas/${itemSchema}` },
              },
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
            },
          },
        },
      },
    },
  };
  return operation;
}

function iamBodyOperation(tag, summary, schema, withId = false) {
  const operation = bodyOperation(tag, summary, schema, withId);
  operation.responses[403] = {
    description: "Required IAM management permission is missing",
  };
  return operation;
}

function iamDeleteOperation(tag, summary) {
  const operation = iamSecuredOperation(tag, summary, true);
  operation.responses[409] = { $ref: "#/components/responses/Conflict" };
  return operation;
}

function collectionPaths(tag, schema) {
  return {
    get: securedOperation(tag, `List ${tag.toLowerCase()}`),
    post: bodyOperation(
      tag,
      `Create ${tag.slice(0, -1).toLowerCase()}`,
      schema,
    ),
  };
}

function entityPaths(tag, schema) {
  return {
    get: securedOperation(
      tag,
      `Get ${tag.slice(0, -1).toLowerCase()} detail`,
      true,
    ),
    put: bodyOperation(
      tag,
      `Update ${tag.slice(0, -1).toLowerCase()}`,
      schema,
      true,
    ),
    delete: deleteOperation(
      tag,
      `Delete ${tag.slice(0, -1).toLowerCase()}`,
      true,
    ),
  };
}

function deleteOperation(tag, summary, withId = false) {
  const operation = securedOperation(tag, summary, withId);
  delete operation.responses[200];
  operation.responses[204] = { description: "Deleted" };
  operation.responses[409] = { $ref: "#/components/responses/Conflict" };
  return operation;
}

function statusPath(tag) {
  return {
    patch: bodyOperation(
      tag,
      `Update ${tag.slice(0, -1).toLowerCase()} status`,
      "StatusRequest",
      true,
    ),
  };
}

function actionPath(tag, summary) {
  const operation = securedOperation(tag, summary, true);
  operation.responses[409] = { $ref: "#/components/responses/Conflict" };
  operation.responses[422] = { description: "Business validation failed" };
  return { post: operation };
}
