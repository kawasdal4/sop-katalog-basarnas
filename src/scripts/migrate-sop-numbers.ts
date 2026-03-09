import { PrismaClient } from '@prisma/client';

// Simple Roman numeral converter for the script context
function toRoman(num: number): string {
    const roman: Record<string, number> = {
        M: 1000,
        CM: 900,
        D: 500,
        CD: 400,
        C: 100,
        XC: 90,
        L: 50,
        XL: 40,
        X: 10,
        IX: 9,
        V: 5,
        IV: 4,
        I: 1,
    };
    let str = '';
    let n = num;

    for (const i in roman) {
        while (n >= roman[i]) {
            str += i;
            n -= roman[i];
        }
    }

    return str;
}

function generateSopNumber(
    prefix: 'SOP' | 'IK' | 'LNY',
    sequence: number,
    unit: string,
    date: Date
): string {
    const seqStr = String(sequence).padStart(3, '0');
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const romanMonth = toRoman(month);
    return `${prefix}-${seqStr}/${unit}/${romanMonth}/BSN/${year}`;
}

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting SOP Number Migration...');

    // 1. Migrate SopFile
    console.log('\n--- Migrating SopFile ---');
    const sopFiles = await prisma.sopFile.findMany({
        orderBy: { uploadedAt: 'asc' },
    });

    const counts: Record<string, number> = {
        SOP: 0,
        IK: 0,
        LNY: 0,
    };

    for (const file of sopFiles) {
        const jenis = file.jenis === 'SOP' ? 'SOP' : file.jenis === 'IK' ? 'IK' : 'LNY';
        counts[jenis]++;

        const newNomor = generateSopNumber(jenis as any, counts[jenis], 'DIT.SIAGA', file.uploadedAt);

        console.log(`Updating ${file.nomorSop} -> ${newNomor}`);

        await prisma.sopFile.update({
            where: { id: file.id },
            data: { nomorSop: newNomor },
        });
    }

    // 2. Migrate SopPembuatan
    console.log('\n--- Migrating SopPembuatan ---');
    const sopPembuatans = await prisma.sopPembuatan.findMany({
        orderBy: { createdAt: 'asc' },
    });

    let builderCount = 0;
    for (const sop of sopPembuatans) {
        builderCount++;
        // SopPembuatan is generally SOP type
        const newNomor = generateSopNumber('SOP', builderCount, 'DIT.SIAGA', sop.createdAt);

        console.log(`Updating (Builder) ${sop.nomorSop} -> ${newNomor}`);

        await prisma.sopPembuatan.update({
            where: { id: sop.id },
            data: { nomorSop: newNomor },
        });
    }

    console.log('\n✅ Migration completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
