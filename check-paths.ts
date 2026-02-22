import { db } from './src/lib/db'
import fs from 'fs'

async function checkFiles() {
  const files = await db.sopFile.findMany({
    select: { id: true, fileName: true, filePath: true, driveFileId: true }
  })
  
  console.log('Checking files:\n')
  for (const f of files) {
    const exists = f.filePath ? fs.existsSync(f.filePath) : false
    const size = exists ? fs.statSync(f.filePath).size : 0
    console.log(`${f.fileName}`)
    console.log(`  - ID: ${f.id}`)
    console.log(`  - Path: ${f.filePath || 'NULL'}`)
    console.log(`  - Drive ID: ${f.driveFileId || 'NULL'}`)
    console.log(`  - File exists: ${exists}`)
    console.log(`  - File size: ${size} bytes`)
    console.log('')
  }
}

checkFiles().then(() => process.exit(0)).catch(e => {
  console.error(e)
  process.exit(1)
})
