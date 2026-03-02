'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, AlertCircle, Key, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
            <Card className="w-full max-w-md border-none shadow-2xl bg-white/80 backdrop-blur-xl">
                <CardContent className="pt-12 pb-12 text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="p-3 bg-green-100 rounded-full">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Password Diubah!</h2>
                    <p className="text-slate-600">Password Anda berhasil diperbarui. Halaman akan dialihkan ke login dalam 3 detik...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md border-none shadow-2xl bg-white/80 backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
            <CardHeader className="pt-10">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-orange-100 rounded-2xl">
                        <Key className="w-8 h-8 text-orange-600" />
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold text-center text-slate-900">Reset Password</CardTitle>
                <CardDescription className="text-center text-slate-500">
                    Masukkan password baru untuk akun <span className="font-semibold text-slate-700">${email}</span>
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleReset}>
                <CardContent className="space-y-4">
                    {status === 'error' && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700 text-sm animate-shake">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="password">Password Baru</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type="password"
                                required
                                className="pl-10 h-11 border-slate-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Key className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type="password"
                                required
                                className="pl-10 h-11 border-slate-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <CheckCircle2 className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 pb-10">
                    <Button
                        type="submit"
                        className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg hover:shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-70"
                        disabled={loading || !password || !confirmPassword}
                    >
                        {loading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sedang Memproses</>
                        ) : 'Simpan Password Baru'}
                    </Button>

                    <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors py-2">
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Beranda
                    </Link>
                </CardFooter>
            </form>
        </Card>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 selection:bg-orange-100 selection:text-orange-900">
            {/* Dynamic Background Elements */}
            <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/30 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-200/30 blur-[120px] rounded-full" />
            </div>

            <Suspense fallback={<div className="flex flex-col items-center gap-4"><Loader2 className="w-10 h-10 text-orange-600 animate-spin" /><p className="text-slate-500 font-medium">Memuat...</p></div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    )
}
