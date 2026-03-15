# Sylicon — Arquitectura Tecnologica

## Vision General

Sylicon es una plataforma de tokenizacion de aportes medicos construida sobre blockchain (Polygon). Permite a los medicos afiliados a SCARE visualizar, activar y certificar sus aportes como tokens ERC-1155 en una billetera blockchain propia — sin que el medico necesite conocimientos tecnicos, sin semillas, sin MetaMask, sin costos de terceros.

La plataforma fue disenada con un principio claro: **eliminar dependencias de terceros costosos** en custodia de billeteras, autenticacion y gestion de identidad, reemplazandolas con soluciones criptograficas propias.

---

## 1. Custodia de Billeteras — HD Wallet Derivado

### El problema
Cada medico necesita una billetera blockchain para recibir sus tokens. Las soluciones tradicionales (Fireblocks, Magic Link, Privy) cobran por usuario o por transaccion, y agregan complejidad.

### Nuestra solucion
Usamos una **billetera HD (Hierarchical Deterministic)** basada en los estandares BIP-39 y BIP-32 de la industria Bitcoin/Ethereum.

### Como funciona

```
Semilla maestra (24 palabras BIP-39)
    |
    ├── Cedula 10529036 → index 10529036 → Wallet 0x960b...fC3
    ├── Cedula 84039983 → index 84039983 → Wallet 0xBfbb...0be
    ├── Cedula 12345678 → index 12345678 → Wallet 0x9bC4...f77
    └── ... (hasta 2,147,483,648 billeteras unicas)
```

- Existe **una sola semilla maestra** almacenada como variable de entorno (`HD_MASTER_MNEMONIC`).
- A partir de esa semilla, se **deriva deterministicamente** una billetera unica por cada cedula de medico.
- El indice de derivacion es: `parseInt(cedula) % 2,147,483,648` (maximo indice BIP-32).
- La misma cedula **siempre** produce la misma billetera. No hay aleatoriedad.
- Las **llaves privadas nunca se almacenan** en base de datos. Solo se guarda la direccion publica (`wallet_address`).
- Cuando se necesita firmar una transaccion (mint o burn), la llave privada se deriva en memoria, se usa, y se descarta.

### Ventajas
- **Costo: $0** — no hay proveedor de custodia externo.
- **Seguridad** — las llaves privadas solo existen en memoria durante la transaccion.
- **Recuperabilidad** — con la semilla maestra se puede reconstruir cualquier billetera.
- **Determinismo** — no hay riesgo de perder una billetera generada aleatoriamente.
- **Simplicidad** — el medico nunca interactua con llaves, semillas ni MetaMask.

### Tecnologia
- `ethers.js v6` — libreria Ethereum para derivacion HD y firma de transacciones.
- Red: **Polygon Mainnet** (Chain ID: 137) via **Alchemy RPC**.

---

## 2. Autenticacion por PIN — Sin Passwords, Sin OAuth

### El problema
Los medicos no son usuarios tecnicos. Necesitabamos un sistema de autenticacion simple, seguro, sin emails de verificacion, sin OAuth, sin dependencias externas.

### Nuestra solucion
Un **PIN numerico de 6 digitos** como unica credencial, hasheado con bcrypt.

### Flujo de autenticacion

```
Primera vez:
  Cedula → Crear PIN (6 digitos) → Hash bcrypt → DB
  Se genera frase de recuperacion (5 palabras) → Hash bcrypt → DB
  La frase se muestra UNA sola vez al usuario.

Login:
  Cedula + PIN → bcrypt.compare(pin, codigo_hash) → Acceso

Olvido de PIN:
  Cedula + Frase de recuperacion + Nuevo PIN
  → bcrypt.compare(frase, recovery_hash)
  → Si coincide: hashear nuevo PIN → Actualizar DB

Cambio de PIN:
  PIN actual + Nuevo PIN
  → Verificar actual → Hashear nuevo → Actualizar DB
```

