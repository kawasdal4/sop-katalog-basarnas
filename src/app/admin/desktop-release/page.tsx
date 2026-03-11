'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Upload, Download, FileText, CheckCircle, AlertTriangle } from 'lucide-react'

interface DesktopRelease {
  id: string
  version: string
  notes: string | null
  downloadUrl: string
  signature: string
  fileSize: number | null
  isPublished: boolean
  pubDate: string
  createdAt: string
}

export default function DesktopReleaseAdminPage() {
  const { toast } = useToast()
  const [releases, setReleases] = useState<DesktopRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  const [form, setForm] = useState({
    version: '',
    notes: '',
    signature: '',
    file: null as File | null
  })

  useEffect(() => {
    fetchReleases()
  }, [])

  const fetchReleases = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/release')
      if (!res.ok) throw new Error('Failed to fetch releases')
      const data = await res.json()
      setReleases(data)
    } catch (error) {
      console.error('Error fetching releases:', error)
      toast({
        title: 'Error',
        description: 'Gagal mengambil data rilis',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.version || !form.file || !form.signature) {
      toast({ title: 'Error', description: 'Mohon lengkapi semua field yang wajib', variant: 'destructive' })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('version', form.version)
    formData.append('notes', form.notes)
    formData.append('signature', form.signature)
    formData.append('file', form.file)

    try {
      const res = await fetch('/api/admin/release', {
        method: 'POST',
        body: formData,
      })
      
      const data = await res.json()
      
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to publish release')
      }

      toast({
        title: '✅ Rilis Berhasil',
        description: `Versi ${form.version} berhasil dipublikasikan dan tersedia untuk auto-update.`,
      })
      
      // Reset form
      setForm({ version: '', notes: '', signature: '', file: null })
      fetchReleases()
      
    } catch (error: any) {
      toast({
        title: '❌ Gagal Mengupload',
        description: error.message || 'Terjadi kesalahan sistem',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Rilis Desktop</h1>
          <p className="text-muted-foreground mt-1">
            Upload installer baru dan kelola manifest auto-update Tauri.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Form Column */}
        <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-lg">
          <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Upload Rilis Baru (v2)
            </CardTitle>
            <CardDescription>
              Pastikan Anda mengupload file .exe Installer (NSIS) atau .msi yang telah dicompile dengan rilis flag, beserta isi file .sig.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="version" className="font-semibold">Versi (SemVer)</Label>
                <Input 
                  id="version" 
                  placeholder="e.g., 1.0.1" 
                  value={form.version}
                  onChange={(e) => setForm({...form, version: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file" className="font-semibold">File Installer (.exe / .msi)</Label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <Input 
                    id="file" 
                    type="file" 
                    accept=".exe,.msi"
                    onChange={(e) => setForm({...form, file: e.target.files?.[0] || null})}
                    className="hidden"
                    required
                  />
                  <Label htmlFor="file" className="cursor-pointer flex flex-col items-center gap-2">
                    {form.file ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <span className="font-medium text-sm">{form.file.name}</span>
                        <span className="text-xs text-muted-foreground">{formatSize(form.file.size)}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400" />
                        <span className="font-medium text-sm">Pilih installer update</span>
                        <span className="text-xs text-muted-foreground">Maks: 100MB</span>
                      </>
                    )}
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature" className="font-semibold flex items-center justify-between">
                  <span>Isi File Signature (.sig)</span>
                  <a href="https://tauri.app/v1/guides/distribution/updater/#signing-updates" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Info</a>
                </Label>
                <Textarea 
                  id="signature" 
                  placeholder="Paste isi text dari file .exe.sig hasil build Tauri..."
                  value={form.signature}
                  onChange={(e) => setForm({...form, signature: e.target.value})}
                  className="font-mono text-xs h-24"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="font-semibold">Release Notes (Markdown)</Label>
                <Textarea 
                  id="notes" 
                  placeholder="- Perbaikan bug login\n- Optimasi kecepatan load halaman"
                  value={form.notes}
                  onChange={(e) => setForm({...form, notes: e.target.value})}
                  className="h-32"
                />
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengupload & Mempublikasikan...
                  </>
                ) : (
                  <>Publikasikan Rilis</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History Column */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Riwayat Rilis
          </h2>
          
          {loading ? (
             <div className="flex items-center justify-center p-12">
               <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
             </div>
          ) : releases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                <p>Belum ada rilis yang dipublikasikan.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
              {releases.map((release, idx) => (
                <Card key={release.id} className={idx === 0 ? 'border-primary shadow-md' : 'opacity-80'}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">v{release.version}</CardTitle>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">Latest</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(release.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 pb-4 space-y-3">
                    <div className="text-sm bg-slate-50 dark:bg-slate-900 p-3 rounded-md border text-slate-700 dark:text-slate-300 whitespace-pre-line">
                      {release.notes || 'Tidak ada catatan rilis.'}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Ukuran: {formatSize(release.fileSize)}</span>
                      <a href={release.downloadUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors">
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
