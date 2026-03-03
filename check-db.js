const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                profilePhoto: true
            }
        })
        console.log(JSON.stringify(users, null, 2))
    } catch (err) {
        console.error(err)
    } finally {
        await prisma.$disconnect()
    }
}

main()
