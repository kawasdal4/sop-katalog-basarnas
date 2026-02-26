import { db } from './src/lib/db'

async function checkFiles() {
  const files = await db.sopFile.findMany({
    select: { id: true, fileName: true, driveFileId: true, filePath: true }
  })
  
  console.log('Total files:', files.length)
  console.log('\nFiles without driveFileId:')
  files.filter(f => !f.driveFileId).forEach(f => {
    console.log(`  - ${f.fileName} (${f.id})`)
  })
  
  console.log('\nFiles with driveFileId:')
  files.filter(f => f.driveFileId).forEach(f => {
    console.log(`  - ${f.fileName} (${f.id}): ${f.driveFileId}`)
  })
}

checkFiles().then(() => process.exit(0)).catch(e => {
  console.error(e)
  process.exit(1)
})
