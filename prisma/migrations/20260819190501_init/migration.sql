-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'banned');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('platform', 'business');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('dealer', 'garage', 'importer', 'manufacturer', 'wholesaler', 'distributor', 'fleet', 'insurance', 'transport', 'individual_seller');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('unverified', 'pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended', 'banned');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('petrol', 'diesel', 'hybrid', 'electric');

-- CreateEnum
CREATE TYPE "TransmissionType" AS ENUM ('manual', 'automatic', 'cvt');

-- CreateEnum
CREATE TYPE "DriveType" AS ENUM ('fwd', 'rwd', 'awd', 'four_wd');

-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('sedan', 'hatchback', 'suv', 'pickup', 'van', 'truck', 'motorcycle');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('new', 'used', 'refurbished');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'active', 'out_of_stock', 'archived');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'disputed');

-- CreateEnum
CREATE TYPE "DeliveryMethodType" AS ENUM ('pickup', 'courier', 'cross_border');

-- CreateEnum
CREATE TYPE "PaymentProviderType" AS ENUM ('mpesa', 'airtel_money', 'mtn_momo', 'tigo_pesa', 'halopesa', 'card', 'bank_transfer', 'wallet');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'quotation_request', 'offer', 'counter_offer', 'system');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('published', 'flagged', 'removed');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'email', 'sms', 'whatsapp', 'push');

-- CreateEnum
CREATE TYPE "PartRequestStatus" AS ENUM ('open', 'fulfilled', 'closed');

-- CreateEnum
CREATE TYPE "SupportMessageStatus" AS ENUM ('open', 'resolved');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('pending', 'approved', 'paid', 'rejected');

