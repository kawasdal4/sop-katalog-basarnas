import { db } from './src/lib/db'

async function fixCounter() {
  // Get all SOP and IK files
  const files = await db.sopFile.findMany({
    select: { nomorSop: true, jenis: true }
  })
  
  // Find max SOP and IK numbers
  let maxSop = 0
  let maxIk = 0
  
  files.forEach(f => {
    const num = parseInt(f.nomorSop.replace(/[^\d]/g, ''))
    if (f.jenis === 'SOP' && num > maxSop) maxSop = num
    if (f.jenis === 'IK' && num > maxIk) maxIk = num
  })
  
  console.log(`Current max: SOP-${maxSop}, IK-${maxIk}`)
  
  // Update counter
  await db.counter.upsert({
    where: { id: 'counter' },
    update: { sopCount: maxSop, ikCount: maxIk },
    create: { id: 'counter', sopCount: maxSop, ikCount: maxIk }
  })
  
  console.log('✅ Counter updated!')
  
  const newCounter = await db.counter.findUnique({ where: { id: 'counter' } })
  console.log('New counter:', newCounter)
}

fixCounter().then(() => process.exit(0)).catch(e => {
  console.error(e)
  process.exit(1)
})
