-- Hand-translated from prisma/schema.prisma, for local validation only.
-- This file is NOT used by the app — Prisma generates real migrations
-- from schema.prisma once `prisma migrate dev` can run against Neon
-- (i.e. outside this network-restricted sandbox). This exists purely to
-- prove the relational design itself is valid Postgres before shipping.

-- ===================== ENUMS =====================
CREATE TYPE "UserStatus" AS ENUM ('active','suspended','banned');
CREATE TYPE "BusinessType" AS ENUM ('dealer','garage','importer','manufacturer','wholesaler','distributor','fleet','insurance','transport','individual_seller');
CREATE TYPE "VerificationStatus" AS ENUM ('unverified','pending','verified','rejected');
CREATE TYPE "AccountStatus" AS ENUM ('active','suspended','banned');
CREATE TYPE "FuelType" AS ENUM ('petrol','diesel','hybrid','electric');
CREATE TYPE "TransmissionType" AS ENUM ('manual','automatic','cvt');
CREATE TYPE "DriveType" AS ENUM ('fwd','rwd','awd','four_wd');
CREATE TYPE "BodyType" AS ENUM ('sedan','hatchback','suv','pickup','van','truck','motorcycle');
CREATE TYPE "ProductCondition" AS ENUM ('new','used','refurbished');
CREATE TYPE "ProductStatus" AS ENUM ('draft','active','out_of_stock','archived');
CREATE TYPE "OrderStatus" AS ENUM ('pending','confirmed','processing','shipped','delivered','cancelled','refunded','disputed');
CREATE TYPE "DeliveryMethodType" AS ENUM ('pickup','courier','cross_border');
CREATE TYPE "PaymentProviderType" AS ENUM ('mpesa','airtel_money','mtn_momo','tigo_pesa','halopesa','card','bank_transfer','wallet');
CREATE TYPE "PaymentStatus" AS ENUM ('pending','completed','failed','refunded');
CREATE TYPE "MessageType" AS ENUM ('text','quotation_request','offer','counter_offer','system');
CREATE TYPE "ReviewStatus" AS ENUM ('published','flagged','removed');
CREATE TYPE "NotificationChannel" AS ENUM ('in_app','email','sms','whatsapp','push');
CREATE TYPE "RoleScope" AS ENUM ('platform','business');

