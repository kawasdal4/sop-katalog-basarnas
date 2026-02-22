import { db } from './src/lib/db'

async function checkNomor() {
  const files = await db.sopFile.findMany({
    select: { nomorSop: true, fileName: true }
  })
  
  console.log('Nomor SOP in database:')
  files.forEach(f => {
    console.log(`  - ${f.nomorSop} -> ${f.fileName}`)
  })
  
  // Check for duplicates
  const nomorList = files.map(f => f.nomorSop)
  const duplicates = nomorList.filter((n, i) => nomorList.indexOf(n) !== i)
  if (duplicates.length > 0) {
    console.log('\n⚠️ DUPLICATES:', duplicates)
  }
}

checkNomor().then(() => process.exit(0)).catch(e => {
  console.error(e)
  process.exit(1)
})
