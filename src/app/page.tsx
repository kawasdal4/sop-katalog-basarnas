'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  LayoutDashboard,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  History,
  Users,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  Plus,
  Menu,
  X,
  LogOut,
  LogIn,
  FileSpreadsheet,
  FileIcon,
  Trash2,
  Check,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Printer,
  Send,
  Shield
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'

// Dynamic imports for preview components to avoid SSR issues with PDF.js
const ExcelPreview = dynamic(
  () => import('@/components/preview/ExcelPreview').then(mod => mod.ExcelPreview),
  { ssr: false }
)

const PdfPreview = dynamic(
  () => import('@/components/preview/PdfPreview').then(mod => mod.PdfPreview),
  { ssr: false }
)

const DesktopIntegration = dynamic(
  () => import('@/components/preview/DesktopIntegration').then(mod => mod.DesktopIntegration),
  { ssr: false }
)

// Types
type UserRole = 'ADMIN' | 'STAF' | null
type PageView = 'dashboard' | 'katalog' | 'upload' | 'verifikasi' | 'logs' | 'users' | 'submit-publik'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

interface SopFile {
  id: string
  nomorSop: string
  judul: string
  tahun: number
  kategori: string
  jenis: string
  status: string
  fileName: string
  filePath: string
  fileType: string
  uploadedBy: string
  uploadedAt: string
  user?: { name: string }
  isPublicSubmission?: boolean
  submitterName?: string
  submitterEmail?: string
  verificationStatus?: string
  driveFileId?: string | null
}

interface LogEntry {
  id: string
  userId: string
  aktivitas: string
  deskripsi: string
  fileId?: string
  createdAt: string
  user?: { name: string; email: string }
  sopFile?: { nomorSop: string; judul: string }
}

interface Stats {
  totalSop: number
  totalIk: number
  totalAktif: number
  totalReview: number
  totalKadaluarsa: number
  totalPublikMenunggu: number
  totalPublikDitolak: number
  byTahun: { tahun: number; count: number }[]
  byKategori: { kategori: string; count: number }[]
  byJenis: { jenis: string; count: number }[]
  byStatus: { status: string; count: number }[]
  recentUploads: SopFile[]
  recentLogs: LogEntry[]
}

const COLORS = ['#f97316', '#eab308', '#22c55e', '#ef4444', '#3b82f6']

const STATUS_COLORS: Record<string, string> = {
  'AKTIF': 'bg-green-100 text-green-800 border-green-200',
  'REVIEW': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'KADALUARSA': 'bg-red-100 text-red-800 border-red-200',
  'MENUNGGU': 'bg-blue-100 text-blue-800 border-blue-200',
  'DISETUJUI': 'bg-green-100 text-green-800 border-green-200',
  'DITOLAK': 'bg-red-100 text-red-800 border-red-200'
}

const KATEGORI_OPTIONS = ['SIAGA', 'LATIHAN', 'LAINNYA']
const JENIS_OPTIONS = ['SOP', 'IK']
const STATUS_OPTIONS = ['AKTIF', 'REVIEW', 'KADALUARSA']

// Loading State Component
function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-lg">Memuat aplikasi...</p>
      </div>
    </div>
  )
}

