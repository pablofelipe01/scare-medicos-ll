# Actualización — 15 de julio de 2026

Documento de referencia de los cambios realizados en la plataforma Sylicon
(`sylicon.tech`). Cubre tres frentes: el **Certificado de Integración FEVS**, el
nuevo **Portal Administrativo** y el **endurecimiento de seguridad de la base de
datos (RLS)**.

---

## Resumen ejecutivo

| Entrega | Estado |
|---|---|
| 🟢 Certificado de Integración FEVS | Código completo, verificado y desplegado. **Bloqueado** por infraestructura de SCARE (endpoint no accesible). |
| 🟢 Portal Administrativo | Construido, desplegado y **login verificado en producción**. |
| 🟢 Seguridad de BD (RLS) | Activado en todas las tablas, sin afectar el funcionamiento. |

---

## 1. Certificado de Integración FEVS

### Qué es
Se reactivó la descarga de certificado en el dashboard del afiliado, reemplazando
el antiguo certificado provisional de "tokenización" por la **Certificación de
Integración FEVS** oficial (basada en la plantilla `.docx` con el membrete FEVS y
la firma de la Dra. Verónica Muñoz Bruce).

### Cómo funciona (flujo)
1. El afiliado presiona **"Descargar Certificado de Integración"** en el dashboard.
2. El frontend llama a `GET /api/user/certificado-integracion` (usa la sesión del
   afiliado; solo puede pedir su propio certificado).
3. El servidor firma un **JWT** (`source: "scare"`, algoritmo HS256, vigencia 1h)
   con la clave compartida y consulta el API de SCARE:
   `GET /api/certificadointegracion?cedula=<cédula>`.
4. Con los datos recibidos, el navegador **genera el PDF** con el membrete oficial
   de fondo, el texto legal, y la firma de la Dra. Verónica.
5. Se registra la descarga en `usuarios.certificado_descargado`.

### Detalles técnicos
- **Generación del PDF**: `lib/generate-integration-certificate.ts` con `jsPDF`,
  formato Carta. El membrete se guarda como **JPEG** (`public/certificado/membrete-fevs.jpg`)
  para que `jsPDF` lo embeba comprimido — de lo contrario un PNG RGBA se almacenaba
  sin comprimir y el PDF pesaba **~34 MB**; con JPEG pesa **~724 KB**.
- **Firma**: `public/certificado/firma-veronica.png`.
- **Mapeo de campos** (placeholders del `.docx` → API):
  `@AFILIADO`→`AFILIADO`, `@IDENTIFICACIÓN`→`IDENTIFICACION`,
  `@ESPECIALIDADES`→`ESPECIALIDADES`, `@FECHA_INTEGRACIÓN`→`FECHA_INTEGRACION`,
  fecha de expedición→`FECHA_CERTIFICADO`, firma→`FIRMA`, cargo→`CARGO`.

### ⚠️ Estado: bloqueado por SCARE
El endpoint de certificados **no es accesible** desde el servidor:

| Endpoint | Host | Resultado |
|---|---|---|
| Documentos (funciona) | `apiintegracionsylicon.scare.org.co:9374` | ✅ resuelve y responde |
| Certificados (falla) | `apiintsylicon.scare.org.co:9372` | ❌ **NXDOMAIN** (no existe en DNS) |
| Certificados (alterno probado) | `apiintegracionsylicon.scare.org.co:9372` | ❌ **timeout** (puerto cerrado) |

El código está correcto y verificado (misma lógica y misma clave JWT que el
endpoint de documentos, que sí funciona). **Falta que SCARE (Infraestructura)
confirme el host y puerto correctos y accesibles del API de certificados.**

La URL es **configurable por variable de entorno** `SCARE_CERT_BASE_URL`: cuando
SCARE confirme el host, basta definir esa variable en Vercel y reprobar — sin
cambiar código.

**Qué pedirle a SCARE:**
> El host `apiintsylicon.scare.org.co:9372` de la especificación no resuelve en
> DNS, y el puerto `:9372` del host de integración da timeout. ¿Cuál es el host y
> puerto correctos y accesibles del API de certificados (`/api/certificadointegracion`)?

