import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "../app/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.SEED_USERNAME;
  const rawPassword = process.env.SEED_PASSWORD;
  const name = process.env.SEED_NAME || "Administrator";
  const role = process.env.SEED_ROLE || "OWNER";

  if (!username || !rawPassword) {
    console.error(
      "❌ Error: SEED_USERNAME and SEED_PASSWORD environment variables are required."
    );
    console.error(
      "Usage: SEED_USERNAME=myadmin SEED_PASSWORD=SuperSecretPassword123! npx tsx scripts/seed-user.ts"
    );
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      name,
      role,
    },
    create: {
      username,
      password: hashedPassword,
      name,
      role,
    },
  });

  console.log("✅ Seed user created/updated successfully:");
  console.log({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });
}

main()
  .catch((e) => {
    console.error("Error seeding user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