### Detalles tecnicos
- **Hashing:** bcryptjs v3.0.3 con 10 rondas de sal.
- **Frase de recuperacion:** 5 palabras aleatorias seleccionadas de una lista curada de 256 palabras en espanol (subconjunto BIP-39).
- **Almacenamiento:** Solo se almacenan hashes (`codigo_hash`, `recovery_hash`). Nunca el PIN ni la frase en texto plano.
- **Verificacion:** `bcrypt.compare()` — comparacion en tiempo constante contra ataques de timing.

### Ventajas
- **Costo: $0** — no hay Auth0, Firebase Auth, ni Clerk.
- **Simplicidad** — un PIN de 6 digitos es facil de recordar.
- **Seguridad** — bcrypt con sal hace impractico un ataque de fuerza bruta contra el hash.
- **Recuperacion autonoma** — si el medico anoto su frase, puede recuperar acceso sin soporte tecnico.

---

## 3. Contrato Inteligente — ERC-1155 Multi-Token

### Que es
Un contrato ERC-1155 desplegado en Polygon que representa los aportes medicos como tokens.

### Por que ERC-1155
- Permite **multiples tipos de token** en un solo contrato (un token ID por plan medico).
- Mas eficiente en gas que desplegar un ERC-20 por cada plan.
- Soporta `mintTo` y `burn` con roles de permisos.

### Contrato
- **Nombre:** ScareMedToken (SMT)
- **Estandar:** ERC-1155 (OpenZeppelin)
- **Red:** Polygon Mainnet
- **Direccion:** `0x04DD6ecA24B4C471179c326e526ACA0d768eE8c4`

### Operaciones
| Operacion | Funcion | Descripcion |
|-----------|---------|-------------|
| Mint | `mintTo(to, tokenId, amount, data)` | Acredita tokens al medico |
| Burn | `burn(account, id, amount)` | Quema tokens al resolver demanda |
| Balance | `balanceOf(account, id)` | Consulta balance por plan |

### Mapeo de token IDs
Cada codigo de plan medico se mapea a un `token_id` unico del contrato mediante la tabla `token_ids_map`. Si un plan nuevo llega, se le asigna el siguiente ID disponible automaticamente.

### Wallet Minter
Las transacciones de mint se ejecutan con una wallet dedicada que tiene el rol `MINTER_ROLE` en el contrato. Su llave privada esta en `MINTER_PRIVATE_KEY`.

---

## 4. Integracion SCARE — Webhooks con JWT

### Como se conecta SCARE
El sistema ERP de SCARE envia datos a Sylicon mediante webhooks autenticados con JWT HS-256.

### Webhooks disponibles

| Webhook | Endpoint | Estado |
|---------|----------|--------|
| Registro | `POST /api/webhook/scare/registro` | Activo |
| Demanda iniciada | `POST /api/webhook/scare/demanda-inicio` | Fase 2 |
| Demanda resuelta | `POST /api/webhook/scare/demanda-resuelta` | Fase 2 |

### Flujo de registro
1. SCARE envia datos del medico (cedula, nombre, especialidad, planes con tokens).
2. Sylicon verifica el JWT.
3. Deriva la billetera del medico a partir de su cedula.
4. Crea/actualiza el usuario en la base de datos.
5. Inserta los planes con sus tokens.
6. Registra el evento en `webhook_logs` para auditoria.

### Seguridad
- Autenticacion: JWT HS-256 con secreto compartido (`SCARE_JWT_SECRET`).
- Auditoria: cada webhook se registra en `webhook_logs` con payload completo, IP de origen y estado.

---

## 5. Certificados PDF — Generacion Dinamica

### Como funciona
Al hacer click en "Descargar Certificado", se genera un PDF en el navegador del usuario con sus datos personalizados.

### Contenido del certificado
- Nombre completo, cedula, especialidad.
- Direccion de billetera blockchain.
- Resumen de tokens por plan (disponibles, reservados, utilizados).
- Fecha de expedicion.
- Disclaimer de verificabilidad blockchain.

