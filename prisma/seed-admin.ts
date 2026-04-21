import { PrismaClient } from "../src/generated/prisma/client"
import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import bcrypt from "bcryptjs"
import ws from "ws"

neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL ?? "postgresql://neondb_owner:npg_PUCTF4dIuWA0@ep-long-bar-a1qrgbvn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
})
const db = new PrismaClient({ adapter })

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@mobigrade.in"
  const password = process.env.ADMIN_PASSWORD ?? "Admin@123!"
  const firstName = "MobiGrade"
  const lastName = "Admin"

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin already exists: ${email}`)
    return
  }

  const hashed = await bcrypt.hash(password, 12)

  await db.user.create({
    data: { email, password: hashed, firstName, lastName, role: "ADMIN", isActive: true },
  })

  console.log(`✓ Admin created: ${email}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
