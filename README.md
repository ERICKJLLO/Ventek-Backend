# Ventek Backend

Backend de Ventek para ofrecer servicios de desarrollo web y soporte tecnológico.

## Tecnologías y arquitectura

- Node.js, Express 5, TypeScript y PostgreSQL.
- Prisma 7 con `@prisma/adapter-pg`.
- bcrypt para contraseñas y JWT para sesiones.
- Arquitectura de cuatro capas: `domain`, `application`, `infrastructure` e `interface`.

## Instalación local

1. Requiere Node.js, PostgreSQL y una base de datos `ventek_db`.
2. Instala dependencias:

   ```bash
   npm install
   ```

3. Copia `.env.example` a `.env` y configura `DATABASE_URL`, `JWT_SECRET` y
   `FRONTEND_ORIGIN`. No subas `.env` ni uses las contraseñas de demostración en producción.
4. Aplica las migraciones:

   ```bash
   npx prisma migrate deploy
   ```

5. Para datos locales, define `SEED_ADMIN_PASSWORD` y `SEED_USER_PASSWORD` y ejecuta:

   ```bash
   npm run seed
   ```

6. Inicia el servidor:

   ```bash
   npm run dev
   ```

El puerto predeterminado es `3000`. El backend no está desplegado ni integrado con el
frontend todavía.

## Pruebas automatizadas

La suite usa el runner `node:test` incluido en Node.js y `fetch` nativo, ejecutada
mediante `tsx`; no agrega una biblioteca de aserciones o HTTP innecesaria. Las pruebas
de integración requieren una base PostgreSQL separada:

```bash
npx prisma migrate deploy
npm test
```

Define `TEST_DATABASE_URL` apuntando a una base de pruebas ya creada y aislada de
`DATABASE_URL`, además de `TEST_ADMIN_PASSWORD` y `TEST_USER_PASSWORD`, para ejecutar
los escenarios HTTP. La suite no cambia automáticamente la base de desarrollo. Si
`TEST_DATABASE_URL` no está definida, los 13 casos de integración aparecen como
omitidos y no deben interpretarse como pruebas pasadas.

## Autenticación

`POST /api/auth/register` recibe `{ "name", "email", "password" }` y crea un usuario
normal. `POST /api/auth/login` recibe `{ "email", "password" }` y devuelve un JWT.
El middleware verifica la firma, expiración, identificador y rol del token; nunca toma
el rol desde el body.

Un error `401` significa que falta autenticación o el token es inválido. Un error
`403` significa que el token es válido, pero el rol no tiene permiso para esa operación.

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/register` | Público |
| POST | `/api/auth/login` | Público |
| GET | `/api/services?page=1&limit=6` | Público |
| GET | `/api/services/:id` | Público |
| POST | `/api/services` | Admin |
| PUT | `/api/services/:id` | Admin |
| DELETE | `/api/services/:id` | Admin |
| POST | `/api/interactions` | Autenticado |
| GET | `/api/interactions/mias` | Autenticado |
| GET | `/api/interactions` | Admin |

El listado de servicios devuelve `{ pagination, data }`, con `page`, `limit`, `total`
y `totalPages`. Las interacciones reciben `{ "serviceId", "message" }`; el usuario se
obtiene exclusivamente del JWT. Los datos inválidos devuelven 400, recursos ausentes
404, credenciales incorrectas 401, permisos insuficientes 403 y correos duplicados 409.

## Seed de demostración

El seed es idempotente: usa `upsert` para los nueve servicios y las cuentas. Los
correos por defecto son `admin.local@ventek.test` y `usuario.local@ventek.test`, pero
las contraseñas deben definirse mediante variables de entorno. Son cuentas únicamente
locales/de demostración y deben cambiarse o no ejecutarse en producción.

## Estado

La API, las migraciones y el seed están preparados para PostgreSQL local. Deben
configurarse las variables de entorno y ejecutarse pruebas de integración contra una
base de datos disponible antes de un despliegue. La integración pendiente es el
frontend Next.js.
