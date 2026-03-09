export function toRoman(num: number): string {
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

    for (const i in roman) {
        while (num >= roman[i]) {
            str += i;
            num -= roman[i];
        }
    }

    return str;
}

export function generateSopNumber(
    prefix: 'SOP' | 'IK' | 'LNY',
    sequence: number,
    unit: string = 'DIT.SIAGA',
    month: number = new Date().getMonth() + 1,
    year: number = new Date().getFullYear()
): string {
    const seqStr = String(sequence).padStart(3, '0');
    const romanMonth = toRoman(month);
    return `${prefix}-${seqStr}/${unit}/${romanMonth}/BSN/${year}`;
}
