-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('active', 'cancelled');

-- CreateTable
CREATE TABLE "Slot" (
    "id" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Slot_endsAt_after_startsAt" CHECK ("endsAt" > "startsAt")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMPTZ(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Slot_startsAt_id_idx" ON "Slot"("startsAt", "id");

-- CreateIndex
CREATE INDEX "Booking_slotId_idx" ON "Booking"("slotId");

-- Double-booking guard: at most one ACTIVE booking per slot.
-- Cancelled bookings are excluded, so a slot can be re-booked after cancellation
-- while its old cancelled bookings stay in the table.
-- Not expressible in schema.prisma, hence hand-written here.
CREATE UNIQUE INDEX "Booking_one_active_per_slot" ON "Booking"("slotId") WHERE "status" = 'active';

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
