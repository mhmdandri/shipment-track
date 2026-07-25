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
  const hashedPassword = await bcrypt.hash("andri244", 10);

  const user = await prisma.user.upsert({
    where: { username: "mohaproject" },
    update: {
      password: hashedPassword,
      name: "Muhamad Andriyansyah",
      role: "OWNER",
    },
    create: {
      username: "mohaproject",
      password: hashedPassword,
      name: "Muhamad Andriyansyah",
      role: "OWNER",
    },
  });

  console.log("✅ User created/updated successfully:");
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