---

## 2. Portal Administrativo

### Qué es
Un portal en **`/admin`** (login en `/admin/login`), separado del login de
afiliados, donde el Administrador de ARGESSA puede ver **todos** los usuarios y
hacer correcciones menores. **Las billeteras y los tokens son estrictamente de
solo lectura.**

### Autenticación
- Credenciales en variables de entorno **`ADMIN_USERNAME`** y **`ADMIN_PASSWORD`**.
- Sesión propia: cookie **`admin_session`** (JWT con claim `role: "admin"`, firmado
  con `SESSION_JWT_SECRET`, vigencia 8 horas).
- Comparación de credenciales en **tiempo constante** (evita timing attacks).
- Toda ruta `/api/admin/*` valida la sesión de admin **en el servidor**; las páginas
  `/admin` redirigen a login si no hay sesión.

### Funcionalidades
- **Listado** (`/admin`): tabla de todos los usuarios con **búsqueda** (por cédula,
  nombre o correo) y **paginación** (20 por página). Columnas: cédula, nombre,
  correo, tipo, planes, tokens (disponibles / reservados / utilizados), billetera
  (abreviada), y ✓ si descargó certificado.
- **Detalle / edición** (modal): muestra **todo** el detalle del usuario —
  billetera completa (con copiar), estado de billetera/tokens, certificado
  descargado, PIN configurado, fechas, planes (con estado, tokens, fechas y tx
  hashes) y documentos.

### Campos editables vs. solo lectura
| Editables por el admin | Solo lectura (protegidos) |
|---|---|
| Nombre (afiliado) | Billetera (`wallet_address`) |
| Correo | Estado de billetera / tokens activados |
| Cédula | Tokens y planes (montos, estados, tx) |
| Profesión | Hashes de PIN / recuperación |
| Especialidad | Certificado descargado (fecha) |
| Tipo | Fechas de creación / activación |
| Nombre del plan | |

El servidor aplica una **lista blanca**: cualquier intento de modificar campos
sensibles (billetera, tokens, hashes) se **ignora**. Se valida el formato del
correo.

### Corrección de cédula (caso especial)
La cédula es la **llave primaria** y está referenciada por la tabla de planes.
Al corregirla:
- Se valida que sea numérica y que **no colisione** con otra existente (error 409).
- Los planes vinculados se actualizan **en cascada** automáticamente (gracias al
  `ON UPDATE CASCADE` agregado al FK).
- La billetera guardada **no se recalcula** (el admin no toca billeteras). La UI
  muestra una advertencia al cambiar la cédula.

### Registro de descarga de certificado
Se agregó la columna `usuarios.certificado_descargado` (timestamp), que se marca
cuando el afiliado descarga su certificado. El portal la muestra (columna "Cert.").

---

## 3. Seguridad de la base de datos (RLS)

Se detectó que **Row Level Security (RLS) estaba desactivado** en todas las tablas
y que la clave anónima pública (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, expuesta en el
navegador) permitía leer y modificar **toda** la base de datos directamente,
saltándose la aplicación.

**Corrección:** se activó RLS en las 4 tablas (`usuarios`, `planes_tokens`,
`webhook_logs`, `token_ids_map`).

**Por qué no afecta el funcionamiento:** la aplicación accede a la base de datos
exclusivamente con el **service role** (`SUPABASE_SERVICE_ROLE_KEY`), que **ignora
RLS** por diseño. El cliente anónimo (`lib/supabase.ts`) no se usa en ninguna parte.
Se verificó en producción que el login y el dashboard siguen funcionando tras el
cambio.

> Nota a futuro: si algún día se agrega código que lea la base **directamente desde
> el navegador** con la clave pública, quedaría bloqueado por RLS y habría que
> crear una política específica. Con la arquitectura actual (todo vía rutas
> `/api/...`), no aplica.

---

## 4. Cambios en la base de datos (migraciones aplicadas a producción)