-- CreateEnum
CREATE TYPE "AppointmentLocationType" AS ENUM ('workshop', 'home');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "phone_verified_at" TIMESTAMP(3),
    "email_verified_at" TIMESTAMP(3),
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "preferred_currency" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "business_type" "BusinessType" NOT NULL,
    "logo_url" TEXT,
    "banner_url" TEXT,
    "description" TEXT,
    "country_id" TEXT NOT NULL,
    "region_id" TEXT,
    "town_id" TEXT,
    "physical_address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "registration_number" TEXT,
    "tax_pin" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'unverified',
    "verification_documents" JSONB,
    "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "follower_count" INTEGER NOT NULL DEFAULT 0,
    "status" "AccountStatus" NOT NULL DEFAULT 'active',
    "home_currency" TEXT NOT NULL DEFAULT 'KES',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_members" (
    "business_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "invited_by" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "business_members_pkey" PRIMARY KEY ("business_id","user_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "RoleScope" NOT NULL,
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "business_branches" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "town_id" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "opening_hours" JSONB,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "business_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_makes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,

    CONSTRAINT "vehicle_makes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_models" (
    "id" TEXT NOT NULL,
    "make_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "vehicle_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_generations" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year_start" INTEGER NOT NULL,
    "year_end" INTEGER,

    CONSTRAINT "vehicle_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_trims" (
    "id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "engine_code" TEXT,
    "engine_displacement_cc" INTEGER,
    "fuel_type" "FuelType",
    "transmission" "TransmissionType",
    "drive_type" "DriveType",
    "body_type" "BodyType",

    CONSTRAINT "vehicle_trims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_vehicle_compatibility" (
    "product_id" TEXT NOT NULL,
    "vehicle_trim_id" TEXT NOT NULL,
    "year_start" INTEGER,
    "year_end" INTEGER,
    "notes" TEXT,
    "verified_by" TEXT,

    CONSTRAINT "product_vehicle_compatibility_pkey" PRIMARY KEY ("product_id","vehicle_trim_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_description" TEXT,
    "long_description" TEXT,
    "brand" TEXT,
    "manufacturer" TEXT,
    "oem_number" TEXT,
    "part_number" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "price_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "wholesale_price_minor" INTEGER,
    "moq" INTEGER NOT NULL DEFAULT 1,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "track_inventory" BOOLEAN NOT NULL DEFAULT true,
    "condition" "ProductCondition" NOT NULL,
    "warranty_months" INTEGER,
    "weight_grams" INTEGER,
    "length_mm" INTEGER,
    "width_mm" INTEGER,
    "height_mm" INTEGER,
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "youtube_url" TEXT,
    "fitting_instructions" TEXT,
    "tools_needed" JSONB,
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "alt_text" TEXT,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku" TEXT,
    "price_minor_override" INTEGER,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "attributes" JSONB,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_documents" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,

    CONSTRAINT "product_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "subtotal_minor" INTEGER NOT NULL,
    "shipping_minor" INTEGER NOT NULL DEFAULT 0,
    "tax_minor" INTEGER NOT NULL DEFAULT 0,
    "total_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "shipping_address_id" TEXT,
    "delivery_method" "DeliveryMethodType" NOT NULL,
    "notes" TEXT,
    "payment_verified" BOOLEAN NOT NULL DEFAULT false,
    "payment_verified_by" TEXT,
    "payment_verified_at" TIMESTAMP(3),
    "delivered_confirmed_by" TEXT,
    "delivered_confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_variant_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "subtotal_minor" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "changed_by" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "provider_transaction_id" TEXT,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "raw_provider_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_providers" (
    "id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,

    CONSTRAINT "payment_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_holds" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'held',
    "released_at" TIMESTAMP(3),

    CONSTRAINT "escrow_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "business_id" TEXT,
    "code" TEXT NOT NULL,
    "discount_type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "min_order_minor" INTEGER,
    "usage_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "product_id" TEXT,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "read_at" TIMESTAMP(3),
    "message_type" "MessageType" NOT NULL DEFAULT 'text',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "order_id" TEXT,
    "buyer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "status" "ReviewStatus" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_reviews" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "status" "ReviewStatus" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("user_id","product_id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "name" TEXT,
    "alert_enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iso_code" TEXT NOT NULL,
    "currency_default" TEXT NOT NULL,
    "phone_prefix" TEXT NOT NULL,
    "is_active_for_launch" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "towns" (
    "id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "towns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rules" (
    "id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate_percent" DOUBLE PRECISION NOT NULL,
    "is_inclusive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT,
    "recipient_name" TEXT,
    "phone" TEXT,
    "address_line" TEXT NOT NULL,
    "town_id" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'in_app',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "description" TEXT,
    "part_number" TEXT,
    "image_url" TEXT,
    "vehicle_info" TEXT,
    "town_id" TEXT,
    "status" "PartRequestStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_request_responses" (
    "id" TEXT NOT NULL,
    "part_request_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "price_minor" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_request_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportMessageStatus" NOT NULL DEFAULT 'open',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_methods" (
    "id" TEXT NOT NULL,
    "town_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eta_days" INTEGER NOT NULL,
    "fee_minor" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "added_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_methods" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "phone_number" TEXT,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "bank_name" TEXT,
    "bank_account_name" TEXT,
    "bank_account_masked" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'pending',
    "processed_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price_from_minor" INTEGER NOT NULL,
    "location_support" TEXT NOT NULL,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mechanics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialties" JSONB NOT NULL,
    "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "town_id" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "mobile_available" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mechanics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_type_id" TEXT,
    "mechanic_id" TEXT,
    "location_type" "AppointmentLocationType" NOT NULL,
    "address" TEXT,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "vehicle_info" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE INDEX "businesses_country_id_idx" ON "businesses"("country_id");

-- CreateIndex
CREATE INDEX "businesses_verification_status_idx" ON "businesses"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_scope_key" ON "roles"("name", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_makes_name_key" ON "vehicle_makes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_makes_slug_key" ON "vehicle_makes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_models_make_id_slug_key" ON "vehicle_models"("make_id", "slug");

-- CreateIndex
CREATE INDEX "product_vehicle_compatibility_vehicle_trim_id_product_id_idx" ON "product_vehicle_compatibility"("vehicle_trim_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "products_business_id_idx" ON "products"("business_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_oem_number_idx" ON "products"("oem_number");

-- CreateIndex
CREATE INDEX "products_part_number_idx" ON "products"("part_number");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "products_business_id_slug_key" ON "products"("business_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_business_id_status_idx" ON "orders"("business_id", "status");

-- CreateIndex
CREATE INDEX "orders_buyer_id_idx" ON "orders"("buyer_id");

-- CreateIndex
CREATE INDEX "payments_provider_transaction_id_idx" ON "payments"("provider_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_holds_order_id_key" ON "escrow_holds"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso_code_key" ON "countries"("iso_code");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "part_requests_status_idx" ON "part_requests"("status");

-- CreateIndex
CREATE INDEX "support_messages_status_idx" ON "support_messages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payout_methods_business_id_key" ON "payout_methods"("business_id");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "service_types_slug_key" ON "service_types"("slug");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_branches" ADD CONSTRAINT "business_branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_branches" ADD CONSTRAINT "business_branches_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_make_id_fkey" FOREIGN KEY ("make_id") REFERENCES "vehicle_makes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_generations" ADD CONSTRAINT "vehicle_generations_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "vehicle_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_trims" ADD CONSTRAINT "vehicle_trims_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "vehicle_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_vehicle_compatibility" ADD CONSTRAINT "product_vehicle_compatibility_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_vehicle_compatibility" ADD CONSTRAINT "product_vehicle_compatibility_vehicle_trim_id_fkey" FOREIGN KEY ("vehicle_trim_id") REFERENCES "vehicle_trims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_providers" ADD CONSTRAINT "payment_providers_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "towns" ADD CONSTRAINT "towns_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_request_responses" ADD CONSTRAINT "part_request_responses_part_request_id_fkey" FOREIGN KEY ("part_request_id") REFERENCES "part_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_request_responses" ADD CONSTRAINT "part_request_responses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_methods" ADD CONSTRAINT "delivery_methods_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_methods" ADD CONSTRAINT "delivery_methods_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_methods" ADD CONSTRAINT "payout_methods_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_documents" ADD CONSTRAINT "admin_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanics" ADD CONSTRAINT "mechanics_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "mechanics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
