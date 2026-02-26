import { db } from './src/lib/db'

async function testUpload() {
  // Check all users
  const users = await db.user.findMany()
  console.log('Available users:')
  users.forEach(u => console.log(`  - ${u.id}: ${u.email} (${u.role})`))
  
  // Try to create a test file with first user
  const userId = users[0].id
  console.log(`\nUsing user: ${userId}`)
  
  try {
    const testFile = await db.sopFile.create({
      data: {
        nomorSop: 'TEST-0001',
        judul: 'Test Upload',
        tahun: 2026,
        kategori: 'SIAGA',
        jenis: 'SOP',
        status: 'AKTIF',
        fileName: 'test.pdf',
        filePath: 'test-path',
        fileType: 'pdf',
        driveFileId: 'test-drive-id',
        uploadedBy: userId,
      }
    })
    console.log('✅ Test file created:', testFile.id)
    
    // Delete test file
    await db.sopFile.delete({ where: { id: testFile.id } })
    console.log('✅ Test file deleted')
  } catch (e) {
    console.error('❌ Error:', e)
  }
}

testUpload().then(() => process.exit(0)).catch(e => {
  console.error(e)
  process.exit(1)
})
