# Sylicon — Plataforma de Tokenizacion de Aportes On-Chain

Plataforma Web3 para la tokenizacion de aportes medicos sobre Polygon Mainnet. Los aportes de afiliados de SCARE se representan como tokens ERC1155 (ScareMedToken — SMT), permitiendo trazabilidad, transparencia y verificabilidad on-chain.

## Stack Tecnologico

| Capa | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript (strict mode) |
| Base de datos | Supabase (PostgreSQL) |
| Blockchain | Polygon Mainnet |
| Web3 | ethers.js v6 |
| Contrato | ERC1155 OpenZeppelin (ScareMedToken) |
| RPC Provider | Alchemy |
| Estilos | Tailwind CSS + shadcn/ui |
| Graficas | Recharts |
| Auth Webhook | JWT HS256 |
| Deploy | Vercel |

## Arquitectura

```
SCARE (ERP) ──webhook JWT──> Next.js API Routes ──> Supabase (PostgreSQL)
                                      │
                                      ├──> HD Wallet Derivation (BIP39/BIP32)
                                      └──> ERC1155 Mint on Polygon (ethers.js)
```

### Flujo Principal

1. **SCARE envia webhook** con datos del afiliado y sus planes
2. **API valida JWT** HS256 y registra al usuario en Supabase
3. **Se deriva una wallet HD** deterministica a partir de la cedula (BIP32)
4. **El afiliado ingresa** su cedula en el frontend
5. **Activa sus tokens** — la wallet minter ejecuta `mintTo()` en el contrato ERC1155
6. **Dashboard** muestra aportes disponibles, reservados y utilizados con graficas

### Custodia de Wallets

- Un unico **mnemonico maestro** (BIP39, 24 palabras) genera todas las wallets
- **Derivacion deterministica**: `m/44'/60'/0'/0/{index}` donde index = hash de la cedula
- Las llaves privadas **nunca se almacenan** — se derivan on-demand
- La wallet del usuario solo es destinataria del mint; no necesita firmar

## Estructura del Proyecto

```
/
├── app/
│   ├── page.tsx                              # Ingreso de cedula
│   ├── layout.tsx                            # Layout global + Toaster
│   ├── globals.css                           # Tailwind + variables CSS
│   ├── dashboard/
│   │   └── page.tsx                          # Dashboard principal
│   └── api/
│       ├── webhook/scare/
│       │   ├── registro/route.ts             # Webhook 1 — ACTIVO
│       │   ├── demanda-inicio/route.ts       # Webhook 2 — Fase 2 (comentado)
│       │   └── demanda-resuelta/route.ts     # Webhook 3 — Fase 2 (comentado)
│       └── user/
│           ├── [cedula]/route.ts             # GET usuario por cedula
│           ├── activate-tokens/route.ts      # POST mint ERC1155
│           └── tokens/[cedula]/route.ts      # GET dashboard data
├── components/
│   ├── Sidebar.tsx                           # Sidebar con info del afiliado
│   ├── PlanTabs.tsx                          # Tabs por codigo de plan
│   ├── MetricCard.tsx                        # Tarjeta de metrica
│   ├── ProgressBar.tsx                       # Barra tricolor de progreso
│   ├── TokenChart.tsx                        # Grafica de barras (Recharts)
│   ├── ActivateTokensBanner.tsx              # Banner de activacion
│   ├── ActivateTokensModal.tsx               # Modal de activacion
│   ├── AcelerarModal.tsx                     # Modal acelerar aportes
│   └── SkeletonDashboard.tsx                 # Skeleton loading
├── lib/
│   ├── supabase.ts                           # Cliente Supabase (anon key)
│   ├── supabase-admin.ts                     # Cliente Supabase (service role)
│   ├── contract.ts                           # Contrato ERC1155 ethers.js
│   ├── wallet.ts                             # HD Wallet derivation
│   ├── jwt.ts                                # Verificacion JWT HS256
│   ├── format.ts                             # Utilidades de formato
│   └── abi/
│       └── SMT.json                          # ABI del contrato
├── types/
│   └── index.ts                              # TypeScript types
├── supabase/
│   └── schema.sql                            # DDL completo de la BD
└── .env.local                                # Variables de entorno (no en git)
```

