import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { upsertSeedAdminUser } from "../src/utils/seed-user";

dotenv.config();

const prisma = new PrismaClient();

const main = async () => {
  await upsertSeedAdminUser(prisma);

  const email = (process.env.SEED_ADMIN_EMAIL || "dwikis17@gmail.com").trim().toLowerCase();
  console.log(`Seeded admin user: ${email}`);
};

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
