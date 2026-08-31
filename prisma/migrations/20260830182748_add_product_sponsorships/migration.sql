-- CreateEnum
CREATE TYPE "SponsorshipStatus" AS ENUM ('requested', 'quoted', 'active', 'expired', 'rejected', 'cancelled');

-- CreateTable
CREATE TABLE "product_sponsorships" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "status" "SponsorshipStatus" NOT NULL DEFAULT 'requested',
    "requested_by" TEXT NOT NULL,
    "request_note" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount_minor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "duration_days" INTEGER,
    "quoted_by" TEXT,
    "quoted_at" TIMESTAMP(3),
    "quote_note" TEXT,
    "payment_verified_by" TEXT,
    "payment_verified_at" TIMESTAMP(3),
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "cancelled_by" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_sponsorships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_sponsorships_product_id_idx" ON "product_sponsorships"("product_id");

-- CreateIndex
CREATE INDEX "product_sponsorships_business_id_idx" ON "product_sponsorships"("business_id");

-- CreateIndex
CREATE INDEX "product_sponsorships_status_idx" ON "product_sponsorships"("status");

-- AddForeignKey
ALTER TABLE "product_sponsorships" ADD CONSTRAINT "product_sponsorships_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sponsorships" ADD CONSTRAINT "product_sponsorships_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
