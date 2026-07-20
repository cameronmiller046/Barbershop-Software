import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Load .env when present (local dev); on prod the vars are already in the env.
try { process.loadEnvFile(); } catch { /* no .env file — using the ambient environment */ }

// Idempotently create/refresh the hidden SUPERUSER dev-debug account WITHOUT
// touching any other data — safe to run on production (unlike the full seed,
// which resets demo data). Requires SUPERUSER_PASSWORD in the environment.
//   SUPERUSER_PASSWORD=... npm run db:superuser
const prisma = new PrismaClient();

async function main() {
  const password = process.env.SUPERUSER_PASSWORD;
  if (!password) {
    console.error("✗ Set SUPERUSER_PASSWORD before running this.");
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email: "superuser" },
    update: { role: "SUPERUSER", name: "Superuser", active: true, tenantId: null, passwordHash },
    create: { email: "superuser", name: "Superuser", role: "SUPERUSER", active: true, passwordHash },
  });
  console.log("✓ Superuser ready — log in with 'superuser' and SUPERUSER_PASSWORD.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