export default function ESOPApp() {
  const { toast } = useToast()
  
  // ============ MOUNTED GUARD - Prevents SSR hydration issues ============
  // Must be declared FIRST before any conditional returns
  const [isMounted, setIsMounted] = useState(false)
  
  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [showLogin, setShowLogin] = useState(false)
  
  // Navigation
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Data
  const [sopFiles, setSopFiles] = useState<SopFile[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [storageStatus, setStorageStatus] = useState<{ mode: string; message: string } | null>(null)
  
  // Pagination
  const [sopPagination, setSopPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [logsPagination, setLogsPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  
  // Filters - initialized with non-empty values to prevent Select errors
  const [sopFilters, setSopFilters] = useState({
    search: '',
    kategori: 'SEMUA',
    jenis: 'SEMUA',
    status: 'SEMUA',
    tahun: ''
  })
  
  // Verification filter
  const [verificationFilter, setVerificationFilter] = useState('SEMUA')
  
  // Forms
  const [uploadForm, setUploadForm] = useState({
    judul: '',
    kategori: 'SIAGA',
    jenis: 'SOP',
    tahun: new Date().getFullYear(),
    status: 'AKTIF',
    file: null as File | null
  })
  
  const [publicForm, setPublicForm] = useState({
    nama: '',
    email: '',
    judul: '',
    kategori: 'SIAGA',
    jenis: 'SOP',
    tahun: new Date().getFullYear(),
    status: 'AKTIF',
    file: null as File | null
  })
  
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAF'
  })
  
  // Dialogs
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [previewData, setPreviewData] = useState<{ type: string; data: string; fileName: string } | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Print iframe ref
  const printIframeRef = useRef<HTMLIFrameElement>(null)
  
  // Mount effect - set mounted flag
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Check auth on mount
  useEffect(() => {
    checkAuth()
    initSystem()
  }, [])
  
  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchStats()
      fetchStorageStatus()
      
      if (currentPage === 'katalog') fetchSopFiles()
      if (currentPage === 'verifikasi') fetchVerificationList(verificationFilter)
      if (currentPage === 'logs') fetchLogs()
      if (currentPage === 'users' && user.role === 'ADMIN') fetchUsers()
    }
  }, [isAuthenticated, user, currentPage, sopPagination.page, logsPagination.page, verificationFilter])
  
  // Reset page when filters change
  useEffect(() => {
    if (isAuthenticated && currentPage === 'katalog') {
      setSopPagination(p => ({ ...p, page: 1 }))
      fetchSopFiles()
    }
  }, [sopFilters])
  
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth', { credentials: 'include' })
      const data = await res.json()
      if (data.isAuthenticated && data.user) {
        setUser(data.user)
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error('Auth check error:', error)
    }
  }
  
  const initSystem = async () => {
    try {
      await fetch('/api/init')
    } catch (error) {
      console.error('Init error:', error)
    }
  }
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
        credentials: 'include'
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        setUser(data.user)
        setIsAuthenticated(true)
        setShowLogin(false)
        setLoginForm({ email: '', password: '' })
        toast({ title: 'Berhasil', description: 'Login berhasil!' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
    setLoading(false)
  }
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' })
      setUser(null)
      setIsAuthenticated(false)
      setCurrentPage('dashboard')
      toast({ title: 'Berhasil', description: 'Logout berhasil!' })
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }
  
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats', { credentials: 'include' })
      const data = await res.json()
      if (!data.error) setStats(data)
    } catch (error) {
      console.error('Stats error:', error)
    }
  }
  
  const fetchStorageStatus = async () => {
    try {
      const res = await fetch('/api/storage-status')
      const data = await res.json()
      setStorageStatus(data)
    } catch (error) {
      console.error('Storage status error:', error)
    }
  }
  
  const fetchSopFiles = async (resetPage = false) => {
    try {
      const page = resetPage ? 1 : sopPagination.page
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', '10')
      
      if (sopFilters.search) params.append('search', sopFilters.search)
      if (sopFilters.kategori && sopFilters.kategori !== 'SEMUA') params.append('kategori', sopFilters.kategori)
      if (sopFilters.jenis && sopFilters.jenis !== 'SEMUA') params.append('jenis', sopFilters.jenis)
      if (sopFilters.status && sopFilters.status !== 'SEMUA') params.append('status', sopFilters.status)
      if (sopFilters.tahun) params.append('tahun', sopFilters.tahun)
      
      const res = await fetch(`/api/sop?${params}`)
      const data = await res.json()
      if (!data.error) {
        setSopFiles(data.data)
        setSopPagination(prev => ({ ...prev, total: data.pagination.total, totalPages: data.pagination.totalPages, page }))
      }
    } catch (error) {
      console.error('Fetch SOP error:', error)
    }
  }
  
  const fetchVerificationList = async (filter = 'SEMUA') => {
    try {
      const params = new URLSearchParams()
      params.append('page', '1')
      params.append('limit', '50')
      params.append('publicOnly', 'true')
      if (filter && filter !== 'SEMUA') {
        params.append('verificationStatus', filter)
      }
      
      const res = await fetch(`/api/sop?${params}`)
      const data = await res.json()
      if (!data.error) {
        setSopFiles(data.data)
      }
    } catch (error) {
      console.error('Fetch verification error:', error)
    }
  }
  
  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: logsPagination.page.toString(),
        limit: '20'
      })
      const res = await fetch(`/api/logs?${params}`)
      const data = await res.json()
      if (!data.error) {
        setLogs(data.data)
        setLogsPagination(prev => ({ ...prev, total: data.pagination.total, totalPages: data.pagination.totalPages }))
      }
    } catch (error) {
      console.error('Fetch logs error:', error)
    }
  }
  
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (!data.error) setUsers(data.data)
    } catch (error) {
      console.error('Fetch users error:', error)
    }
  }
  
  const handleUpload = async (e: React.FormEvent, isPublic = false) => {
    e.preventDefault()
    const form = isPublic ? publicForm : uploadForm
    if (!form.file) {
      toast({ title: 'Error', description: 'File diperlukan', variant: 'destructive' })
      return
    }
    
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('judul', form.judul)
      formData.append('kategori', form.kategori)
      formData.append('jenis', form.jenis)
      formData.append('tahun', form.tahun.toString())
      formData.append('status', form.status)
      formData.append('file', form.file)
      
      if (isPublic) {
        formData.append('isPublicSubmission', 'true')
        formData.append('submitterName', publicForm.nama)
        formData.append('submitterEmail', publicForm.email)
      }
      
      const res = await fetch('/api/sop', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Berhasil', description: isPublic ? 'SOP berhasil dikirim untuk verifikasi!' : 'SOP berhasil diupload!' })
        setShowUploadDialog(false)
        if (isPublic) {
          setPublicForm({
            nama: '', email: '', judul: '', kategori: 'SIAGA', jenis: 'SOP',
            tahun: new Date().getFullYear(), status: 'AKTIF', file: null
          })
        } else {
          setUploadForm({
            judul: '', kategori: 'SIAGA', jenis: 'SOP',
            tahun: new Date().getFullYear(), status: 'AKTIF', file: null
          })
        }
        fetchSopFiles()
        fetchStats()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
    setLoading(false)
  }
  
  const handleDownload = async (id: string) => {
    try {
      const res = await fetch(`/api/download?id=${id}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const sop = sopFiles.find(s => s.id === id)
      a.download = sop?.fileName || 'file'
      a.click()
      window.URL.revokeObjectURL(url)
      toast({ title: 'Berhasil', description: 'File berhasil diunduh!' })
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal mengunduh file', variant: 'destructive' })
    }
  }
  
  const handlePreview = async (id: string) => {
    try {
      const res = await fetch(`/api/preview?id=${id}`)
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        setPreviewData(data)
        setShowPreviewDialog(true)
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memuat preview', variant: 'destructive' })
    }
  }
  
  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/sop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Berhasil', description: 'Status berhasil diubah!' })
        fetchSopFiles()
        fetchStats()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }
  
  const handleVerification = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/sop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, verificationStatus: status })
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Berhasil', description: `SOP berhasil ${status === 'DISETUJUI' ? 'disetujui' : 'ditolak'}!` })
        fetchSopFiles()
        fetchStats()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }
  
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Berhasil', description: 'User berhasil dibuat!' })
        setShowUserDialog(false)
        setNewUserForm({ name: '', email: '', password: '', role: 'STAF' })
        fetchUsers()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
    setLoading(false)
  }
  
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Berhasil', description: 'User berhasil dihapus!' })
        fetchUsers()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }
  
  const handleExport = async (format: 'xlsx' | 'pdf') => {
    try {
      const res = await fetch(`/api/export?format=${format}`)
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      
      if (format === 'xlsx') {
        const headers = ['Nomor SOP', 'Judul', 'Tahun', 'Kategori', 'Jenis', 'Status', 'Diupload Oleh', 'Tanggal Upload']
        const csvContent = [
          headers.join(','),
          ...data.data.map((item: { nomorSop: string; judul: string; tahun: number; kategori: string; jenis: string; status: string; uploadedBy: string; uploadedAt: string }) => 
            [item.nomorSop, `"${item.judul}"`, item.tahun, item.kategori, item.jenis, item.status, item.uploadedBy, item.uploadedAt].join(',')
          )
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `laporan-sop-ik-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
          toast({ title: 'Error', description: 'Tidak dapat membuka jendela baru', variant: 'destructive' })
          return
        }
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Laporan SOP dan IK</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #f97316; text-align: center; }
              h2 { color: #666; text-align: center; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f97316; color: white; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <h1>Laporan SOP dan IK</h1>
            <h2>Direktorat Kesiapsiagaan</h2>
            <p>Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>
            <table>
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Judul</th>
                  <th>Tahun</th>
                  <th>Kategori</th>
                  <th>Jenis</th>
                  <th>Status</th>
                  <th>Diupload Oleh</th>
                </tr>
              </thead>
              <tbody>
                ${data.data.map((item: { nomorSop: string; judul: string; tahun: number; kategori: string; jenis: string; status: string; uploadedBy: string }) => `
                  <tr>
                    <td>${item.nomorSop}</td>
                    <td>${item.judul}</td>
                    <td>${item.tahun}</td>
                    <td>${item.kategori}</td>
                    <td>${item.jenis}</td>
                    <td>${item.status}</td>
                    <td>${item.uploadedBy}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">
              <p>Dicetak dari: Katalog SOP dan IK - Direktorat Kesiapsiagaan</p>
              <p>created by : Foe</p>
            </div>
          </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
      
      toast({ title: 'Berhasil', description: 'Data berhasil diekspor!' })
    } catch (error) {
      console.error('Export error:', error)
      toast({ title: 'Error', description: 'Gagal mengekspor data', variant: 'destructive' })
    }
  }
  
  // Safe Print Handler - Uses hidden iframe to prevent template corruption
  const handleDirectPrint = useCallback(async (id: string) => {
    // Client-side guard
    if (typeof window === 'undefined') return
    
    const sop = sopFiles.find(s => s.id === id)
    if (!sop) return
    
    try {
      // Fetch the PDF content
      const res = await fetch(`/api/download?id=${id}`)
      
      // Guard 1: Check HTTP status
      if (!res.ok) {
        if (res.status === 504) {
          toast({ title: 'Timeout', description: 'Konversi file membutuhkan waktu terlalu lama', variant: 'destructive' })
        } else {
          toast({ title: 'Error', description: 'Gagal mengunduh file', variant: 'destructive' })
        }
        return
      }
      
      // Guard 2: Check Content-Type
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/pdf')) {
        toast({ title: 'Error', description: 'File bukan PDF', variant: 'destructive' })
        return
      }
      
      const blob = await res.blob()
      
      // Guard 3: Check blob size
      if (blob.size < 1000) {
        toast({ title: 'Error', description: 'File terlalu kecil, mungkin rusak', variant: 'destructive' })
        return
      }
      
      // Guard 4: Check PDF magic number
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const header = String.fromCharCode(...uint8Array.slice(0, 4))
      if (header !== '%PDF') {
        toast({ title: 'Error', description: 'File bukan PDF valid', variant: 'destructive' })
        return
      }
      
      // Create blob URL for printing
      const pdfUrl = URL.createObjectURL(blob)
      
      // Create hidden iframe for printing
      const printIframe = document.createElement('iframe')
      printIframe.style.position = 'fixed'
      printIframe.style.right = '0'
      printIframe.style.bottom = '0'
      printIframe.style.width = '0'
      printIframe.style.height = '0'
      printIframe.style.border = 'none'
      printIframe.style.opacity = '0'
      printIframe.style.pointerEvents = 'none'
      
      document.body.appendChild(printIframe)
      
      printIframe.onload = () => {
        try {
          printIframe.contentWindow?.print()
        } catch (err) {
          toast({ title: 'Error', description: 'Gagal mencetak file', variant: 'destructive' })
        }
        
        // Cleanup after print dialog
        setTimeout(() => {
          document.body.removeChild(printIframe)
          URL.revokeObjectURL(pdfUrl)
        }, 1000)
      }
      
      printIframe.src = pdfUrl
      
    } catch (error) {
      console.error('Print error:', error)
      toast({ title: 'Error', description: 'Gagal mencetak file', variant: 'destructive' })
    }
  }, [sopFiles, toast])
  
  const handlePrint = useCallback((id: string) => {
    const sop = sopFiles.find(s => s.id === id)
    if (!sop) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${sop.nomorSop} - ${sop.judul}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #f97316; }
            .info { margin: 20px 0; }
            .info p { margin: 5px 0; }
            .label { font-weight: bold; display: inline-block; width: 150px; }
            .footer { margin-top: 50px; text-align: right; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>${sop.nomorSop}</h1>
          <h2>${sop.judul}</h2>
          <div class="info">
            <p><span class="label">Jenis:</span> ${sop.jenis}</p>
            <p><span class="label">Kategori:</span> ${sop.kategori}</p>
            <p><span class="label">Tahun:</span> ${sop.tahun}</p>
            <p><span class="label">Status:</span> ${sop.status}</p>
            <p><span class="label">Diupload oleh:</span> ${sop.user?.name || '-'}</p>
            <p><span class="label">Tanggal Upload:</span> ${new Date(sop.uploadedAt).toLocaleDateString('id-ID')}</p>
          </div>
          <div class="footer">
            <p>Dicetak dari: Katalog SOP dan IK - Direktorat Kesiapsiagaan</p>
            <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }, [sopFiles])
  
  const menuItems = [
    { id: 'dashboard' as PageView, label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'STAF'] },
    { id: 'katalog' as PageView, label: 'Katalog SOP', icon: FileText, roles: ['ADMIN', 'STAF'] },
    { id: 'upload' as PageView, label: 'Upload SOP', icon: Upload, roles: ['ADMIN'] },
    { id: 'verifikasi' as PageView, label: 'Verifikasi SOP', icon: CheckCircle, roles: ['ADMIN'] },
    { id: 'logs' as PageView, label: 'Log Aktivitas', icon: History, roles: ['ADMIN'] },
    { id: 'users' as PageView, label: 'Manajemen User', icon: Users, roles: ['ADMIN'] },
  ]
  
  // ============ MOUNTED GUARD - Show loading until client-side mounted ============
  // This MUST come AFTER all hooks are declared to follow React's rules of hooks
  if (!isMounted) {
    return <LoadingState />
  }
  // ============ END MOUNTED GUARD ============
  
  // Login Screen - With Background Image & 16:9 Aspect Layout
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen overflow-hidden flex flex-col background-sar">
        {/* Dark Overlay for High Legibility */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-orange-900/40 z-0"></div>
        
        {/* Header with Shimmering Logo - STICKY */}
        <header className="relative z-10 bg-black/90 backdrop-blur-sm text-white shadow-lg flex-shrink-0">
          {/* Running Text Marquee */}
          <div className="bg-gradient-to-r from-orange-600 to-yellow-500 py-1 overflow-hidden">
            <div className="running-text text-white text-sm font-medium">
              Katalog SOP dan IK - Direktorat Kesiapsiagaan - Badan Nasional Pencarian dan Pertolongan (BASARNAS) || Selamat Datang di Sistem Informasi Dokumen SOP dan IK
            </div>
          </div>
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              {/* Basarnas Logo with Shimmering Effect */}
              <div className="logo-shimmer-container w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-orange-500 to-yellow-400">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold logo-shimmer">Katalog SOP dan IK</h1>
                <p className="text-xs text-orange-300 text-legibility">Direktorat Kesiapsiagaan - BASARNAS</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowLogin(true)}
              className="neon-yellow-btn"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
          </div>
        </header>
        
        {/* Public Content - 16:9 Aspect Layout with Centered Card */}
        <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="w-full max-w-lg">
            <Card className="bg-white/95 backdrop-blur-md shadow-2xl border-2 border-orange-300">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl text-orange-600">Submit SOP Publik</CardTitle>
                <CardDescription>Kirim SOP atau IK untuk diverifikasi oleh admin</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={(e) => handleUpload(e, true)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nama Lengkap</Label>
                      <Input 
                        value={publicForm.nama}
                        onChange={(e) => setPublicForm({ ...publicForm, nama: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={publicForm.email}
                        onChange={(e) => setPublicForm({ ...publicForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Judul SOP/IK</Label>
                    <Input 
                      value={publicForm.judul}
                      onChange={(e) => setPublicForm({ ...publicForm, judul: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Kategori</Label>
                      <Select value={publicForm.kategori} onValueChange={(v) => setPublicForm({ ...publicForm, kategori: v })}>
                        <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                        <SelectContent>
                          {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Jenis</Label>
                      <Select value={publicForm.jenis} onValueChange={(v) => setPublicForm({ ...publicForm, jenis: v })}>
                        <SelectTrigger><SelectValue placeholder="Pilih Jenis" /></SelectTrigger>
                        <SelectContent>
                          {JENIS_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tahun</Label>
                      <Input 
                        type="number"
                        value={publicForm.tahun}
                        onChange={(e) => setPublicForm({ ...publicForm, tahun: parseInt(e.target.value) || new Date().getFullYear() })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={publicForm.status} onValueChange={(v) => setPublicForm({ ...publicForm, status: v })}>
                        <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Upload File (Excel/PDF)</Label>
                    <Input 
                      type="file"
                      accept=".xlsx,.pdf"
                      onChange={(e) => setPublicForm({ ...publicForm, file: e.target.files?.[0] || null })}
                      className="cursor-pointer"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
                    <Send className="w-4 h-4 mr-2" />
                    Submit SOP
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
        
        {/* Sticky Footer with Glow Effect - FROZEN at bottom */}
        <footer className="relative z-10 bg-black/90 backdrop-blur-sm text-white py-3 flex-shrink-0">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-sm text-gray-400">
              <span className="creator-glow text-orange-400">created by : Foe</span>
            </p>
          </div>
        </footer>
        
        {/* Login Dialog */}
        <Dialog open={showLogin} onOpenChange={setShowLogin}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-orange-600 text-center">Login Sistem</DialogTitle>
              <DialogDescription className="text-center">Masukkan kredensial untuk mengakses sistem</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="Masukkan email"
                  required
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input 
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Masukkan password"
                  required
                />
              </div>
              
              {/* Credentials Info */}
              <div className="space-y-2">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-orange-700 mb-1">👤 Admin (Full Access)</p>
                  <p className="text-xs text-orange-600">Email: admin@sop.go.id</p>
                  <p className="text-xs text-orange-600">Password: admin123</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">👥 Staf (View Only)</p>
                  <p className="text-xs text-blue-600">Email: staf@sop.go.id</p>
                  <p className="text-xs text-blue-600">Password: staf123</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowLogin(false)} className="flex-1">
                  Batal
                </Button>
                <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
                  {loading ? 'Memproses...' : 'Login'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
  
  // Main Application - Zero-Scroll Layout with Sticky Header/Footer
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gray-100">
      {/* ============ STICKY HEADER - FROZEN AT TOP ============ */}
      <header className="bg-black text-white shadow-lg flex-shrink-0 z-50 no-print">
        {/* Running Text Marquee */}
        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 py-1 overflow-hidden">
          <div className="running-text text-white text-sm font-medium">
            Katalog SOP dan IK - Direktorat Kesiapsiagaan - Badan Nasional Pencarian dan Pertolongan (BASARNAS) || Selamat Datang di Sistem Informasi Dokumen SOP dan IK
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-3">
              {/* Basarnas Logo with Shimmering Effect */}
              <div className="logo-shimmer-container w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-orange-500 to-yellow-400">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold logo-shimmer">Katalog SOP dan IK</h1>
                <p className="text-xs text-orange-300">Direktorat Kesiapsiagaan - BASARNAS</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <div className="flex items-center justify-end gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  user?.role === 'ADMIN' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-blue-500 text-white'
                }`}>
                  {user?.role === 'ADMIN' ? '👑 Admin' : '👥 Staf'}
                </span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* ============ BODY AREA: Sidebar + Main Content ============ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ============ STATIC SIDEBAR - NO SCROLL ============ */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 overflow-hidden flex-shrink-0 no-print`}>
          <nav className="p-4 space-y-2 h-full">
            {menuItems.filter(item => item.roles.includes(user?.role || '')).map(item => (
              <Button
                key={item.id}
                variant={currentPage === item.id ? 'default' : 'ghost'}
                className={`w-full justify-start gap-3 ${currentPage === item.id ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                onClick={() => setCurrentPage(item.id)}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>
        
        {/* ============ SCROLLABLE MAIN CONTENT - ONLY AREA WITH SCROLL ============ */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          {/* Dashboard */}
          {currentPage === 'dashboard' && (
            <div className="space-y-6">
              {!stats ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-500">Memuat data...</p>
                  </div>
                </div>
              ) : (
                <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleExport('xlsx')} className="border-orange-300 text-orange-600 hover:bg-orange-50">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('pdf')} className="border-orange-300 text-orange-600 hover:bg-orange-50">
                    <FileIcon className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
              
              {/* Storage Status Indicator */}
              {storageStatus && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${storageStatus.mode === 'drive' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                  <div className={`w-2 h-2 rounded-full ${storageStatus.mode === 'drive' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm font-medium">
                    {storageStatus.mode === 'drive' ? '☁️ Google Drive' : '💾 Penyimpanan Lokal'}
                  </span>
                  <span className="text-xs opacity-75">- {storageStatus.message}</span>
                </div>
              )}
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total SOP</p>
                        <p className="text-3xl font-bold text-orange-600">{stats.totalSop}</p>
                      </div>
                      <FileText className="w-12 h-12 text-orange-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total IK</p>
                        <p className="text-3xl font-bold text-yellow-600">{stats.totalIk}</p>
                      </div>
                      <FolderOpen className="w-12 h-12 text-yellow-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Status Aktif</p>
                        <p className="text-3xl font-bold text-green-600">{stats.totalAktif}</p>
                      </div>
                      <CheckCircle className="w-12 h-12 text-green-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Pengajuan Publik</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.totalPublikMenunggu}</p>
                      </div>
                      <Clock className="w-12 h-12 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-green-500 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="text-sm text-gray-600">Aktif</p>
                        <p className="text-2xl font-bold text-green-600">{stats.totalAktif}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-yellow-500" />
                      <div>
                        <p className="text-sm text-gray-600">Review</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.totalReview}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-8 h-8 text-red-500" />
                      <div>
                        <p className="text-sm text-gray-600">Kadaluarsa</p>
                        <p className="text-2xl font-bold text-red-600">{stats.totalKadaluarsa}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribusi per Tahun</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.byTahun}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="tahun" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f97316" name="Jumlah" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribusi per Kategori</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.byKategori}
                          dataKey="count"
                          nameKey="kategori"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ kategori, count }) => `${kategori}: ${count}`}
                        >
                          {stats.byKategori.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
                </>
              )}
            </div>
          )}
          
          {/* Katalog SOP */}
          {currentPage === 'katalog' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Katalog SOP dan IK</h2>
                  <p className="text-sm text-gray-500 mt-1">Daftar lengkap SOP dan IK yang tersedia</p>
                </div>
                {/* Neon Yellow Glowing Tambah SOP Button */}
                {user?.role === 'ADMIN' && (
                  <Button 
                    onClick={() => setShowUploadDialog(true)}
                    className="neon-yellow-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah SOP
                  </Button>
                )}
              </div>
              
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input 
                          placeholder="Cari nomor atau judul..."
                          value={sopFilters.search}
                          onChange={(e) => setSopFilters({ ...sopFilters, search: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={sopFilters.kategori} onValueChange={(v) => setSopFilters({ ...sopFilters, kategori: v })}>
                      <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEMUA">Semua Kategori</SelectItem>
                        {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={sopFilters.jenis} onValueChange={(v) => setSopFilters({ ...sopFilters, jenis: v })}>
                      <SelectTrigger><SelectValue placeholder="Jenis" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEMUA">Semua Jenis</SelectItem>
                        {JENIS_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={sopFilters.status} onValueChange={(v) => setSopFilters({ ...sopFilters, status: v })}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEMUA">Semua Status</SelectItem>
                        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              
              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Nomor</TableHead>
                          <TableHead className="font-semibold">Judul</TableHead>
                          <TableHead className="font-semibold">Tahun</TableHead>
                          <TableHead className="font-semibold">Kategori</TableHead>
                          <TableHead className="font-semibold">Jenis</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Diupload</TableHead>
                          <TableHead className="font-semibold text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sopFiles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                              Tidak ada data ditemukan
                            </TableCell>
                          </TableRow>
                        ) : (
                          sopFiles.map((sop) => (
                            <TableRow key={sop.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{sop.nomorSop}</TableCell>
                              <TableCell className="max-w-xs truncate">{sop.judul}</TableCell>
                              <TableCell>{sop.tahun}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-orange-300 text-orange-700">{sop.kategori}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={sop.jenis === 'SOP' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}>
                                  {sop.jenis}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={STATUS_COLORS[sop.status] || ''}>{sop.status}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">{sop.user?.name || '-'}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handlePreview(sop.id)} title="Preview di Browser" className="hover:bg-orange-50">
                                    <Eye className="w-4 h-4 text-orange-500" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDownload(sop.id)} title="Download" className="hover:bg-yellow-50">
                                    <Download className="w-4 h-4 text-yellow-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDirectPrint(sop.id)} title="Print" className="hover:bg-gray-100">
                                    <Printer className="w-4 h-4 text-gray-500" />
                                  </Button>
                                  
                                  {/* Desktop Integration - Open in Desktop App */}
                                  <DesktopIntegration
                                    fileId={sop.id}
                                    fileName={sop.fileName}
                                    fileType={sop.fileType as 'pdf' | 'xlsx'}
                                    driveFileId={sop.driveFileId}
                                    onPreview={() => handlePreview(sop.id)}
                                  />
                                  
                                  {user?.role === 'ADMIN' && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuLabel>Ubah Status</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {STATUS_OPTIONS.map(s => (
                                          <DropdownMenuItem key={s} onClick={() => handleStatusChange(sop.id, s)}>
                                            <Check className="w-4 h-4 mr-2" /> {s}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Menampilkan {sopFiles.length} dari {sopPagination.total} data
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={sopPagination.page === 1}
                    onClick={() => setSopPagination(p => ({ ...p, page: p.page - 1 }))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">Halaman {sopPagination.page} dari {sopPagination.totalPages || 1}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={sopPagination.page >= sopPagination.totalPages}
                    onClick={() => setSopPagination(p => ({ ...p, page: p.page + 1 }))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Upload SOP */}
          {currentPage === 'upload' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Upload SOP Baru</h2>
                  <p className="text-sm text-gray-500 mt-1">Unggah dokumen SOP atau IK baru ke sistem</p>
                </div>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Form Upload</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => handleUpload(e, false)} className="space-y-4">
                    <div>
                      <Label>Judul SOP/IK</Label>
                      <Input 
                        value={uploadForm.judul}
                        onChange={(e) => setUploadForm({ ...uploadForm, judul: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Kategori</Label>
                        <Select value={uploadForm.kategori} onValueChange={(v) => setUploadForm({ ...uploadForm, kategori: v })}>
                          <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                          <SelectContent>
                            {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Jenis</Label>
                        <Select value={uploadForm.jenis} onValueChange={(v) => setUploadForm({ ...uploadForm, jenis: v })}>
                          <SelectTrigger><SelectValue placeholder="Pilih Jenis" /></SelectTrigger>
                          <SelectContent>
                            {JENIS_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tahun</Label>
                        <Input 
                          type="number"
                          value={uploadForm.tahun}
                          onChange={(e) => setUploadForm({ ...uploadForm, tahun: parseInt(e.target.value) || new Date().getFullYear() })}
                          required
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={uploadForm.status} onValueChange={(v) => setUploadForm({ ...uploadForm, status: v })}>
                          <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Upload File (Excel/PDF)</Label>
                      <Input 
                        type="file"
                        accept=".xlsx,.pdf"
                        onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                        className="cursor-pointer"
                      />
                    </div>
                    <Button type="submit" className="neon-yellow-btn" disabled={loading}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload SOP
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Verifikasi SOP */}
          {currentPage === 'verifikasi' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Verifikasi SOP Publik</h2>
                  <p className="text-sm text-gray-500 mt-1">Kelola pengajuan SOP dan IK dari publik</p>
                </div>
                <Select value={verificationFilter} onValueChange={(v) => setVerificationFilter(v)}>
                  <SelectTrigger className="w-48 border-orange-300">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMUA">Semua Status</SelectItem>
                    <SelectItem value="MENUNGGU">Menunggu</SelectItem>
                    <SelectItem value="DISETUJUI">Disetujui</SelectItem>
                    <SelectItem value="DITOLAK">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total SOP Aktif</p>
                        <p className="text-3xl font-bold text-orange-600 mt-1">{stats?.totalAktif || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-orange-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Menunggu Verifikasi</p>
                        <p className="text-3xl font-bold text-yellow-600 mt-1">{stats?.totalPublikMenunggu || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6 text-yellow-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Ditolak</p>
                        <p className="text-3xl font-bold text-red-600 mt-1">{stats?.totalPublikDitolak || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-red-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Verification Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Judul</TableHead>
                          <TableHead className="font-semibold">Pengirim</TableHead>
                          <TableHead className="font-semibold">Kategori</TableHead>
                          <TableHead className="font-semibold">Jenis</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sopFiles.filter(s => s.isPublicSubmission).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              Tidak ada pengajuan publik
                            </TableCell>
                          </TableRow>
                        ) : (
                          sopFiles.filter(s => s.isPublicSubmission).map((sop) => (
                            <TableRow key={sop.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{sop.judul}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p>{sop.submitterName}</p>
                                  <p className="text-gray-500">{sop.submitterEmail}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-orange-300 text-orange-700">{sop.kategori}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={sop.jenis === 'SOP' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}>
                                  {sop.jenis}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={STATUS_COLORS[sop.verificationStatus || 'MENUNGGU'] || ''}>
                                  {sop.verificationStatus || 'MENUNGGU'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDownload(sop.id)}
                                    className="text-gray-500"
                                  >
                                    <Download className="w-4 h-4 mr-1" /> Unduh
                                  </Button>
                                  {sop.verificationStatus === 'MENUNGGU' && (
                                    <>
                                      <Button 
                                        size="sm"
                                        onClick={() => handleVerification(sop.id, 'DISETUJUI')}
                                        className="bg-green-500 hover:bg-green-600 text-white"
                                      >
                                        <Check className="w-4 h-4 mr-1" /> Setujui
                                      </Button>
                                      <Button 
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleVerification(sop.id, 'DITOLAK')}
                                      >
                                        <X className="w-4 h-4 mr-1" /> Tolak
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Log Aktivitas */}
          {currentPage === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Log Aktivitas</h2>
                  <p className="text-sm text-gray-500 mt-1">Riwayat aktivitas sistem</p>
                </div>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-3">
                      {logs.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Tidak ada log aktivitas</p>
                      ) : (
                        logs.map((log) => (
                          <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                              <History className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-800">{log.user?.name || 'System'}</span>
                                <Badge variant="outline" className="text-xs">{log.aktivitas}</Badge>
                              </div>
                              <p className="text-sm text-gray-600">{log.deskripsi}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(log.createdAt).toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              
              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Halaman {logsPagination.page} dari {logsPagination.totalPages || 1}
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={logsPagination.page === 1}
                    onClick={() => setLogsPagination(p => ({ ...p, page: p.page - 1 }))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={logsPagination.page >= logsPagination.totalPages}
                    onClick={() => setLogsPagination(p => ({ ...p, page: p.page + 1 }))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Manajemen User */}
          {currentPage === 'users' && user?.role === 'ADMIN' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Manajemen User</h2>
                  <p className="text-sm text-gray-500 mt-1">Kelola pengguna sistem</p>
                </div>
                <Button onClick={() => setShowUserDialog(true)} className="neon-yellow-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah User
                </Button>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Nama</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                        <TableHead className="font-semibold text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            Tidak ada user
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow key={u.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Badge className={u.role === 'ADMIN' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={u.id === user.id}
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
      
      {/* ============ STICKY FOOTER - FROZEN AT BOTTOM ============ */}
      <footer className="bg-black text-white py-2 flex-shrink-0 z-50 no-print">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-400">
            <span className="creator-glow text-orange-400">created by : Foe</span>
          </p>
        </div>
      </footer>
      
      {/* Hidden Print Iframe */}
      <iframe ref={printIframeRef} style={{ display: 'none' }} title="print-frame" />
      
      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange-600">Upload SOP Baru</DialogTitle>
            <DialogDescription>Isi form berikut untuk mengunggah dokumen baru</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleUpload(e, false)} className="space-y-4">
            <div>
              <Label>Judul SOP/IK</Label>
              <Input 
                value={uploadForm.judul}
                onChange={(e) => setUploadForm({ ...uploadForm, judul: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kategori</Label>
                <Select value={uploadForm.kategori} onValueChange={(v) => setUploadForm({ ...uploadForm, kategori: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jenis</Label>
                <Select value={uploadForm.jenis} onValueChange={(v) => setUploadForm({ ...uploadForm, jenis: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JENIS_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tahun</Label>
                <Input 
                  type="number"
                  value={uploadForm.tahun}
                  onChange={(e) => setUploadForm({ ...uploadForm, tahun: parseInt(e.target.value) || new Date().getFullYear() })}
                  required
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={uploadForm.status} onValueChange={(v) => setUploadForm({ ...uploadForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Upload File (Excel/PDF)</Label>
              <Input 
                type="file"
                accept=".xlsx,.pdf"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                className="cursor-pointer"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>Batal</Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange-600">Tambah User Baru</DialogTitle>
            <DialogDescription>Buat akun pengguna baru untuk sistem</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label>Nama</Label>
              <Input 
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input 
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input 
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAF">Staf</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowUserDialog(false)}>Batal</Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-orange-600">
              📄 {previewData?.fileName || 'Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh]">
            {previewData?.type === 'pdf' ? (
              <PdfPreview 
                data={previewData.data} 
                fileName={previewData.fileName}
              />
            ) : previewData?.type === 'excel' ? (
              <ExcelPreview 
                data={previewData.data} 
                fileName={previewData.fileName}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Preview tidak tersedia
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
