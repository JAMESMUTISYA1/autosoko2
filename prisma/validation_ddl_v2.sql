CREATE TYPE "SupportMessageStatus" AS ENUM ('open','resolved');
CREATE TYPE "WithdrawalStatus" AS ENUM ('pending','approved','paid','rejected');
CREATE TYPE "AppointmentLocationType" AS ENUM ('workshop','home');
CREATE TYPE "AppointmentStatus" AS ENUM ('pending','confirmed','completed','cancelled');
CREATE TYPE "PartRequestStatus" AS ENUM ('open','fulfilled','closed');

CREATE TABLE "support_messages" (
  id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL,
  message TEXT NOT NULL, status "SupportMessageStatus" NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES users(id), resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_status ON support_messages(status);

CREATE TABLE "delivery_methods" (
  id UUID PRIMARY KEY, town_id UUID NOT NULL REFERENCES towns(id), method TEXT NOT NULL,
  provider TEXT NOT NULL, eta_days INT NOT NULL, fee_minor INT NOT NULL, active BOOLEAN NOT NULL DEFAULT true,
  added_by UUID REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "payout_methods" (
  id UUID PRIMARY KEY, business_id UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone_number TEXT, phone_verified BOOLEAN NOT NULL DEFAULT false,
  bank_name TEXT, bank_account_name TEXT, bank_account_masked TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "withdrawal_requests" (
  id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES businesses(id),
  amount_minor INT NOT NULL, currency TEXT NOT NULL, method TEXT NOT NULL, destination TEXT NOT NULL,
  status "WithdrawalStatus" NOT NULL DEFAULT 'pending', processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status);

CREATE TABLE "admin_documents" (
  id UUID PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, url TEXT NOT NULL,
  size_bytes INT, uploaded_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "service_types" (
  id UUID PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT,
  price_from_minor INT NOT NULL, location_support TEXT NOT NULL
);

CREATE TABLE "mechanics" (
  id UUID PRIMARY KEY, name TEXT NOT NULL, specialties JSONB NOT NULL,
  rating_avg DOUBLE PRECISION NOT NULL DEFAULT 0, rating_count INT NOT NULL DEFAULT 0,
  town_id UUID REFERENCES towns(id), verified BOOLEAN NOT NULL DEFAULT false, mobile_available BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE "appointments" (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id),
  service_type_id UUID REFERENCES service_types(id), mechanic_id UUID REFERENCES mechanics(id),
  location_type "AppointmentLocationType" NOT NULL, address TEXT, scheduled_for TIMESTAMPTZ NOT NULL,
  vehicle_info TEXT NOT NULL, phone TEXT NOT NULL, notes TEXT,
  status "AppointmentStatus" NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "part_requests" (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL, description TEXT, part_number TEXT, image_url TEXT, vehicle_info TEXT,
  town_id UUID REFERENCES towns(id), status "PartRequestStatus" NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_part_requests_status ON part_requests(status);

CREATE TABLE "part_request_responses" (
  id UUID PRIMARY KEY, part_request_id UUID NOT NULL REFERENCES part_requests(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id), message TEXT NOT NULL,
  price_minor INT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
