'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, AlertCircle, Key, ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const email = searchParams.get('email')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setStatus('error')
            setErrorMsg('Password tidak cocok')
            return
        }

        if (password.length < 6) {
            setStatus('error')
            setErrorMsg('Password minimal 6 karakter')
            return
        }

        setLoading(true)
        setStatus('idle')

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            const data = await res.json()

            if (res.ok) {
                setStatus('success')
                setTimeout(() => {
                    router.push('/')
                }, 3000)
            } else {
                setStatus('error')
                setErrorMsg(data.error || 'Gagal mereset password')
            }
        } catch (err) {
            setStatus('error')
            setErrorMsg('Terjadi kesalahan koneksi')
        } finally {
            setLoading(false)
        }
    }

    if (status === 'success') {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
                <Card className="border-0 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-slate-900/90 backdrop-blur-2xl rounded-3xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none" />
                    <CardContent className="pt-16 pb-16 text-center space-y-6 relative z-10">
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}
                            className="flex justify-center"
                        >
                            <div className="p-4 bg-green-500/20 rounded-full border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                <CheckCircle2 className="w-16 h-16 text-green-400" />
                            </div>
                        </motion.div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Password Diubah!</h2>
                            <p className="text-slate-400 font-medium px-6">Password Anda berhasil diperbarui. Halaman akan dialihkan ke login dalam beberapa detik...</p>
                        </div>
                        <div className="flex justify-center pt-4">
                            <Loader2 className="w-6 h-6 text-green-500/50 animate-spin" />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        )
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <Card className="border-0 shadow-[0_0_50px_rgba(0,0,0,0.4)] bg-slate-900/80 backdrop-blur-xl rounded-[2rem] overflow-hidden relative">
                {/* Premium Header Styling matching the Upload/Edit Dialogs */}
                <div className="relative overflow-hidden p-8" style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)' }}>
                    <div className="absolute inset-0 pointer-events-none">
                        <motion.div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-orange-500/20 blur-[50px]" animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
                        <motion.div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-red-500/20 blur-[50px]" animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                    </div>

                    <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                        <motion.div
                            className="w-20 h-20 rounded-3xl flex items-center justify-center relative shadow-2xl mb-2"
                            style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.9), rgba(220,38,38,0.9))', boxShadow: '0 10px 40px -10px rgba(249,115,22,0.6)' }}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        >
                            <div className="absolute inset-0 rounded-3xl border border-white/20" />
                            <Lock className="w-10 h-10 text-white drop-shadow-md" />
                        </motion.div>
                        <div>
                            <CardTitle className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 tracking-tight">
                                Reset Password
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-sm mt-3 font-medium px-4 leading-relaxed">
                                Silakan masukkan dan konfirmasi password baru untuk akun <br />
                                <span className="inline-block mt-2 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700 text-slate-200 font-semibold shadow-inner">
                                    {email || 'akun Anda'}
                                </span>
                            </CardDescription>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleReset} className="p-8 space-y-6 relative border-t border-slate-800/50">
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

                    {status === 'error' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium shadow-inner">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{errorMsg}</span>
                        </motion.div>
                    )}

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Password Baru</Label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    className="relative pl-11 h-12 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl transition-all font-medium"
                                    placeholder="Masukkan password..."
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <Key className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-orange-400 transition-colors" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Konfirmasi Password Baru</Label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    className="relative pl-11 h-12 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl transition-all font-medium"
                                    placeholder="Ulangi password..."
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <CheckCircle2 className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-orange-400 transition-colors" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-4">
                        <Button
                            type="submit"
                            className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white border-0 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] rounded-xl font-bold relative overflow-hidden transition-all text-base"
                            disabled={loading || !password || !confirmPassword}
                        >
                            {!loading && (
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                    animate={{ x: ['-200%', '200%'] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                />
                            )}
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</>
                                ) : 'Simpan Password Baru'}
                            </span>
                        </Button>

                        <Link href="/" className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-400 transition-colors py-2 group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Kembali ke Halaman Login
                        </Link>
                    </div>
                </form>
            </Card>
        </motion.div>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-8 selection:bg-orange-500/30 selection:text-orange-200 relative overflow-hidden">
            {/* Stunning Deep Dark Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-orange-600/10 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-red-600/10 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-600/5 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md">
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center gap-4 min-h-[400px]">
                        <motion.div
                            className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-center relative overflow-hidden"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20" />
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin relative z-10" />
                        </motion.div>
                        <p className="text-slate-400 font-bold tracking-widest text-sm uppercase">Memuat Sistem...</p>
                    </div>
                }>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    )
}
