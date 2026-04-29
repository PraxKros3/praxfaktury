-- CreateTable
CREATE TABLE "ManualEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "serviceName" TEXT NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ManualEntry" ADD CONSTRAINT "ManualEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualEntry" ADD CONSTRAINT "ManualEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualEntry" ADD CONSTRAINT "ManualEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