## Variables de Entorno

Crear `.env.local` en la raiz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# SCARE Integration
SCARE_JWT_SECRET=

# Alchemy + Polygon Mainnet
ALCHEMY_API_KEY=
NEXT_PUBLIC_CHAIN_ID=137

# Contrato ERC1155 ScareMedToken (SMT)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x04DD6ecA24B4C471179c326e526ACA0d768eE8c4

# Wallet principal (MINTER_ROLE + BURNER_ROLE)
MINTER_PRIVATE_KEY=

# HD Wallet master seed — NUNCA compartir
HD_MASTER_MNEMONIC=
```

### Generar el mnemonico maestro

```bash
node -e "const {ethers} = require('ethers'); console.log(ethers.Wallet.createRandom().mnemonic.phrase)"
```

## Instalacion

```bash
# Clonar el repositorio
git clone git@github.com:pablofelipe01/scare-medicos-ll.git
cd scare-medicos-ll

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Llenar las variables con tus credenciales

# Ejecutar schema SQL en Supabase
# Copiar contenido de supabase/schema.sql y ejecutar en Supabase SQL Editor

# Iniciar servidor de desarrollo
npm run dev
```

## API Endpoints

### Webhooks (autenticados con JWT HS256)

| Metodo | Ruta | Estado | Descripcion |
|---|---|---|---|
| POST | `/api/webhook/scare/registro` | Activo | Registra afiliado + planes + wallet |
| POST | `/api/webhook/scare/demanda-inicio` | Fase 2 | Cambia estado a RESERVADOS |
| POST | `/api/webhook/scare/demanda-resuelta` | Fase 2 | Burn de tokens en blockchain |

### Rutas de Usuario

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/user/[cedula]` | Obtener datos del usuario |
| POST | `/api/user/activate-tokens` | Mint de tokens ERC1155 en Polygon |
| GET | `/api/user/tokens/[cedula]` | Dashboard data completo |

## Base de Datos

4 tablas en Supabase PostgreSQL:

- **usuarios** — Datos del afiliado, wallet address, estado de activacion
- **planes_tokens** — Planes vinculados con estado (DISPONIBLES/RESERVADOS/UTILIZADOS)
- **webhook_logs** — Log de todos los webhooks recibidos
- **token_ids_map** — Mapeo codigo_plan → token_id del contrato ERC1155

## Contrato Inteligente

- **Nombre:** ScareMedToken (SMT)
- **Estandar:** ERC1155 (OpenZeppelin)
- **Red:** Polygon Mainnet (Chain ID: 137)
- **Direccion:** `0x04DD6ecA24B4C471179c326e526ACA0d768eE8c4`
- **Funciones:** `mintTo()`, `burn()`, `balanceOf()`, `balanceOfBatch()`

## Deploy en Vercel

1. Conectar repositorio en Vercel
2. Configurar todas las variables de entorno en Vercel Dashboard
3. El `HD_MASTER_MNEMONIC` debe estar como variable encriptada
4. Deploy automatico en cada push a `main`

## Seguridad

- Llaves privadas solo accesibles en API routes (server-side)
- Supabase service role key solo en server-side
- JWT HS256 para autenticacion de webhooks
- HD Wallet: llaves privadas nunca se persisten
- RLS habilitado en Supabase para cliente publico

## Roadmap

- [x] Webhook de registro de afiliados
- [x] Derivacion HD de wallets
- [x] Mint ERC1155 en Polygon
- [x] Dashboard con metricas y graficas
- [ ] Webhook demanda en proceso (RESERVADOS)
- [ ] Webhook demanda resuelta (BURN)
- [ ] Descarga de certificados
- [ ] Descarga de aportes
- [ ] Cambio de contrasena
- [ ] Migracion de custodia a AWS KMS

## Licencia

Proyecto privado — SCARE / Sylicon.
