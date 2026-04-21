import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

// Load .env manually
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
  if (m) {
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
});

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const hash = await bcrypt.hash("Admin@123", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@mobigrade.in" },
    update: {},
    create: {
      fullName: "MobiGrade Admin",
      email: "admin@mobigrade.in",
      mobile: "9999999999",
      passwordHash: hash,
      role: "ADMIN",
      verificationStatus: "KYC_APPROVED",
    },
    select: { email: true, role: true, verificationStatus: true },
  });

  console.log("✓ Admin user ready:", user);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
