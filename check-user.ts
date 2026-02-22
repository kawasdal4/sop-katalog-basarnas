import { db } from './src/lib/db'

async function checkUsers() {
  const users = await db.user.findMany()
  console.log('Users in database:')
  users.forEach(u => {
    console.log(`  - ${u.email} (${u.id}) - role: ${u.role}`)
  })
  
  const counter = await db.counter.findUnique({ where: { id: 'counter' } })
  console.log('\nCounter:', counter)
}

checkUsers().then(() => process.exit(0)).catch(e => {
  console.error(e)
  process.exit(1)
})
