-- CreateTable
CREATE TABLE "order_payouts" (
    "order_id" TEXT NOT NULL,
    "withdrawal_request_id" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payouts_pkey" PRIMARY KEY ("order_id","withdrawal_request_id")
);

-- AddForeignKey
ALTER TABLE "order_payouts" ADD CONSTRAINT "order_payouts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payouts" ADD CONSTRAINT "order_payouts_withdrawal_request_id_fkey" FOREIGN KEY ("withdrawal_request_id") REFERENCES "withdrawal_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
