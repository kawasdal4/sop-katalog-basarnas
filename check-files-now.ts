import { db } from './src/lib/db'

async function check() {
  const files = await db.sopFile.findMany({
    select: { 
      id: true, 
      fileName: true, 
      driveFileId: true,
      fileType: true 
    },
    orderBy: { uploadedAt: 'desc' },
    take: 5
  })
  
  console.log('Recent files:')
  files.forEach(f => {
    const ext = f.fileName.toLowerCase().split('.').pop()
    console.log(`  ${f.fileName}`)
    console.log(`    - Extension: ${ext}`)
    console.log(`    - FileType in DB: ${f.fileType}`)
    console.log(`    - Drive ID: ${f.driveFileId || 'NULL'}`)
    console.log(`    - Is PDF: ${ext === 'pdf'}`)
    console.log('')
  })
}

check().then(() => process.exit(0))