```sql
-- 1) Rastreo de descarga del certificado
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS certificado_descargado TIMESTAMP;

-- 2) Permitir corregir la cédula (PK) con cascada a planes
ALTER TABLE public.planes_tokens
  DROP CONSTRAINT IF EXISTS planes_tokens_identificacion_fkey;
ALTER TABLE public.planes_tokens
  ADD CONSTRAINT planes_tokens_identificacion_fkey
  FOREIGN KEY (identificacion)
  REFERENCES public.usuarios(identificacion)
  ON UPDATE CASCADE;

-- 3) Activar Row Level Security
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_ids_map ENABLE ROW LEVEL SECURITY;
```

El archivo `supabase/schema.sql` se actualizó para reflejar estos cambios.

---

## 5. Variables de entorno

| Variable | Uso | Estado |
|---|---|---|
| `ADMIN_USERNAME` | Usuario del portal admin | ✅ configurada en Vercel |
| `ADMIN_PASSWORD` | Contraseña del portal admin | ✅ configurada en Vercel |
| `SCARE_CERT_BASE_URL` | Host del API de certificados (override) | ⏳ definir cuando SCARE confirme el host |
| `SCARE_JWT_SECRET` | Clave JWT compartida con SCARE | ya existía |
| `SESSION_JWT_SECRET` | Firma de sesiones (afiliado y admin) | ya existía |
| `SUPABASE_SERVICE_ROLE_KEY` | Acceso a BD (ignora RLS) | ya existía |

> Sin `ADMIN_USERNAME`/`ADMIN_PASSWORD`, el login del portal responde
> *"Portal no configurado"* (500). Al agregarlas en Vercel se requiere un redeploy.

---

## 6. Datos de prueba

- **Usuario afiliado de prueba** (en Supabase, para reprobar el certificado cuando
  SCARE desbloquee): cédula `900900900`, PIN `246810`. Tiene 2 planes (AESC, AXS).
  Se puede eliminar con el proceso de limpieza (`scripts/cleanup-db.ts`) cuando ya
  no se necesite.
- **Admin (local):** las credenciales de prueba local están en `.env.local`
  (no versionado). Las de producción son las que se configuraron en Vercel.

---

## 7. Pendientes

- 🔵 **Certificado**: esperar a que SCARE confirme el host/puerto accesible del API
  de certificados. Luego: definir `SCARE_CERT_BASE_URL` en Vercel y reprobar la
  descarga real con un afiliado que tenga certificado cargado en SCARE.
- 🔵 (Opcional) Eliminar el usuario de prueba `900900900` cuando ya no se use.

---

## 8. Archivos nuevos y modificados

### Nuevos
```
app/api/user/certificado-integracion/route.ts   # API certificado (afiliado)
lib/generate-integration-certificate.ts          # Generación del PDF
public/certificado/membrete-fevs.jpg             # Membrete FEVS (fondo)
public/certificado/firma-veronica.png            # Firma Dra. Verónica

app/admin/login/page.tsx                          # Login del portal
app/admin/page.tsx                                # Listado de usuarios
components/AdminUserModal.tsx                      # Detalle/edición
app/api/admin/login/route.ts                      # Auth admin
app/api/admin/logout/route.ts
app/api/admin/me/route.ts
app/api/admin/users/route.ts                      # Listado (búsqueda+paginación)
app/api/admin/users/[cedula]/route.ts             # Detalle (GET) y edición (PATCH)
```

### Modificados
```
components/PlanTabs.tsx        # Botón real de descarga de certificado
lib/jwt.ts                     # signAdminJWT / verifyAdminJWT
lib/auth.ts                    # Cookie y sesión de admin
types/index.ts                 # Tipos del portal admin
supabase/schema.sql            # Refleja columnas y FK/RLS nuevos
```

---

## 9. Historial de commits (rama `main`)

```
070a7dc  Merge feat/portal-admin: Portal administrativo
62768d6  Add administrative portal
ca845e4  Make SCARE certificate base URL configurable, remove temp diagnostics
1b2781e  Point certificate API to reachable Sylicon host on port 9372
d1b7962  Merge feat/certificado-integracion: Certificado de Integración FEVS download
ceecd25  Add Certificado de Integración FEVS download
```

---

*Generado el 15 de julio de 2026.*
