import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationTest = testDatabaseUrl ? it : it.skip;

if (testDatabaseUrl && testDatabaseUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL debe apuntar a una base separada de DATABASE_URL");
}

process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3001";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "integration-test-secret";

if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
}

const { default: app } = await import("../src/interface/app.js");
const { prisma } = await import("../src/infrastructure/database/prisma.js");

let server: ReturnType<typeof app.listen>;
let baseUrl = "";
let adminToken = "";
let userToken = "";
let testEmail = "";
let testServiceId = 0;

async function request(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  token?: string,
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    body: await response.json().catch(() => null) as Record<string, unknown> | null,
  };
}

describe("API de Ventek", () => {
  before(async () => {
    if (!testDatabaseUrl) return;
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No se pudo iniciar el servidor de pruebas");
    baseUrl = `http://127.0.0.1:${address.port}`;

    const adminLogin = await request("POST", "/api/auth/login", {
      email: process.env.TEST_ADMIN_EMAIL ?? "admin.local@ventek.test",
      password: process.env.TEST_ADMIN_PASSWORD,
    });
    const userLogin = await request("POST", "/api/auth/login", {
      email: process.env.TEST_USER_EMAIL ?? "usuario.local@ventek.test",
      password: process.env.TEST_USER_PASSWORD,
    });
    assert.equal(adminLogin.status, 200);
    assert.equal(userLogin.status, 200);
    adminToken = adminLogin.body?.token as string;
    userToken = userLogin.body?.token as string;
  });

  after(async () => {
    if (!testDatabaseUrl) return;
    if (testEmail) {
      await prisma.interaction.deleteMany({ where: { user: { email: testEmail } } });
    }
    if (testEmail) await prisma.user.deleteMany({ where: { email: testEmail } });
    if (testServiceId) await prisma.service.deleteMany({ where: { id: testServiceId } });
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  integrationTest("registra un usuario válido", async () => {
    testEmail = `integration-${Date.now()}@ventek.test`;
    const response = await request("POST", "/api/auth/register", {
      name: "Usuario de integración",
      email: testEmail,
      password: "integration-password",
    });
    assert.equal(response.status, 201);
  });

  integrationTest("rechaza un correo duplicado", async () => {
    const response = await request("POST", "/api/auth/register", {
      name: "Usuario de integración",
      email: testEmail,
      password: "integration-password",
    });
    assert.equal(response.status, 409);
  });

  integrationTest("rechaza datos de registro inválidos", async () => {
    const response = await request("POST", "/api/auth/register", {
      name: "x",
      email: "correo-inválido",
      password: "corta",
    });
    assert.equal(response.status, 400);
  });

  integrationTest("inicia sesión y rechaza credenciales incorrectas", async () => {
    const valid = await request("POST", "/api/auth/login", {
      email: testEmail,
      password: "integration-password",
    });
    const invalid = await request("POST", "/api/auth/login", {
      email: testEmail,
      password: "wrong-password",
    });
    assert.equal(valid.status, 200);
    assert.equal(invalid.status, 401);
  });

  integrationTest("lista servicios con paginación", async () => {
    const response = await request("GET", "/api/services?page=1&limit=6");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body?.pagination, { page: 1, limit: 6, total: 9, totalPages: 2 });
  });

  integrationTest("valida paginación y devuelve 404 para servicios inexistentes", async () => {
    assert.equal((await request("GET", "/api/services?page=0&limit=6")).status, 400);
    assert.equal((await request("GET", "/api/services/999999")).status, 404);
  });

  integrationTest("permite CRUD de servicios al administrador", async () => {
    const created = await request("POST", "/api/services", {
      name: "Servicio de integración",
      description: "Servicio temporal de integración",
      category: "Desarrollo web",
    }, adminToken);
    assert.equal(created.status, 201);
    testServiceId = created.body?.id as number;
    assert.equal((await request("PUT", `/api/services/${testServiceId}`, { name: "Servicio editado" }, adminToken)).status, 200);
    assert.equal((await request("DELETE", `/api/services/${testServiceId}`, undefined, adminToken)).status, 204);
    testServiceId = 0;
  });

  integrationTest("rechaza operaciones administrativas sin token o como usuario normal", async () => {
    const payload = { name: "No autorizado", description: "No autorizado", category: "Desarrollo web" };
    assert.equal((await request("POST", "/api/services", payload)).status, 401);
    assert.equal((await request("POST", "/api/services", payload, userToken)).status, 403);
  });

  integrationTest("crea interacciones usando el usuario del token", async () => {
    const response = await request("POST", "/api/interactions", {
      serviceId: 1,
      message: "Solicitud de integración",
      userId: 999999,
    }, userToken);
    assert.equal(response.status, 201);
    assert.notEqual(response.body?.userId, 999999);
  });

  integrationTest("rechaza interacciones sin token o con servicio inexistente", async () => {
    assert.equal((await request("POST", "/api/interactions", { serviceId: 1, message: "x" })).status, 401);
    assert.equal((await request("POST", "/api/interactions", { serviceId: 999999, message: "x" }, userToken)).status, 404);
  });

  integrationTest("devuelve únicamente las interacciones propias", async () => {
    const response = await request("GET", "/api/interactions/mias", undefined, userToken);
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body));
    assert.ok((response.body as Array<{ userId: number }>).every((item) => item.userId !== undefined));
  });

  integrationTest("permite al administrador consultar todas las interacciones", async () => {
    assert.equal((await request("GET", "/api/interactions", undefined, adminToken)).status, 200);
  });

  integrationTest("rechaza tokens inválidos o expirados", async () => {
    assert.equal((await request("GET", "/api/interactions/mias", undefined, "not-a-token")).status, 401);
    assert.equal((await request("GET", "/api/interactions/mias", undefined, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZXhwIjoxfQ.invalid")).status, 401);
  });
});
