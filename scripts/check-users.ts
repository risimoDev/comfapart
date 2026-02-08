import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      role: true,
      status: true,
      telegramVerified: true,
      telegramId: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  console.log('\n=== USERS ===')
  users.forEach(user => {
    console.log(`
ID: ${user.id}
Email: ${user.email}
Name: ${user.firstName}
Role: ${user.role}
Status: ${user.status}
Telegram Verified: ${user.telegramVerified}
Telegram ID: ${user.telegramId ? user.telegramId.toString() : 'null'}
Created: ${user.createdAt}
---`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
