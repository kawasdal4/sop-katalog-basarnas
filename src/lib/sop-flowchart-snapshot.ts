import { randomUUID } from 'crypto'
import { db } from '@/lib/db'

type StepInput = {
    order?: number
    stepType?: string
    nextStepYes?: number | string | null
    nextStepNo?: number | string | null
}

const toNumberOrNull = (value: unknown) => {
    if (value === undefined || value === null || value === '') return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
}

const normalizeStepSnapshot = (step: StepInput, index: number) => ({
    order: toNumberOrNull(step?.order) ?? index + 1,
    stepType: typeof step?.stepType === 'string' && step.stepType.length > 0 ? step.stepType : 'process',
    nextStepYes: toNumberOrNull(step?.nextStepYes),
    nextStepNo: toNumberOrNull(step?.nextStepNo),
})

const parseFlowchartJson = (raw: unknown) => {
    if (typeof raw !== 'string' || raw.length === 0) return {}
    try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') return parsed as Record<string, any>
        return {}
    } catch {
        return {}
    }
}

const isSqlite = () => (process.env.DATABASE_URL || '').startsWith('file:')

const readFlowchartJson = async (sopId: string) => {
    try {
        if (isSqlite()) {
            const rows = await db.$queryRawUnsafe(
                `SELECT "flowchartJson" FROM "SopFlowchart" WHERE "sopId" = ? LIMIT 1`,
                sopId
            ) as Array<{ flowchartJson?: string | null }>
            return rows?.[0]?.flowchartJson || ''
        }
        const rows = await db.$queryRawUnsafe(
            `SELECT "flowchartJson" FROM "SopFlowchart" WHERE "sopId" = $1 LIMIT 1`,
            sopId
        ) as Array<{ flowchartJson?: string | null }>
        return rows?.[0]?.flowchartJson || ''
    } catch {
        return ''
    }
}

export const getStepSnapshot = async (sopId: string) => {
    const raw = await readFlowchartJson(sopId)
    const payload = parseFlowchartJson(raw)
    const snapshot = payload.stepsSnapshot
    return Array.isArray(snapshot) ? snapshot : []
}

export const mergeStepsWithSnapshot = (steps: any[], snapshot: any[]) => {
    if (!Array.isArray(steps)) return []
    if (!Array.isArray(snapshot) || snapshot.length === 0) return steps

    const byOrder = new Map<number, any>()
    snapshot.forEach((item: any, index: number) => {
        const normalized = normalizeStepSnapshot(item || {}, index)
        byOrder.set(normalized.order, normalized)
    })

    return steps.map((step: any, index: number) => {
        const order = Number(step?.order) || index + 1
        const snap = byOrder.get(order)
        if (!snap) return step
        return {
            ...step,
            stepType: snap.stepType ?? step?.stepType ?? 'process',
            nextStepYes: snap.nextStepYes ?? step?.nextStepYes ?? null,
            nextStepNo: snap.nextStepNo ?? step?.nextStepNo ?? null,
        }
    })
}

export const upsertStepSnapshot = async (sopId: string, langkahLangkah: any[]) => {
    try {
        const existingRaw = await readFlowchartJson(sopId)
        const existingPayload = parseFlowchartJson(existingRaw)
        const stepsSnapshot = (Array.isArray(langkahLangkah) ? langkahLangkah : []).map((step, index) => {
            const normalized = normalizeStepSnapshot(step || {}, index);
            const order = normalized.order;

            // Try to find existing metadata for this step in the current snapshot
            const existingSteps = Array.isArray(existingPayload.stepsSnapshot) ? existingPayload.stepsSnapshot : [];
            const existing = existingSteps.find((s: any) => (Number(s.order) || -1) === order);

            if (existing) {
                // If the new step has generic/missing metadata, but existing has specific ones, merge them
                return {
                    ...normalized,
                    stepType: (step.stepType && step.stepType !== 'process') ? step.stepType : (existing.stepType || normalized.stepType),
                    nextStepYes: step.nextStepYes !== undefined ? toNumberOrNull(step.nextStepYes) : toNumberOrNull(existing.nextStepYes),
                    nextStepNo: step.nextStepNo !== undefined ? toNumberOrNull(step.nextStepNo) : toNumberOrNull(existing.nextStepNo),
                };
            }
            return normalized;
        })
        const payload = JSON.stringify({
            nodes: Array.isArray(existingPayload.nodes) ? existingPayload.nodes : [],
            edges: Array.isArray(existingPayload.edges) ? existingPayload.edges : [],
            ...existingPayload,
            stepsSnapshot,
        })
        const now = new Date()

        if (isSqlite()) {
            const updatedCount = await db.$executeRawUnsafe(
                `UPDATE "SopFlowchart" SET "flowchartJson" = ?, "updatedAt" = ? WHERE "sopId" = ?`,
                payload,
                now,
                sopId
            )
            if (!updatedCount) {
                await db.$executeRawUnsafe(
                    `INSERT INTO "SopFlowchart" ("id", "sopId", "flowchartJson", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)`,
                    randomUUID(),
                    sopId,
                    payload,
                    now,
                    now
                )
            }
            return
        }

        const updatedCount = await db.$executeRawUnsafe(
            `UPDATE "SopFlowchart" SET "flowchartJson" = $1, "updatedAt" = $2 WHERE "sopId" = $3`,
            payload,
            now,
            sopId
        )
        if (!updatedCount) {
            await db.$executeRawUnsafe(
                `INSERT INTO "SopFlowchart" ("id", "sopId", "flowchartJson", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5)`,
                randomUUID(),
                sopId,
                payload,
                now,
                now
            )
        }
    } catch {
    }
}
