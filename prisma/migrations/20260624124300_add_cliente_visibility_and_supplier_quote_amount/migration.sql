-- AlterTable
ALTER TABLE "varianti_lavoro" ADD COLUMN "visibile_cliente" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "richieste_preventivi_fornitori" ADD COLUMN "importo" INTEGER;
