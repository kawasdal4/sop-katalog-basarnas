import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const { operations } = await req.json()

    if (!Array.isArray(operations)) {
      return NextResponse.json({ error: 'Invalid operations format' }, { status: 400 })
    }

    const results: any[] = []

    for (const op of operations) {
      const { id, table, action, data, timestamp } = op

      try {
        let result
        const tableMap: any = {
          'sop_files': prisma.sopFile,
          'sop_pembuatan': prisma.sopPembuatan,
          'sop_langkah': prisma.sopLangkah,
          'sop_flowchart': prisma.sopFlowchart,
          'logs': prisma.log
        }

        const model = tableMap[table]
        if (!model) {
          results.push({ id, status: 'error', error: `Unknown table: ${table}` })
          continue
        }

        // Conflict Resolution: Latest Timestamp Wins
        // For UPDATE/DELETE, we check if the server version is newer
        const existing = await model.findUnique({ where: { id: (data.id || id) } })
        
        if (existing && existing.updatedAt && new Date(existing.updatedAt) > new Date(timestamp)) {
          results.push({ id, status: 'conflict', serverData: existing })
          continue
        }

        switch (action) {
          case 'CREATE':
          case 'UPDATE':
            result = await model.upsert({
              where: { id: data.id || id },
              create: data,
              update: data
            })
            break
          case 'DELETE':
            if (existing) {
              result = await model.delete({
                where: { id: data.id || id }
              })
            } else {
              // Already deleted or never existed
              results.push({ id, status: 'success', note: 'already_deleted' })
              continue
            }
            break
          default:
            throw new Error(`Unknown action: ${action}`)
        }

        results.push({ id, status: 'success', serverId: result.id })
      } catch (err: any) {
        console.error(`Sync error for operation ${id}:`, err)
        results.push({ id, status: 'error', error: err.message })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Batch sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lastSyncAt = searchParams.get('lastSyncAt')
    
    // Fetch all relevant data for synchronization
    const where = lastSyncAt ? { updatedAt: { gt: new Date(lastSyncAt) } } : {}
    
    const [sopFiles, sopPembuatan, sopLangkah, sopFlowchart] = await Promise.all([
      prisma.sopFile.findMany({ where }),
      prisma.sopPembuatan.findMany({ where }),
      prisma.sopLangkah.findMany({ where }),
      prisma.sopFlowchart.findMany({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        sop_files: sopFiles,
        sop_pembuatan: sopPembuatan,
        sop_langkah: sopLangkah,
        sop_flowchart: sopFlowchart
      }
    })
  } catch (error: any) {
    console.error('Pull sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