-- ===================== REFERENCE DATA =====================
CREATE TABLE "countries" (
  id UUID PRIMARY KEY, name TEXT NOT NULL, iso_code TEXT UNIQUE NOT NULL,
  currency_default TEXT NOT NULL, phone_prefix TEXT NOT NULL,
  is_active_for_launch BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE "regions" (
  id UUID PRIMARY KEY, country_id UUID NOT NULL REFERENCES countries(id), name TEXT NOT NULL
);

CREATE TABLE "towns" (
  id UUID PRIMARY KEY, region_id UUID NOT NULL REFERENCES regions(id), name TEXT NOT NULL
);

CREATE TABLE "tax_rules" (
  id UUID PRIMARY KEY, country_id UUID NOT NULL REFERENCES countries(id),
  name TEXT NOT NULL, rate_percent DOUBLE PRECISION NOT NULL, is_inclusive BOOLEAN NOT NULL DEFAULT true
);

-- ===================== IDENTITY =====================
CREATE TABLE "users" (
  id UUID PRIMARY KEY, email CITEXT UNIQUE, phone TEXT UNIQUE,
  phone_verified_at TIMESTAMPTZ, email_verified_at TIMESTAMPTZ,
  password_hash TEXT, full_name TEXT NOT NULL, avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en', preferred_currency TEXT,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false, two_factor_secret TEXT,
  status "UserStatus" NOT NULL DEFAULT 'active', last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_users_status ON users(status);

CREATE TABLE "oauth_accounts" (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, provider_account_id TEXT NOT NULL,
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE "roles" (
  id UUID PRIMARY KEY, name TEXT NOT NULL, scope "RoleScope" NOT NULL,
  is_system_role BOOLEAN NOT NULL DEFAULT false, UNIQUE(name, scope)
);

CREATE TABLE "permissions" (
  id UUID PRIMARY KEY, key TEXT UNIQUE NOT NULL, description TEXT
);

CREATE TABLE "role_permissions" (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE "businesses" (
  id UUID PRIMARY KEY, owner_user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, business_type "BusinessType" NOT NULL,
  logo_url TEXT, banner_url TEXT, description TEXT,
  country_id UUID NOT NULL REFERENCES countries(id),
  region_id UUID REFERENCES regions(id), town_id UUID REFERENCES towns(id),
  physical_address TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  email TEXT, phone TEXT, whatsapp TEXT, website TEXT,
  registration_number TEXT, tax_pin TEXT,
  verification_status "VerificationStatus" NOT NULL DEFAULT 'unverified',
  verification_documents JSONB, rating_avg DOUBLE PRECISION NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0, follower_count INT NOT NULL DEFAULT 0,
  status "AccountStatus" NOT NULL DEFAULT 'active', home_currency TEXT NOT NULL DEFAULT 'KES',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_businesses_country ON businesses(country_id);
CREATE INDEX idx_businesses_verification ON businesses(verification_status);

CREATE TABLE "business_members" (
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  invited_by UUID, joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  PRIMARY KEY (business_id, user_id)
);

CREATE TABLE "business_branches" (
  id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, address TEXT, town_id UUID REFERENCES towns(id),
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, phone TEXT,
  opening_hours JSONB, is_primary BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE "addresses" (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT, recipient_name TEXT, phone TEXT, address_line TEXT NOT NULL,
  town_id UUID REFERENCES towns(id), is_default BOOLEAN NOT NULL DEFAULT false
);

-- ===================== VEHICLE COMPATIBILITY =====================
CREATE TABLE "vehicle_makes" (
  id UUID PRIMARY KEY, name TEXT UNIQUE NOT NULL, slug TEXT UNIQUE NOT NULL, logo_url TEXT
);

CREATE TABLE "vehicle_models" (
  id UUID PRIMARY KEY, make_id UUID NOT NULL REFERENCES vehicle_makes(id) ON DELETE CASCADE,
  name TEXT NOT NULL, slug TEXT NOT NULL, UNIQUE(make_id, slug)
);

CREATE TABLE "vehicle_generations" (
  id UUID PRIMARY KEY, model_id UUID NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL, year_start INT NOT NULL, year_end INT
);

CREATE TABLE "vehicle_trims" (
  id UUID PRIMARY KEY, generation_id UUID NOT NULL REFERENCES vehicle_generations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, engine_code TEXT, engine_displacement_cc INT,
  fuel_type "FuelType", transmission "TransmissionType", drive_type "DriveType", body_type "BodyType"
);

-- ===================== CATALOG =====================
CREATE TABLE "categories" (
  id UUID PRIMARY KEY, parent_id UUID REFERENCES categories(id),
  name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, icon_url TEXT,
  sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "products" (
  id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES businesses(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL, slug TEXT NOT NULL,
  short_description TEXT, long_description TEXT, brand TEXT, manufacturer TEXT,
  oem_number TEXT, part_number TEXT, sku TEXT, barcode TEXT,
  price_minor INT NOT NULL, currency TEXT NOT NULL DEFAULT 'KES',
  wholesale_price_minor INT, moq INT NOT NULL DEFAULT 1,
  stock_quantity INT NOT NULL DEFAULT 0, track_inventory BOOLEAN NOT NULL DEFAULT true,
  condition "ProductCondition" NOT NULL, warranty_months INT,
  weight_grams INT, length_mm INT, width_mm INT, height_mm INT,
  status "ProductStatus" NOT NULL DEFAULT 'draft', view_count INT NOT NULL DEFAULT 0,
  youtube_url TEXT, fitting_instructions TEXT, tools_needed JSONB, sponsored BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(business_id, slug)
);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_oem ON products(oem_number);
CREATE INDEX idx_products_part ON products(part_number);
CREATE INDEX idx_products_status ON products(status);

CREATE TABLE "product_images" (
  id UUID PRIMARY KEY, product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0, is_primary BOOLEAN NOT NULL DEFAULT false, alt_text TEXT
);

CREATE TABLE "product_variants" (
  id UUID PRIMARY KEY, product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT, price_minor_override INT, stock_quantity INT NOT NULL DEFAULT 0, attributes JSONB
);

CREATE TABLE "product_documents" (
  id UUID PRIMARY KEY, product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL, type TEXT NOT NULL, title TEXT
);

CREATE TABLE "product_vehicle_compatibility" (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vehicle_trim_id UUID NOT NULL REFERENCES vehicle_trims(id) ON DELETE CASCADE,
  year_start INT, year_end INT, notes TEXT, verified_by UUID,
  PRIMARY KEY (product_id, vehicle_trim_id)
);
CREATE INDEX idx_pvc_trim_product ON product_vehicle_compatibility(vehicle_trim_id, product_id);

-- ===================== COMMERCE =====================
CREATE TABLE "carts" (
  id UUID PRIMARY KEY, user_id UUID REFERENCES users(id), session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "cart_items" (
  id UUID PRIMARY KEY, cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id), quantity INT NOT NULL
);

CREATE TABLE "orders" (
  id UUID PRIMARY KEY, buyer_id UUID NOT NULL REFERENCES users(id),
  business_id UUID NOT NULL REFERENCES businesses(id), order_number TEXT UNIQUE NOT NULL,
  status "OrderStatus" NOT NULL DEFAULT 'pending',
  subtotal_minor INT NOT NULL, shipping_minor INT NOT NULL DEFAULT 0,
  tax_minor INT NOT NULL DEFAULT 0, total_minor INT NOT NULL, currency TEXT NOT NULL DEFAULT 'KES',
  shipping_address_id UUID REFERENCES addresses(id), delivery_method "DeliveryMethodType" NOT NULL,
  notes TEXT, payment_verified BOOLEAN NOT NULL DEFAULT false,
  payment_verified_by UUID, payment_verified_at TIMESTAMPTZ,
  delivered_confirmed_by UUID, delivered_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_business_status ON orders(business_id, status);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);

CREATE TABLE "order_items" (
  id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id), product_variant_id UUID REFERENCES product_variants(id),
  quantity INT NOT NULL, unit_price_minor INT NOT NULL, subtotal_minor INT NOT NULL
);

CREATE TABLE "order_status_history" (
  id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status "OrderStatus" NOT NULL, changed_by UUID, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "payment_providers" (
  id UUID PRIMARY KEY, country_id UUID NOT NULL REFERENCES countries(id),
  name TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true, config JSONB
);

CREATE TABLE "payments" (
  id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES orders(id),
  provider "PaymentProviderType" NOT NULL, provider_transaction_id TEXT,
  amount_minor INT NOT NULL, currency TEXT NOT NULL, status "PaymentStatus" NOT NULL DEFAULT 'pending',
  raw_provider_response JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_provider_txn ON payments(provider_transaction_id);

CREATE TABLE "escrow_holds" (
  id UUID PRIMARY KEY, order_id UUID UNIQUE NOT NULL REFERENCES orders(id),
  amount_minor INT NOT NULL, status TEXT NOT NULL DEFAULT 'held', released_at TIMESTAMPTZ
);

CREATE TABLE "coupons" (
  id UUID PRIMARY KEY, business_id UUID REFERENCES businesses(id), code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL, value INT NOT NULL, min_order_minor INT,
  usage_limit INT, used_count INT NOT NULL DEFAULT 0, expires_at TIMESTAMPTZ
);

-- ===================== MESSAGING & TRUST =====================
CREATE TABLE "conversations" (
  id UUID PRIMARY KEY, buyer_id UUID NOT NULL REFERENCES users(id),
  business_id UUID NOT NULL REFERENCES businesses(id), product_id UUID REFERENCES products(id),
  last_message_at TIMESTAMPTZ
);

CREATE TABLE "messages" (
  id UUID PRIMARY KEY, conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id), body TEXT NOT NULL, attachments JSONB,
  read_at TIMESTAMPTZ, message_type "MessageType" NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "product_reviews" (
  id UUID PRIMARY KEY, product_id UUID NOT NULL REFERENCES products(id),
  order_id UUID, buyer_id UUID NOT NULL REFERENCES users(id), rating INT NOT NULL,
  title TEXT, body TEXT, is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  helpful_count INT NOT NULL DEFAULT 0, status "ReviewStatus" NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "business_reviews" (
  id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES businesses(id),
  buyer_id UUID NOT NULL REFERENCES users(id), rating INT NOT NULL,
  title TEXT, body TEXT, is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  helpful_count INT NOT NULL DEFAULT 0, status "ReviewStatus" NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "wishlists" (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE "saved_searches" (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query JSONB NOT NULL, name TEXT, alert_enabled BOOLEAN NOT NULL DEFAULT false
);

-- ===================== PLATFORM =====================
CREATE TABLE "audit_logs" (
  id UUID PRIMARY KEY, actor_id UUID REFERENCES users(id), action TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, before JSONB, after JSONB,
  ip_address TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);

CREATE TABLE "notifications" (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, title TEXT NOT NULL, body TEXT, is_read BOOLEAN NOT NULL DEFAULT false,
  channel "NotificationChannel" NOT NULL DEFAULT 'in_app', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
