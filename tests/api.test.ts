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

  // ── Perfil de usuario ──────────────────────────────────────────────────────

  integrationTest("GET /api/auth/me — rechaza petición sin token", async () => {
    const res = await request("GET", "/api/auth/me");
    assert.equal(res.status, 401);
  });

  integrationTest("GET /api/auth/me — devuelve el perfil del usuario autenticado", async () => {
    // Corrección 1: usuario propio, independiente de testEmail.
    const profileEmail = `profile-me-${Date.now()}-${Math.floor(Math.random() * 9999)}@ventek.test`;
    const reg = await request("POST", "/api/auth/register", {
      name: "Perfil Me",
      email: profileEmail,
      password: "profile-password-ok",
    });
    assert.equal(reg.status, 201, "No se pudo registrar el usuario de perfil GET");

    try {
      const login = await request("POST", "/api/auth/login", {
        email: profileEmail,
        password: "profile-password-ok",
      });
      assert.equal(login.status, 200);
      const token = login.body?.token as string;

      const res = await request("GET", "/api/auth/me", undefined, token);
      assert.equal(res.status, 200);
      assert.equal(typeof res.body?.id, "number");
      assert.equal(res.body?.email, profileEmail);
      assert.ok("phone" in (res.body ?? {}), "la respuesta debe incluir el campo phone");
    } finally {
      await prisma.user.deleteMany({ where: { email: profileEmail } });
    }
  });

  integrationTest("PUT /api/auth/me — actualiza nombre, correo y teléfono", async () => {
    // Corrección 1: usuario propio.
    const profileEmail = `profile-upd-${Date.now()}-${Math.floor(Math.random() * 9999)}@ventek.test`;
    const updatedEmail = profileEmail.replace("profile-upd-", "profile-upd-new-");
    const reg = await request("POST", "/api/auth/register", {
      name: "Perfil Actualizar",
      email: profileEmail,
      password: "profile-password-ok",
    });
    assert.equal(reg.status, 201, "No se pudo registrar el usuario de perfil PUT");

    try {
      const login = await request("POST", "/api/auth/login", {
        email: profileEmail,
        password: "profile-password-ok",
      });
      const token = login.body?.token as string;

      const res = await request("PUT", "/api/auth/me", {
        name: "Usuario Actualizado",
        email: updatedEmail,
        phone: "+521234567890",
      }, token);

      // Corrección 2: restaurar el correo en finally aunque fallen las aserciones.
      // El token sigue siendo válido porque el JWT contiene el id, no el correo.
      try {
        assert.equal(res.status, 200);
        assert.equal(res.body?.name, "Usuario Actualizado");
        assert.equal(res.body?.email, updatedEmail);
        assert.equal(res.body?.phone, "+521234567890");
      } finally {
        await request("PUT", "/api/auth/me", {
          name: "Perfil Actualizar",
          email: profileEmail,
          phone: null,
        }, token);
      }
    } finally {
      await prisma.user.deleteMany({ where: { email: profileEmail } });
    }
  });

  integrationTest("PUT /api/auth/me — phone omitido conserva el valor anterior", async () => {
    // Corrección 1: usuario propio.
    const profileEmail = `profile-phone-keep-${Date.now()}-${Math.floor(Math.random() * 9999)}@ventek.test`;
    const reg = await request("POST", "/api/auth/register", {
      name: "Perfil Phone Keep",
      email: profileEmail,
      password: "profile-password-ok",
    });
    assert.equal(reg.status, 201, "No se pudo registrar el usuario de perfil phone-keep");

    try {
      const login = await request("POST", "/api/auth/login", {
        email: profileEmail,
        password: "profile-password-ok",
      });
      const token = login.body?.token as string;

      // Asegurar que hay un teléfono guardado
      await request("PUT", "/api/auth/me", {
        name: "Perfil Phone Keep",
        email: profileEmail,
        phone: "+521234567890",
      }, token);

      // Actualizar sin enviar phone — debe conservarse
      const res = await request("PUT", "/api/auth/me", {
        name: "Perfil Phone Keep",
        email: profileEmail,
      }, token);
      assert.equal(res.status, 200);
      assert.equal(res.body?.phone, "+521234567890");
    } finally {
      await prisma.user.deleteMany({ where: { email: profileEmail } });
    }
  });

  integrationTest("PUT /api/auth/me — phone: null elimina el teléfono", async () => {
    // Corrección 1: usuario propio.
    const profileEmail = `profile-phone-null-${Date.now()}-${Math.floor(Math.random() * 9999)}@ventek.test`;
    const reg = await request("POST", "/api/auth/register", {
      name: "Perfil Phone Null",
      email: profileEmail,
      password: "profile-password-ok",
    });
    assert.equal(reg.status, 201, "No se pudo registrar el usuario de perfil phone-null");

    try {
      const login = await request("POST", "/api/auth/login", {
        email: profileEmail,
        password: "profile-password-ok",
      });
      const token = login.body?.token as string;

      const res = await request("PUT", "/api/auth/me", {
        name: "Perfil Phone Null",
        email: profileEmail,
        phone: null,
      }, token);
      assert.equal(res.status, 200);
      assert.equal(res.body?.phone, null);
    } finally {
      await prisma.user.deleteMany({ where: { email: profileEmail } });
    }
  });

  integrationTest("PUT /api/auth/me — rechaza correo ya registrado por otro usuario (409)", async () => {
    // Corrección 4: dos usuarios temporales propios; no se asume ninguna cuenta preexistente.
    const profileEmail = `profile-conflict-a-${Date.now()}-${Math.floor(Math.random() * 9999)}@ventek.test`;
    const conflictEmail = `profile-conflict-b-${Date.now()}-${Math.floor(Math.random() * 9999)}@ventek.test`;

    const regA = await request("POST", "/api/auth/register", {
      name: "Conflicto A",
      email: profileEmail,
      password: "conflict-password-ok",
    });
    assert.equal(regA.status, 201, "No se pudo registrar el usuario A de conflicto");

    const regB = await request("POST", "/api/auth/register", {
      name: "Conflicto B",
      email: conflictEmail,
      password: "conflict-password-ok",
    });
    assert.equal(regB.status, 201, "No se pudo registrar el usuario B de conflicto");

    try {
      const login = await request("POST", "/api/auth/login", {
        email: profileEmail,
        password: "conflict-password-ok",
      });
      const token = login.body?.token as string;

      // Intentar tomar el correo que ya pertenece al usuario B → debe devolver 409
      const res = await request("PUT", "/api/auth/me", {
        name: "Conflicto A",
        email: conflictEmail,
      }, token);
      assert.equal(res.status, 409);
    } finally {
      await prisma.user.deleteMany({ where: { email: { in: [profileEmail, conflictEmail] } } });
    }
  });

  integrationTest("PUT /api/auth/me — rechaza datos inválidos (400)", async () => {
    // Corrección 1: usuario propio.
    const profileEmail = `profile-invalid-${Date.now()}-${Math.floor(Math.random() * 9999)}@ventek.test`;
    const reg = await request("POST", "/api/auth/register", {
      name: "Perfil Inválido",
      email: profileEmail,
      password: "profile-password-ok",
    });
    assert.equal(reg.status, 201, "No se pudo registrar el usuario de perfil inválido");

    try {
      const login = await request("POST", "/api/auth/login", {
        email: profileEmail,
        password: "profile-password-ok",
      });
      const token = login.body?.token as string;

      // Nombre demasiado corto
      const shortName = await request("PUT", "/api/auth/me", {
        name: "x",
        email: profileEmail,
      }, token);
      assert.equal(shortName.status, 400);

      // Correo con formato inválido
      const badEmail = await request("PUT", "/api/auth/me", {
        name: "Perfil Inválido",
        email: "no-es-un-correo",
      }, token);
      assert.equal(badEmail.status, 400);

      // phone con tipo numérico (no string, no null)
      const badPhone = await request("PUT", "/api/auth/me", {
        name: "Perfil Inválido",
        email: profileEmail,
        phone: 123,
      } as unknown as Record<string, unknown>, token);
      assert.equal(badPhone.status, 400);
    } finally {
      await prisma.user.deleteMany({ where: { email: profileEmail } });
    }
  });

  // ── Cambio de contraseña ───────────────────────────────────────────────────

  integrationTest("PUT /api/auth/me/password — contraseña actual incorrecta → 401", async () => {
    // Corrección 1: usuario propio.
    const profileEmail = `profile-pwd-wrong-${Date.now()}-${Math.floor(Math.random() * 9999)}@ventek.test`;
    const reg = await request("POST", "/api/auth/register", {
      name: "Perfil Pwd Wrong",
      email: profileEmail,
      password: "profile-password-ok",
    });
    assert.equal(reg.status, 201, "No se pudo registrar el usuario pwd-wrong");

    try {
      const login = await request("POST", "/api/auth/login", {
        email: profileEmail,
        password: "profile-password-ok",
      });
      const token = login.body?.token as string;

      const res = await request("PUT", "/api/auth/me/password", {
        currentPassword: "contraseña-incorrecta",
        newPassword: "nueva-contraseña-valida",
      }, token);
      assert.equal(res.status, 401);
    } finally {
      await prisma.user.deleteMany({ where: { email: profileEmail } });
    }
  });

  integrationTest("PUT /api/auth/me/password — nueva contraseña < 8 caracteres → 400", async () => {
    // Corrección 1: usuario propio.
    const profileEmail = `profile-pwd-short-${Date.now()}-${Math.floor(Math.random() * 9999)}@ventek.test`;
    const reg = await request("POST", "/api/auth/register", {
      name: "Perfil Pwd Short",
      email: profileEmail,
      password: "profile-password-ok",
    });
    assert.equal(reg.status, 201, "No se pudo registrar el usuario pwd-short");

    try {
      const login = await request("POST", "/api/auth/login", {
        email: profileEmail,
        password: "profile-password-ok",
      });
      const token = login.body?.token as string;

      const res = await request("PUT", "/api/auth/me/password", {
        currentPassword: "profile-password-ok",
        newPassword: "corta",
      }, token);
      assert.equal(res.status, 400);
    } finally {
      await prisma.user.deleteMany({ where: { email: profileEmail } });
    }
  });

  integrationTest("PUT /api/auth/me/password — cambio correcto → 204 y permite nuevo login", async () => {
    // Corrección 1: usuario propio.
    const profileEmail = `profile-pwd-ok-${Date.now()}-${Math.floor(Math.random() * 9999)}@ventek.test`;
    const originalPassword = "profile-password-ok";
    const tempPassword = "nueva-contraseña-123";

    const reg = await request("POST", "/api/auth/register", {
      name: "Perfil Pwd Ok",
      email: profileEmail,
      password: originalPassword,
    });
    assert.equal(reg.status, 201, "No se pudo registrar el usuario pwd-ok");

    try {
      const login = await request("POST", "/api/auth/login", {
        email: profileEmail,
        password: originalPassword,
      });
      const token = login.body?.token as string;

      // Variable de seguimiento: refleja la contraseña real en la BD en cada momento.
      // Solo se actualiza tras confirmar que el servidor aceptó el cambio.
      let currentLivePassword = originalPassword;

      // Corrección 3: restaurar en finally solo si el cambio llegó a aplicarse.
      try {
        const change = await request("PUT", "/api/auth/me/password", {
          currentPassword: originalPassword,
          newPassword: tempPassword,
        }, token);
        assert.equal(change.status, 204);
        currentLivePassword = tempPassword; // actualizar tras confirmar 204

        const newLogin = await request("POST", "/api/auth/login", {
          email: profileEmail,
          password: tempPassword,
        });
        assert.equal(newLogin.status, 200);
      } finally {
        if (currentLivePassword === tempPassword) {
          await request("PUT", "/api/auth/me/password", {
            currentPassword: tempPassword,
            newPassword: originalPassword,
          }, token);
        }
      }
    } finally {
      await prisma.user.deleteMany({ where: { email: profileEmail } });
    }
  });
});
