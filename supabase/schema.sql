-- ============================================================
-- SCHEMA DDL — Plataforma de Tokenización Sylicon
-- Base de datos: Supabase (PostgreSQL)
-- ============================================================

-- Tabla principal de usuarios/afiliados
CREATE TABLE usuarios (
  identificacion    VARCHAR PRIMARY KEY,
  afiliado          VARCHAR NOT NULL,
  profesion         VARCHAR,
  especialidad      VARCHAR,
  nombre_plan       VARCHAR,
  correo            VARCHAR,
  tipo              VARCHAR,
  wallet_address    VARCHAR UNIQUE,
  wallet_creada     BOOLEAN DEFAULT false,
  tokens_activados  BOOLEAN DEFAULT false,
  fecha_creacion    TIMESTAMP DEFAULT NOW(),
  fecha_activacion  TIMESTAMP,
  codigo_hash       TEXT,
  recovery_hash     TEXT,
  avatar_url        VARCHAR
);

-- Enum para estado de tokens
CREATE TYPE estado_token AS ENUM
  ('DISPONIBLES', 'RESERVADOS', 'UTILIZADOS');

-- Tabla de planes y tokens vinculados a cada usuario
CREATE TABLE planes_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identificacion    VARCHAR REFERENCES usuarios(identificacion),
  codigo_plan       VARCHAR NOT NULL,
  tokens            INTEGER NOT NULL,
  estado            estado_token NOT NULL DEFAULT 'DISPONIBLES',
  fecha_vinculacion TIMESTAMP,
  fecha_mint        TIMESTAMP,
  tx_hash_mint      VARCHAR,
  tx_hash_burn      VARCHAR,
  token_id_contrato INTEGER,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- Log de todos los webhooks recibidos
CREATE TABLE webhook_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento        VARCHAR NOT NULL,
  payload_raw   JSONB NOT NULL,
  status        VARCHAR NOT NULL,
  error_message TEXT,
  ip_origen     VARCHAR,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Mapeo de código de plan a token_id del contrato ERC1155
CREATE TABLE token_ids_map (
  codigo_plan VARCHAR PRIMARY KEY,
  token_id    INTEGER NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_planes_tokens_identificacion ON planes_tokens(identificacion);
CREATE INDEX idx_planes_tokens_estado ON planes_tokens(estado);
CREATE INDEX idx_webhook_logs_evento ON webhook_logs(evento);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
