'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const GOODBYE_WORDS = [
    { word: 'Goodbye', code: 'gb', lang: 'English' },
    { word: 'Selamat Tinggal', code: 'id', lang: 'Indonesia' },
    { word: 'Au Revoir', code: 'fr', lang: 'Français' },
    { word: 'Adiós', code: 'es', lang: 'Español' },
    { word: 'Auf Wiedersehen', code: 'de', lang: 'Deutsch' },
    { word: 'さようなら', code: 'jp', lang: '日本語' },
    { word: '再见', code: 'cn', lang: '中文' },
    { word: 'مع السلامة', code: 'sa', lang: 'العربية' },
    { word: '안녕히 가세요', code: 'kr', lang: '한국어' },
    { word: 'До свидания', code: 'ru', lang: 'Русский' },
    { word: 'Arrivederci', code: 'it', lang: 'Italiano' },
    { word: 'Tchau', code: 'br', lang: 'Português' },
    { word: 'अलविदा', code: 'in', lang: 'हिंदी' },
    { word: 'Güle güle', code: 'tr', lang: 'Türkçe' },
    { word: 'ลาก่อน', code: 'th', lang: 'ภาษาไทย' },
    { word: 'Tạm biệt', code: 'vn', lang: 'Tiếng Việt' },
    { word: 'Tot ziens', code: 'nl', lang: 'Nederlands' },
    { word: 'Hejdå', code: 'se', lang: 'Svenska' },
    { word: 'Αντίο', code: 'gr', lang: 'Ελληνικά' },
    { word: 'Shalom', code: 'il', lang: 'עברית' },
    { word: 'Do widzenia', code: 'pl', lang: 'Polski' },
    { word: 'Na shledanou', code: 'cz', lang: 'Čeština' },
    { word: 'Viszontlátásra', code: 'hu', lang: 'Magyar' },
    { word: 'La revedere', code: 'ro', lang: 'Română' },
    { word: 'До побачення', code: 'ua', lang: 'Українська' },
    { word: 'Farvel', code: 'dk', lang: 'Dansk' },
    { word: 'Näkemiin', code: 'fi', lang: 'Suomi' },
    { word: 'Kwaheri', code: 'ke', lang: 'Kiswahili' },
    { word: 'Namaste', code: 'np', lang: 'नेपाली' },
    { word: 'Dovidenia', code: 'sk', lang: 'Slovenčina' },
]

interface FloatingWord {
    id: number
    word: string
    code: string
    lang: string
    x: number
    y: number
    vx: number
    vy: number
    size: number
    opacity: number
    rotation: number
    color: string
}

const COLORS = [
    '#f97316', '#fb923c', '#fbbf24', '#34d399', '#60a5fa',
    '#a78bfa', '#f472b6', '#e879f9', '#38bdf8', '#4ade80',
    '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b',
]

