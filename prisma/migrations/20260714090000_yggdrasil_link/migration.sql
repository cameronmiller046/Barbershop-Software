-- Yggdrasil Link v2: single-row pairing record for the fleet management bridge.
-- Stores ONLY the sha256 hash of the pairing token — never the token itself.
CREATE TABLE "yggdrasil_link" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tokenHash" TEXT NOT NULL,
    "origin" TEXT,
    "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "yggdrasil_link_pkey" PRIMARY KEY ("id")
);
