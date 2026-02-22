import { db } from './src/lib/db'

async function checkSession() {
  // Check all users
  const users = await db.user.findMany()
  console.log('Users in database:')
  users.forEach(u => {
    console.log(`  - ID: ${u.id}`)
    console.log(`    Email: ${u.email}`)
    console.log(`    Role: ${u.role}`)
    console.log('')
  })
  
  // Check if there's any orphan records
  const sops = await db.sopFile.findMany({
    select: { uploadedBy: true }
  })
  
  const uploaderIds = [...new Set(sops.map(s => s.uploadedBy))]
  console.log('Uploader IDs in SopFile:')
  uploaderIds.forEach(id => {
    const user = users.find(u => u.id === id)
    console.log(`  - ${id} -> ${user ? user.email : 'NOT FOUND!'}`)
  })
}

checkSession().then(() => process.exit(0)).catch(e => {
  console.error(e)
  process.exit(1)
})