export default function LogoutAnimation({ show, userName }: { show: boolean; userName?: string }) {
    const [words, setWords] = useState<FloatingWord[]>([])
    const [phase, setPhase] = useState<'enter' | 'float' | 'exit'>('enter')

    useEffect(() => {
        if (!show) {
            setPhase('enter')
            setWords([])
            return
        }

        const generated: FloatingWord[] = GOODBYE_WORDS.map((item, i) => ({
            id: i,
            ...item,
            x: Math.random() * 78 + 5,
            y: Math.random() * 72 + 8,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 12 + 13,
            opacity: Math.random() * 0.35 + 0.7,
            rotation: Math.random() * 24 - 12,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
        }))
        setWords(generated)
        setPhase('float')

        const exitTimer = setTimeout(() => setPhase('exit'), 2800)
        return () => clearTimeout(exitTimer)
    }, [show])

    if (!show) return null

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    key="logout-overlay"
                    className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Dark layered background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

                    {/* Animated orange radial glow */}
                    <motion.div
                        className="absolute inset-0"
                        style={{ background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.15) 0%, transparent 70%)' }}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    {/* Starfield particles */}
                    {Array.from({ length: 60 }).map((_, i) => (
                        <motion.div
                            key={`star-${i}`}
                            className="absolute rounded-full"
                            style={{
                                width: Math.random() * 3 + 1,
                                height: Math.random() * 3 + 1,
                                left: `${(i * 37 + 5) % 100}%`,
                                top: `${(i * 29 + 8) % 100}%`,
                                background: COLORS[i % COLORS.length],
                            }}
                            animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                            transition={{ duration: (i % 3) + 1, repeat: Infinity, delay: (i % 5) * 0.4, ease: 'easeInOut' }}
                        />
                    ))}

                    {/* Grid overlay */}
                    <div
                        className="absolute inset-0 opacity-5"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)',
                            backgroundSize: '60px 60px',
                        }}
                    />

                    {/* Flying goodbye words */}
                    {words.map((item, i) => (
                        <motion.div
                            key={item.id}
                            className="absolute select-none"
                            style={{ left: `${item.x}%`, top: `${item.y}%` }}
                            initial={{
                                opacity: 0,
                                scale: 0,
                                rotate: item.rotation - 30,
                                x: (Math.random() - 0.5) * 400,
                                y: (Math.random() - 0.5) * 400,
                            }}
                            animate={phase === 'float' ? {
                                opacity: item.opacity,
                                scale: 1,
                                rotate: item.rotation,
                                x: [0, item.vx * 80, item.vx * -40, 0],
                                y: [0, item.vy * 80, item.vy * -40, 0],
                            } : phase === 'exit' ? {
                                opacity: 0,
                                scale: 0,
                                rotate: item.rotation + 30,
                                x: (Math.random() - 0.5) * 600,
                                y: (Math.random() - 0.5) * 600,
                            } : {}}
                            transition={{
                                opacity: { duration: 0.4, delay: i * 0.04 },
                                scale: { duration: 0.5, delay: i * 0.04, type: 'spring', stiffness: 200 },
                                rotate: { duration: 0.5, delay: i * 0.04 },
                                x: { duration: 4, repeat: phase === 'float' ? Infinity : 0, ease: 'easeInOut', delay: i * 0.04 },
                                y: { duration: 3.5, repeat: phase === 'float' ? Infinity : 0, ease: 'easeInOut', delay: i * 0.06 },
                            }}
                        >
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                                style={{
                                    background: `${item.color}18`,
                                    border: `1px solid ${item.color}40`,
                                    boxShadow: `0 0 12px ${item.color}30`,
                                    backdropFilter: 'blur(4px)',
                                }}
                            >
                                {/* Flag image from flagcdn.com */}
                                <img
                                    src={`https://flagcdn.com/w40/${item.code}.png`}
                                    alt={item.lang}
                                    width={22}
                                    height={15}
                                    style={{
                                        borderRadius: 3,
                                        objectFit: 'cover',
                                        flexShrink: 0,
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: item.size,
                                        color: item.color,
                                        fontWeight: 700,
                                        fontFamily: 'Inter, system-ui, sans-serif',
                                        textShadow: `0 0 20px ${item.color}80`,
                                        letterSpacing: '-0.01em',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {item.word}
                                </span>
                            </div>
                        </motion.div>
                    ))}

                    {/* Center main card */}
                    <motion.div
                        className="relative z-10 text-center px-12 py-10 rounded-3xl"
                        style={{
                            background: 'rgba(15, 23, 42, 0.85)',
                            border: '1px solid rgba(249, 115, 22, 0.3)',
                            backdropFilter: 'blur(24px)',
                            boxShadow: '0 0 60px rgba(249, 115, 22, 0.2), 0 40px 80px rgba(0,0,0,0.6)',
                        }}
                        initial={{ opacity: 0, scale: 0.5, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.6, type: 'spring', stiffness: 200, delay: 0.1 }}
                    >
                        {/* Waving hand icon with glow */}
                        <motion.div
                            className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
                            animate={{
                                boxShadow: [
                                    '0 0 30px rgba(249,115,22,0.5)',
                                    '0 0 60px rgba(249,115,22,0.9)',
                                    '0 0 30px rgba(249,115,22,0.5)',
                                ],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <motion.span
                                style={{ fontSize: 36 }}
                                animate={{ rotate: [0, -15, 15, -15, 10, 0], scale: [1, 1.1, 1] }}
                                transition={{ duration: 1, delay: 0.3, repeat: Infinity, repeatDelay: 1.5 }}
                            >
                                👋
                            </motion.span>
                        </motion.div>

                        {/* Goodbye text */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                        >
                            <div
                                style={{
                                    fontSize: 42,
                                    fontWeight: 900,
                                    background: 'linear-gradient(135deg, #f97316, #fbbf24, #f97316)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    letterSpacing: '-1px',
                                    lineHeight: 1.1,
                                    marginBottom: 10,
                                }}
                            >
                                Sampai Jumpa!
                            </div>
                            {userName && (
                                <div style={{ color: '#94a3b8', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                                    Hati-hati di jalan,{' '}
                                    <span style={{ color: '#f97316', fontWeight: 700 }}>{userName}</span>
                                </div>
                            )}
                            <div style={{ color: '#475569', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600 }}>
                                E-Katalog BASARNAS
                            </div>
                        </motion.div>

                        {/* Progress bar */}
                        <motion.div
                            className="mt-8 h-1 rounded-full overflow-hidden"
                            style={{ background: 'rgba(249,115,22,0.15)', width: 220, margin: '32px auto 0' }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: 'linear-gradient(90deg, #f97316, #fbbf24)' }}
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 2.6, ease: 'linear', delay: 0.6 }}
                            />
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
