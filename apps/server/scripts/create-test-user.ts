import { PrismaClient } from '@prisma/client'
import { generateApiKey } from '../src/auth/encryption'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.create({
    data: {
      email: 'test@opentool.dev',
      name: 'Test User',
    },
  })

  const { raw, hash, prefix } = generateApiKey()

  await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: 'Test Key',
      keyHash: hash,
      keyPrefix: prefix,
    },
  })

  console.log('✅ Test user created')
  console.log(`API Key: ${raw}`)
  console.log('Save this key — it will not be shown again')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())