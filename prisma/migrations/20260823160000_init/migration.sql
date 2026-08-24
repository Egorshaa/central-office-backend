-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ROOT', 'MANAGER');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('ADMIN', 'SHOP');

-- CreateEnum
CREATE TYPE "TerminalStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'MANAGER',
    "root_key" VARCHAR(8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_owners" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(40),
    "company_name" VARCHAR(255),
    "tax_id" VARCHAR(40),
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "legal_name" VARCHAR(255),
    "tax_id" VARCHAR(40),
    "registration_number" VARCHAR(80),
    "address" TEXT NOT NULL,
    "phone" VARCHAR(40),
    "email" VARCHAR(255),
    "requisites" JSONB,
    "login" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminals" (
    "id" UUID NOT NULL,
    "mac_address" VARCHAR(17) NOT NULL,
    "status" "TerminalStatus" NOT NULL DEFAULT 'INACTIVE',
    "last_seen_at" TIMESTAMP(3),
    "shop_id" UUID NOT NULL,
    "connection_request_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_requests" (
    "id" UUID NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mac_address" VARCHAR(17) NOT NULL,
    "shop_id" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_comments" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "admin_id" UUID,
    "shop_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "refresh_token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_root_key_key" ON "admins"("root_key");

-- CreateIndex
CREATE INDEX "admins_role_idx" ON "admins"("role");

-- CreateIndex
CREATE INDEX "shop_owners_name_idx" ON "shop_owners"("name");

-- CreateIndex
CREATE INDEX "shop_owners_email_idx" ON "shop_owners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "shops_login_key" ON "shops"("login");

-- CreateIndex
CREATE INDEX "shops_owner_id_idx" ON "shops"("owner_id");

-- CreateIndex
CREATE INDEX "shops_name_idx" ON "shops"("name");

-- CreateIndex
CREATE UNIQUE INDEX "terminals_mac_address_key" ON "terminals"("mac_address");

-- CreateIndex
CREATE UNIQUE INDEX "terminals_connection_request_id_key" ON "terminals"("connection_request_id");

-- CreateIndex
CREATE INDEX "terminals_shop_id_idx" ON "terminals"("shop_id");

-- CreateIndex
CREATE INDEX "terminals_status_idx" ON "terminals"("status");

-- CreateIndex
CREATE INDEX "connection_requests_shop_id_idx" ON "connection_requests"("shop_id");

-- CreateIndex
CREATE INDEX "connection_requests_status_requested_at_idx" ON "connection_requests"("status", "requested_at");

-- CreateIndex
CREATE INDEX "connection_requests_mac_address_idx" ON "connection_requests"("mac_address");

-- CreateIndex
CREATE INDEX "request_comments_request_id_created_at_idx" ON "request_comments"("request_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_admin_id_key" ON "sessions"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_shop_id_key" ON "sessions"("shop_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "shop_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_connection_request_id_fkey" FOREIGN KEY ("connection_request_id") REFERENCES "connection_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "connection_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Enforce invariants that Prisma's schema language cannot express directly.
ALTER TABLE "admins"
  ADD CONSTRAINT "admins_root_role_consistency"
  CHECK (
    ("role" = 'ROOT' AND "root_key" = 'ROOT') OR
    ("role" = 'MANAGER' AND "root_key" IS NULL)
  );

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_exactly_one_actor"
  CHECK (
    ("actor_type" = 'ADMIN' AND "admin_id" IS NOT NULL AND "shop_id" IS NULL) OR
    ("actor_type" = 'SHOP' AND "shop_id" IS NOT NULL AND "admin_id" IS NULL)
  );

CREATE UNIQUE INDEX "connection_requests_one_pending_mac"
  ON "connection_requests" ("mac_address")
  WHERE "status" = 'PENDING';