### Tecnologia
- **jsPDF** — generacion client-side, sin consumir recursos del servidor.
- Formato A4 horizontal con bordes y colores de la marca Sylicon.

### Ventajas
- **Costo: $0** — no hay servicio externo de generacion de PDFs.
- **Instantaneo** — se genera en milisegundos en el navegador.
- **Offline-ready** — una vez cargado el dashboard, funciona sin conexion.

---

## 6. Base de Datos — Supabase (PostgreSQL)

### Tablas principales

| Tabla | Proposito |
|-------|-----------|
| `usuarios` | Medicos afiliados, wallet, hashes de PIN |
| `planes_tokens` | Tokens por plan, estado, hashes de transacciones blockchain |
| `token_ids_map` | Mapeo codigo de plan → token ID del contrato ERC-1155 |
| `webhook_logs` | Auditoria de todos los webhooks recibidos |

### Estados de un token

```
DISPONIBLES  →  RESERVADOS  →  UTILIZADOS
  (mint)       (demanda)       (burn)
```

### Seguridad
- **Supabase Admin Client** (service role key) para operaciones del servidor.
- **Row Level Security (RLS)** habilitado.
- El cliente publico (`anon key`) no tiene acceso directo a tablas sensibles.

---

## 7. Frontend — Next.js + Tailwind

### Stack
| Tecnologia | Version | Uso |
|------------|---------|-----|
| Next.js | 14.2.0 | Framework (App Router) |
| React | 18 | UI reactiva |
| TypeScript | 5 | Tipado estricto |
| Tailwind CSS | 3.4.1 | Estilos |
| shadcn/ui + Radix | — | Componentes (modales, tabs, toasts) |
| Recharts | 2.15.4 | Graficos de aportes |
| Lucide React | 0.263.1 | Iconografia |

### Paginas
- `/` — Login (cedula → PIN → setup/recovery)
- `/dashboard` — Panel principal (sidebar + metricas + grafico + certificado)

---

## 8. Despliegue — Vercel

- Despliegue automatico en cada push a `main`.
- Variables de entorno configuradas en el dashboard de Vercel.
- API routes ejecutan como funciones serverless.
- Cache deshabilitado en rutas dinamicas (`force-dynamic` + `no-store` en Supabase client).

---

## 9. Resumen de Costos Evitados

| Servicio reemplazado | Solucion propia | Ahorro estimado |
|---------------------|-----------------|-----------------|
| Custodia de wallets (Fireblocks, Privy) | HD Wallet derivado | $0.50–$5 / usuario / mes |
| Autenticacion (Auth0, Clerk) | PIN + bcrypt | $0.02–$0.05 / MAU |
| Generacion de PDFs (servicio externo) | jsPDF client-side | $0.01–$0.10 / documento |
| Email de verificacion / OTP | Frase de recuperacion | $0.005–$0.02 / envio |

Todo el sistema corre sobre infraestructura gratuita o de bajo costo:
- **Vercel** — plan gratuito o Pro.
- **Supabase** — plan gratuito para desarrollo, Pro para produccion.
- **Polygon** — gas ~$0.001 por transaccion.
- **Alchemy** — plan gratuito para RPC.

---

## 10. Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Blockchain (Polygon)
ALCHEMY_API_KEY=
NEXT_PUBLIC_CHAIN_ID=137
NEXT_PUBLIC_CONTRACT_ADDRESS=

# Wallets
MINTER_PRIVATE_KEY=
HD_MASTER_MNEMONIC=

# SCARE Integration
SCARE_JWT_SECRET=
```

> **CRITICO:** `HD_MASTER_MNEMONIC` y `MINTER_PRIVATE_KEY` son las claves mas sensibles del sistema. Quien tenga la mnemonica puede derivar todas las billeteras. Quien tenga la llave del minter puede acunar tokens. Ambas deben estar encriptadas en Vercel y nunca en repositorio.
