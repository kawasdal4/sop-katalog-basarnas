'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
  Send
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Types
type UserRole = 'ADMIN' | 'STAF' | null
type PageView = 'dashboard' | 'katalog' | 'upload' | 'verifikasi' | 'logs' | 'users' | 'submit-publik'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt?: string
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
  driveFileId?: string
  uploadedBy: string
  uploadedAt: string
  user?: { name: string }
  isPublicSubmission?: boolean
  submitterName?: string
  submitterEmail?: string
  verificationStatus?: string
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

export default function ESOPApp() {
  const { toast } = useToast()
  
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
  
  // Pagination
  const [sopPagination, setSopPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [logsPagination, setLogsPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  
  // Filters
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

  // Google Drive connection status
  const [driveStatus, setDriveStatus] = useState<{
    connected: boolean
    status: string
    message: string
    details?: {
      folderId?: string
      folderName?: string
      folderOwner?: string
    }
  } | null>(null)
  
  // Check auth on mount
  useEffect(() => {
    checkAuth()
    initSystem()
  }, [])
  
  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Fetch stats for all pages
      fetchStats()
      
      // Fetch Google Drive status
      fetchDriveStatus()
      
      // Fetch page-specific data
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
      const res = await fetch('/api/auth')
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
        body: JSON.stringify(loginForm)
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
      const res = await fetch('/api/stats')
      const data = await res.json()
      if (!data.error) setStats(data)
    } catch (error) {
      console.error('Stats error:', error)
    }
  }
  
  const fetchDriveStatus = async () => {
    try {
      const res = await fetch('/api/drive/status')
      const data = await res.json()
      setDriveStatus(data)
    } catch (error) {
      console.error('Drive status error:', error)
      setDriveStatus({
        connected: false,
        status: 'error',
        message: 'Gagal menghubungi server'
      })
    }
  }
  
  const fetchSopFiles = async (resetPage = false) => {
    try {
      const page = resetPage ? 1 : sopPagination.page
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', '10')
      
      // Only append non-empty and non-SEMUA filters
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
    
    // Check file size - use resumable upload for files > 4MB
    const LARGE_FILE_THRESHOLD = 4 * 1024 * 1024 // 4MB
    const isLargeFile = form.file.size > LARGE_FILE_THRESHOLD
    
    try {
      if (isLargeFile) {
        // Use resumable upload for large files
        toast({ title: '📤 Upload File Besar', description: `Ukuran file: ${(form.file.size / 1024 / 1024).toFixed(2)} MB. Menggunakan resumable upload...`, duration: 5000 })
        
        await handleLargeFileUpload(form, isPublic)
      } else {
        // Use regular upload for small files
        await handleSmallFileUpload(form, isPublic)
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({ title: 'Error', description: 'Terjadi kesalahan saat upload', variant: 'destructive' })
    }
    setLoading(false)
  }
  
  // Handle small file upload (< 4MB)
  const handleSmallFileUpload = async (form: typeof uploadForm | typeof publicForm, isPublic: boolean) => {
    const formData = new FormData()
    formData.append('judul', form.judul)
    formData.append('kategori', form.kategori)
    formData.append('jenis', form.jenis)
    formData.append('tahun', form.tahun.toString())
    formData.append('status', form.status)
    formData.append('file', form.file!)
    
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
      resetUploadForm(isPublic)
      fetchSopFiles()
      fetchStats()
    }
  }
  
  // Handle large file upload using resumable upload (via proxy)
  const handleLargeFileUpload = async (form: typeof uploadForm | typeof publicForm, isPublic: boolean) => {
    const file = form.file!
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    
    // MIME types
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
    }
    const mimeType = mimeTypes[fileExtension] || 'application/octet-stream'
    
    // Step 1: Upload file via proxy API
    toast({ title: '📤 Step 1/2', description: `Mengupload file (${(file.size / 1024 / 1024).toFixed(2)} MB) ke Google Drive...`, duration: 5000 })
    
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('fileName', file.name)
    uploadFormData.append('mimeType', mimeType)
    
    const uploadRes = await fetch('/api/upload-chunk', {
      method: 'POST',
      body: uploadFormData
    })
    
    const uploadData = await uploadRes.json()
    
    if (!uploadData.success) {
      throw new Error(uploadData.error || 'Failed to upload file')
    }
    
    const driveFileId = uploadData.driveFileId
    
    // Step 2: Create SOP record with driveFileId
    toast({ title: '📝 Step 2/2', description: 'Menyimpan data SOP...', duration: 2000 })
    
    const sopRes = await fetch('/api/sop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        judul: form.judul,
        kategori: form.kategori,
        jenis: form.jenis,
        tahun: form.tahun,
        status: form.status,
        fileName: file.name,
        fileType: fileExtension,
        driveFileId: driveFileId,
        isPublicSubmission: isPublic,
        submitterName: isPublic ? publicForm.nama : null,
        submitterEmail: isPublic ? publicForm.email : null,
        skipFileUpload: true
      })
    })
    
    const sopData = await sopRes.json()
    
    if (sopData.error) {
      throw new Error(sopData.error)
    }
    
    toast({ title: '✅ Berhasil', description: 'File berhasil diupload ke Google Drive!', duration: 3000 })
    resetUploadForm(isPublic)
    fetchSopFiles()
    fetchStats()
  }
  
  // Reset upload form
  const resetUploadForm = (isPublic: boolean) => {
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
  
  // ============================================
  // SMART LINK TRANSFORMER
  // ============================================
  
  // Extract File ID from any Google Drive URL format
  const extractFileIdFromUrl = (url: string): string | null => {
    // Pattern 1: /file/d/[FILE_ID]/view
    const pattern1 = /\/file\/d\/([a-zA-Z0-9_-]+)/
    // Pattern 2: /d/[FILE_ID]
    const pattern2 = /\/d\/([a-zA-Z0-9_-]+)/
    // Pattern 3: id=[FILE_ID]
    const pattern3 = /[?&]id=([a-zA-Z0-9_-]+)/
    // Pattern 4: open?id=[FILE_ID]
    const pattern4 = /open\?id=([a-zA-Z0-9_-]+)/
    
    const match = url.match(pattern1) || url.match(pattern2) || url.match(pattern3) || url.match(pattern4)
    return match ? match[1] : null
  }

  // Convert any Google Drive URL to Direct Download Link
  const convertToDirectDownloadUrl = (input: string): string => {
    // If input is already a file ID (no slashes or dots)
    if (/^[a-zA-Z0-9_-]{20,}$/.test(input)) {
      return `https://drive.google.com/uc?export=download&id=${input}`
    }
    
    // Extract file ID from URL
    const fileId = extractFileIdFromUrl(input)
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`
    }
    
    // Return as-is if can't parse
    return input
  }

  // Get Microsoft Office Viewer URL with Direct Download Link
  // Format: https://view.officeapps.live.com/op/view.aspx?src=[DIRECT_URL]
  const getMicrosoftViewerUrl = (driveFileId: string): string => {
    const directUrl = convertToDirectDownloadUrl(driveFileId)
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(directUrl)}`
  }

  // Handle Preview with Smart Logic
  const handlePreview = async (id: string) => {
    const sop = sopFiles.find(s => s.id === id)
    if (!sop) return
    
    const fileExtension = sop.fileName.toLowerCase().split('.').pop()
    
    if (!sop.driveFileId) {
      toast({ 
        title: '❌ Error', 
        description: 'File tidak tersedia di Google Drive', 
        variant: 'destructive' 
      })
      return
    }

    // ============================================
    // CONDITION 1: PDF FILES - Open directly in new tab
    // ============================================
    if (fileExtension === 'pdf') {
      const directUrl = convertToDirectDownloadUrl(sop.driveFileId)
      window.open(directUrl, '_blank')
      toast({ 
        title: '📄 Membuka PDF', 
        description: 'File PDF dibuka di tab baru',
        duration: 2000
      })
      return
    }

    // ============================================
    // CONDITION 2: EXCEL/WORD FILES - Use Microsoft Office Viewer
    // ============================================
    if (fileExtension === 'xlsx' || fileExtension === 'xls' || fileExtension === 'docx' || fileExtension === 'doc') {
      toast({ 
        title: '📊 Mempersiapkan Preview...', 
        description: 'Mengatur akses file untuk Microsoft Office Viewer',
        duration: 3000
      })

      try {
        // Call API to set file to public first
        const res = await fetch(`/api/set-public?fileId=${sop.driveFileId}`)
        const data = await res.json()

        console.log('Set public response:', data)

        // Build Microsoft Office Viewer URL with Direct Download Link
        // Direct Link: https://drive.google.com/uc?export=download&id=[FILE_ID]
        const viewerUrl = getMicrosoftViewerUrl(sop.driveFileId)

        console.log('========================================')
        console.log('📊 PREVIEW DEBUG INFO')
        console.log('========================================')
        console.log('File ID:', sop.driveFileId)
        console.log('Direct URL:', convertToDirectDownloadUrl(sop.driveFileId))
        console.log('Viewer URL:', viewerUrl)
        console.log('========================================')

        // Open in new tab for Microsoft Viewer (better experience)
        window.open(viewerUrl, '_blank')

        toast({ 
          title: '✅ Preview Dibuka', 
          description: 'File ditampilkan dengan Microsoft Office Viewer di tab baru',
          duration: 3000
        })
      } catch (error) {
        console.error('Preview error:', error)
        toast({ 
          title: '❌ Error', 
          description: 'Pastikan akses file di Google Drive sudah diatur ke "Anyone with the link" (Siapa saja dengan link).', 
          variant: 'destructive',
          duration: 5000
        })
      }
      return
    }

    // ============================================
    // OTHER FILES - Try direct download
    // ============================================
    const directUrl = convertToDirectDownloadUrl(sop.driveFileId)
    window.open(directUrl, '_blank')
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
        // Generate CSV for Excel
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
        // Generate printable HTML for PDF
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
  
  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 flex flex-col">
        {/* Header */}
        <header className="bg-black text-white p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Katalog SOP dan IK</h1>
                <p className="text-xs text-orange-300">Direktorat Kesiapsiagaan</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowLogin(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login Admin
            </Button>
          </div>
        </header>
        
        {/* Public Content */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <Card className="bg-white/95 backdrop-blur shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-orange-600">Submit SOP Publik</CardTitle>
                <CardDescription>Kirim SOP atau IK untuk diverifikasi oleh admin</CardDescription>
              </CardHeader>
              <CardContent>
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
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Jenis</Label>
                      <Select value={publicForm.jenis} onValueChange={(v) => setPublicForm({ ...publicForm, jenis: v })}>
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
                        value={publicForm.tahun}
                        onChange={(e) => setPublicForm({ ...publicForm, tahun: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={publicForm.status} onValueChange={(v) => setPublicForm({ ...publicForm, status: v })}>
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
        
        {/* Footer */}
        <footer className="bg-black text-white p-4 text-center">
          <p className="text-sm text-gray-400">created by : Foe</p>
        </footer>
        
        {/* Login Dialog */}
        <Dialog open={showLogin} onOpenChange={setShowLogin}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-orange-600">Login Admin</DialogTitle>
              <DialogDescription>Masukkan kredensial admin untuk mengakses sistem</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="admin@sop.go.id"
                  required
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input 
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-xs text-yellow-700">
                  Default: admin@sop.go.id / admin123
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowLogin(false)} className="flex-1">
                  Batal
                </Button>
                <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
                  Login
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
  
  // Main Application
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-black text-white shadow-lg sticky top-0 z-50 no-print">
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
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Katalog SOP dan IK</h1>
                <p className="text-xs text-orange-300">Direktorat Kesiapsiagaan</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-orange-300">{user?.role}</p>
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
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 overflow-hidden no-print`}>
          <nav className="p-4 space-y-2">
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
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
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
              
              {/* Google Drive Connection Status */}
              <Card className={`${driveStatus?.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {driveStatus?.connected ? (
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">Google Drive Storage</span>
                          <Badge className={driveStatus?.connected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                            {driveStatus?.connected ? 'Connected' : 'Disconnected'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {driveStatus?.message || 'Mengecek koneksi...'}
                        </p>
                        {driveStatus?.details?.folderName && (
                          <p className="text-xs text-gray-500 mt-1">
                            Folder: {driveStatus.details.folderName}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={fetchDriveStatus}
                      className="border-gray-300"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
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
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribusi per Jenis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.byJenis}
                          dataKey="count"
                          nameKey="jenis"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ jenis, count }) => `${jenis}: ${count}`}
                        >
                          <Cell fill="#f97316" />
                          <Cell fill="#eab308" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribusi per Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.byStatus}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#eab308" name="Jumlah" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              
              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upload Terbaru</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-4">
                        {stats.recentUploads.map((sop) => (
                          <div key={sop.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-800">{sop.nomorSop}</p>
                              <p className="text-sm text-gray-500">{sop.judul}</p>
                            </div>
                            <Badge variant="outline" className={STATUS_COLORS[sop.status]}>
                              {sop.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Aktivitas Terbaru</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-4">
                        {stats.recentLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-2 h-2 mt-2 rounded-full bg-orange-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{log.user?.name}</p>
                              <p className="text-sm text-gray-600">{log.deskripsi}</p>
                              <p className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString('id-ID')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
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
                <h2 className="text-2xl font-bold text-gray-800">Katalog SOP dan IK</h2>
                {user?.role === 'ADMIN' && (
                  <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah SOP/IK
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="text-orange-600">Upload SOP/IK Baru</DialogTitle>
                        <DialogDescription>Isi form berikut untuk menambahkan SOP atau IK baru</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={(e) => handleUpload(e)} className="space-y-4">
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
                              onChange={(e) => setUploadForm({ ...uploadForm, tahun: parseInt(e.target.value) })}
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
                            Upload
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
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
                          <TableHead className="font-semibold">Tanggal Upload</TableHead>
                          <TableHead className="font-semibold text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sopFiles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                              Tidak ada data
                            </TableCell>
                          </TableRow>
                        ) : (
                          sopFiles.map((sop) => (
                            <TableRow key={sop.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium text-orange-600">{sop.nomorSop}</TableCell>
                              <TableCell>{sop.judul}</TableCell>
                              <TableCell>{sop.tahun}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{sop.kategori}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={sop.jenis === 'SOP' ? 'default' : 'secondary'} className={sop.jenis === 'SOP' ? 'bg-orange-500' : 'bg-yellow-500 text-black'}>
                                  {sop.jenis}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={STATUS_COLORS[sop.status]}>
                                  {sop.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(sop.uploadedAt).toLocaleDateString('id-ID')}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => handlePreview(sop.id)} title="Preview">
                                    <Eye className="w-4 h-4 text-blue-500" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleDownload(sop.id)} title="Download">
                                    <Download className="w-4 h-4 text-green-500" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handlePrint(sop.id)} title="Print">
                                    <Printer className="w-4 h-4 text-gray-500" />
                                  </Button>
                                  {user?.role === 'ADMIN' && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost">
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
                        <p className="text-sm font-medium text-gray-600">Total Ditolak</p>
                        <p className="text-3xl font-bold text-red-600 mt-1">{stats?.totalPublikDitolak || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-red-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Table */}
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-t-lg">
                  <CardTitle className="text-lg">Daftar Pengajuan Publik</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Pengirim</TableHead>
                          <TableHead className="font-semibold">Judul</TableHead>
                          <TableHead className="font-semibold">Jenis</TableHead>
                          <TableHead className="font-semibold">Kategori</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Tanggal</TableHead>
                          <TableHead className="font-semibold text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sopFiles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                              <div className="flex flex-col items-center gap-2">
                                <FileText className="w-12 h-12 text-gray-300" />
                                <p>Tidak ada pengajuan</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          sopFiles.map((sop) => (
                            <TableRow key={sop.id} className="hover:bg-orange-50/50 transition-colors">
                              <TableCell>
                                <div>
                                  <p className="font-medium text-gray-800">{sop.submitterName}</p>
                                  <p className="text-sm text-gray-500">{sop.submitterEmail}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{sop.judul}</TableCell>
                              <TableCell>
                                <Badge className={sop.jenis === 'SOP' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-yellow-500 hover:bg-yellow-600 text-black'}>
                                  {sop.jenis}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-orange-300 text-orange-600">{sop.kategori}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  sop.verificationStatus === 'MENUNGGU' ? 'bg-blue-500 hover:bg-blue-600' :
                                  sop.verificationStatus === 'DISETUJUI' ? 'bg-green-500 hover:bg-green-600' :
                                  'bg-red-500 hover:bg-red-600'
                                }>
                                  {sop.verificationStatus}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(sop.uploadedAt).toLocaleDateString('id-ID')}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => handlePreview(sop.id)} title="Preview" className="hover:bg-blue-100">
                                    <Eye className="w-4 h-4 text-blue-500" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleDownload(sop.id)} title="Download" className="hover:bg-green-100">
                                    <Download className="w-4 h-4 text-green-500" />
                                  </Button>
                                  {sop.verificationStatus === 'MENUNGGU' && (
                                    <>
                                      <Button size="icon" variant="ghost" onClick={() => handleVerification(sop.id, 'DISETUJUI')} title="Setujui" className="hover:bg-green-100">
                                        <Check className="w-4 h-4 text-green-500" />
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={() => handleVerification(sop.id, 'DITOLAK')} title="Tolak" className="hover:bg-red-100">
                                        <X className="w-4 h-4 text-red-500" />
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
              <h2 className="text-2xl font-bold text-gray-800">Log Aktivitas</h2>
              
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 sticky top-0">
                          <TableHead className="font-semibold">Waktu</TableHead>
                          <TableHead className="font-semibold">User</TableHead>
                          <TableHead className="font-semibold">Aktivitas</TableHead>
                          <TableHead className="font-semibold">Deskripsi</TableHead>
                          <TableHead className="font-semibold">File</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                              Tidak ada log
                            </TableCell>
                          </TableRow>
                        ) : (
                          logs.map((log) => (
                            <TableRow key={log.id} className="hover:bg-gray-50">
                              <TableCell className="text-sm">
                                {new Date(log.createdAt).toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{log.user?.name}</p>
                                  <p className="text-xs text-gray-500">{log.user?.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  log.aktivitas === 'LOGIN' ? 'bg-blue-100 text-blue-800' :
                                  log.aktivitas === 'UPLOAD' ? 'bg-green-100 text-green-800' :
                                  log.aktivitas === 'DOWNLOAD' ? 'bg-purple-100 text-purple-800' :
                                  log.aktivitas === 'PREVIEW' ? 'bg-cyan-100 text-cyan-800' :
                                  log.aktivitas === 'VERIFIKASI' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {log.aktivitas}
                                </Badge>
                              </TableCell>
                              <TableCell>{log.deskripsi}</TableCell>
                              <TableCell>
                                {log.sopFile && (
                                  <span className="text-sm text-orange-600">{log.sopFile.nomorSop}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
              
              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Menampilkan {logs.length} log
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
                  <span className="text-sm">Halaman {logsPagination.page}</span>
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
          {currentPage === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Manajemen User</h2>
                <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-orange-600">Tambah User Baru</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <Label>Nama Lengkap</Label>
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
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Nama</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                        <TableHead className="font-semibold">Tanggal Dibuat</TableHead>
                        <TableHead className="font-semibold text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                            Tidak ada user
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow key={u.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'} className={u.role === 'ADMIN' ? 'bg-orange-500' : ''}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                {u.id !== user?.id && (
                                  <Button size="icon" variant="ghost" onClick={() => handleDeleteUser(u.id)} title="Hapus">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                )}
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
          
          {/* Upload SOP */}
          {currentPage === 'upload' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Upload SOP/IK</h2>
              
              <Card>
                <CardHeader>
                  <CardTitle>Form Upload SOP/IK Baru</CardTitle>
                  <CardDescription>Isi form berikut untuk menambahkan SOP atau IK baru ke katalog</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => handleUpload(e)} className="space-y-6">
                    {/* Important Instruction */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-orange-800 font-medium">
                        ⚠️ Penting: Pastikan file/folder di Google Drive sudah di-set ke 
                        <strong> "Anyone with the link" (Pengakses Lihat-Saja) </strong> 
                        agar preview dapat ditampilkan dengan benar.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Judul SOP/IK *</Label>
                      <Input 
                        value={uploadForm.judul}
                        onChange={(e) => setUploadForm({ ...uploadForm, judul: e.target.value })}
                        placeholder="Masukkan judul SOP atau IK"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Kategori *</Label>
                        <Select value={uploadForm.kategori} onValueChange={(v) => setUploadForm({ ...uploadForm, kategori: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Jenis *</Label>
                        <Select value={uploadForm.jenis} onValueChange={(v) => setUploadForm({ ...uploadForm, jenis: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {JENIS_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Tahun *</Label>
                        <Input 
                          type="number"
                          value={uploadForm.tahun}
                          onChange={(e) => setUploadForm({ ...uploadForm, tahun: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Status *</Label>
                        <Select value={uploadForm.status} onValueChange={(v) => setUploadForm({ ...uploadForm, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Upload File (Excel/PDF) *</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
                        <Input 
                          type="file"
                          accept=".xlsx,.pdf"
                          onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                          className="cursor-pointer"
                        />
                        {uploadForm.file && (
                          <p className="mt-2 text-sm text-green-600">File dipilih: {uploadForm.file.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button type="button" variant="outline" onClick={() => setUploadForm({
                        judul: '', kategori: 'SIAGA', jenis: 'SOP',
                        tahun: new Date().getFullYear(), status: 'AKTIF', file: null
                      })}>
                        Reset
                      </Button>
                      <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
      
      {/* Footer */}
      <footer className="bg-black text-white p-4 text-center mt-auto no-print">
        <p className="text-sm text-gray-400">created by : Foe</p>
      </footer>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-orange-600">Preview File: {previewData?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {previewData?.type === 'pdf' ? (
              <iframe 
                src={`data:application/pdf;base64,${previewData.data}`}
                className="w-full h-[60vh]"
                title="PDF Preview"
              />
            ) : (
              <div className="text-center py-8">
                <FileSpreadsheet className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                <p className="text-gray-600">Preview file Excel tidak tersedia di browser.</p>
                <p className="text-sm text-gray-400 mt-2">Silakan download file untuk melihat isinya.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
