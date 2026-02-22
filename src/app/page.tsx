'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  ChevronDown,
  Printer,
  Send,
  Cloud,
  ArrowRightLeft,
  Loader2,
  Shield,
  Radio,
  Activity,
  Zap,
  Target,
  Award
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { StorageStatus } from '@/components/storage'

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
  previewCount?: number
  downloadCount?: number
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
  totalPreviews: number
  totalDownloads: number
  byTahun: { tahun: number; count: number }[]
  byKategori: { kategori: string; count: number }[]
  byJenis: { jenis: string; count: number }[]
  byStatus: { status: string; count: number }[]
  recentUploads: SopFile[]
  recentLogs: LogEntry[]
  topViewed: SopFile[]
  topDownloaded: SopFile[]
  recentActivity: { aktivitas: string; count: number }[]
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

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
}

const slideInLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
}

// Shimmer Title Component with yellow glow
function ShimmerTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="relative">
      <h2 className="text-2xl font-bold relative inline-block">
        {/* Glow effect */}
        <motion.span
          className="absolute inset-0 blur-xl bg-yellow-400/50 rounded-lg"
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.05, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        
        {/* Main text with shimmer */}
        <span className="relative bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
          {children}
        </span>
        
        {/* Shimmer overlay */}
        <motion.span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent bg-clip-text text-transparent"
          style={{ backgroundSize: '200% 100%' }}
          animate={{
            backgroundPosition: ['200% 0', '-200% 0']
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          {children}
        </motion.span>
      </h2>
      {subtitle && (
        <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
      )}
    </div>
  )
}

// SAR Logo Component with animations
function SARLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }
  
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <motion.div 
      className={`relative ${sizeClasses[size]} rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 flex items-center justify-center overflow-hidden shadow-lg`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Animated shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
      
      {/* Sparkle particles */}
      <motion.div 
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 0%, transparent 2px)',
            'radial-gradient(circle at 80% 70%, rgba(255,255,255,0.8) 0%, transparent 2px)',
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, transparent 2px)',
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 0%, transparent 2px)'
          ]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      
      {/* Rescue beacon pulse */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(249, 115, 22, 0.4)',
            '0 0 0 10px rgba(249, 115, 22, 0)',
            '0 0 0 0 rgba(249, 115, 22, 0)'
          ]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut'
        }}
      />
      
      {/* Logo icon */}
      <Shield className={`${iconSizes[size]} text-white relative z-10`} />
    </motion.div>
  )
}

// Animated Stat Card Component
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  delay = 0,
  trend
}: { 
  title: string
  value: number | string
  icon: React.ElementType
  color: string
  delay?: number
  trend?: 'up' | 'down'
}) {
  const colorClasses: Record<string, { bg: string; icon: string; text: string; border: string; titleText: string }> = {
    orange: { 
      bg: 'from-white to-orange-50', 
      icon: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white', 
      text: 'text-orange-700', 
      border: 'border-orange-200',
      titleText: 'text-gray-800'
    },
    yellow: { 
      bg: 'from-white to-yellow-50', 
      icon: 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white', 
      text: 'text-yellow-700', 
      border: 'border-yellow-200',
      titleText: 'text-gray-800'
    },
    green: { 
      bg: 'from-white to-green-50', 
      icon: 'bg-gradient-to-br from-green-400 to-green-600 text-white', 
      text: 'text-green-700', 
      border: 'border-green-200',
      titleText: 'text-gray-800'
    },
    red: { 
      bg: 'from-white to-red-50', 
      icon: 'bg-gradient-to-br from-red-400 to-red-600 text-white', 
      text: 'text-red-700', 
      border: 'border-red-200',
      titleText: 'text-gray-800'
    },
    cyan: { 
      bg: 'from-white to-cyan-50', 
      icon: 'bg-gradient-to-br from-cyan-400 to-cyan-600 text-white', 
      text: 'text-cyan-700', 
      border: 'border-cyan-200',
      titleText: 'text-gray-800'
    },
    purple: { 
      bg: 'from-white to-purple-50', 
      icon: 'bg-gradient-to-br from-purple-400 to-purple-600 text-white', 
      text: 'text-purple-700', 
      border: 'border-purple-200',
      titleText: 'text-gray-800'
    },
  }
  
  const c = colorClasses[color] || colorClasses.orange

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className={`stat-card bg-gradient-to-br ${c.bg} border-2 ${c.border} overflow-hidden shadow-xl`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-bold ${c.titleText}`}>{title}</p>
              <motion.p 
                className={`text-3xl font-bold ${c.text} mt-2`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: delay + 0.2, type: 'spring' }}
              >
                {value}
              </motion.p>
              {trend && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
                  <span>{trend === 'up' ? 'Naik' : 'Turun'}</span>
                </div>
              )}
            </div>
            <motion.div 
              className={`w-14 h-14 ${c.icon} rounded-xl flex items-center justify-center shadow-lg`}
              whileHover={{ rotate: 5, scale: 1.1 }}
            >
              <Icon className="w-7 h-7" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Pre-computed particle positions for SSR safety
const PARTICLE_POSITIONS = [
  { left: 10, top: 20, duration: 3.2, delay: 0.5 },
  { left: 25, top: 45, duration: 4.1, delay: 1.2 },
  { left: 40, top: 15, duration: 3.5, delay: 0.8 },
  { left: 55, top: 70, duration: 4.5, delay: 1.5 },
  { left: 70, top: 35, duration: 3.8, delay: 0.3 },
  { left: 85, top: 60, duration: 4.2, delay: 1.8 },
  { left: 15, top: 80, duration: 3.6, delay: 0.9 },
  { left: 30, top: 10, duration: 4.0, delay: 1.1 },
  { left: 45, top: 55, duration: 3.4, delay: 0.4 },
  { left: 60, top: 25, duration: 4.3, delay: 1.6 },
  { left: 75, top: 85, duration: 3.9, delay: 0.7 },
  { left: 90, top: 40, duration: 4.4, delay: 1.3 },
  { left: 5, top: 50, duration: 3.3, delay: 0.2 },
  { left: 20, top: 65, duration: 4.6, delay: 1.9 },
  { left: 35, top: 30, duration: 3.7, delay: 0.6 },
  { left: 50, top: 90, duration: 4.8, delay: 1.4 },
  { left: 65, top: 5, duration: 3.1, delay: 1.0 },
  { left: 80, top: 75, duration: 4.7, delay: 0.1 },
  { left: 95, top: 95, duration: 3.0, delay: 1.7 },
  { left: 12, top: 42, duration: 4.9, delay: 0.85 },
]

// SAR Animated Background
function SARBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 sar-grid-pattern opacity-30" />
      
      {/* Floating particles - using pre-computed positions for SSR safety */}
      {PARTICLE_POSITIONS.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-orange-400/30 rounded-full"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay
          }}
        />
      ))}
      
      {/* Search light effect */}
      <motion.div
        className="absolute top-0 left-0 w-full h-full"
        style={{
          background: 'linear-gradient(135deg, transparent 40%, rgba(249, 115, 22, 0.03) 50%, transparent 60%)'
        }}
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
      
      {/* Radar sweep effect */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(249, 115, 22, 0.05) 30deg, transparent 60deg)'
        }}
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  )
}

// Main App Component
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
  const [verificationList, setVerificationList] = useState<SopFile[]>([])
  
  // Pagination
  const [sopPagination, setSopPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  
  // Filters
  const [sopFilters, setSopFilters] = useState({
    search: '',
    kategori: 'SEMUA',
    jenis: 'SEMUA',
    status: 'SEMUA',
    tahun: ''
  })
  
  // Sorting
  const [sortBy, setSortBy] = useState<'tahun-asc' | 'tahun-desc' | 'uploadedAt-desc' | 'uploadedAt-asc' | 'judul-asc' | 'judul-desc'>('tahun-asc')
  
  // Debounced search for live search
  const [searchInput, setSearchInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  
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
  
  // Edit Dialog
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editData, setEditData] = useState<SopFile | null>(null)
  const [editForm, setEditForm] = useState({
    judul: '',
    kategori: 'SIAGA',
    jenis: 'SOP',
    tahun: new Date().getFullYear(),
    status: 'AKTIF'
  })

  // Excel Edit Dialog (Microsoft 365 - No user login required)
  const [showExcelEditDialog, setShowExcelEditDialog] = useState(false)
  const [excelEditData, setExcelEditData] = useState<SopFile | null>(null)
  const [excelEditLoading, setExcelEditLoading] = useState(false)
  const [excelEditUrl, setExcelEditUrl] = useState<string | null>(null)
  const [excelEditDriveItemId, setExcelEditDriveItemId] = useState<string | null>(null)
  const [excelEditSessionId, setExcelEditSessionId] = useState<string | null>(null)
  const [excelEditSyncing, setExcelEditSyncing] = useState(false)
  
  // Desktop Excel Edit Session
  const [desktopEditSessionToken, setDesktopEditSessionToken] = useState<string | null>(null)
  const [desktopEditOriginalHash, setDesktopEditOriginalHash] = useState<string | null>(null)
  const [showDesktopSyncDialog, setShowDesktopSyncDialog] = useState(false)
  const [desktopSyncFile, setDesktopSyncFile] = useState<File | null>(null)
  const [desktopSyncing, setDesktopSyncing] = useState(false)
  
  // Conflict handling for Desktop Sync
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [conflictData, setConflictData] = useState<{
    sessionId: string
    message: string
    lastEditor?: {
      email: string
      name: string | null
      syncedAt: string
    }
    originalHash: string
    currentHash: string
  } | null>(null)
  const [forceSyncing, setForceSyncing] = useState(false)

  // Google Drive connection status
  const [driveStatus, setDriveStatus] = useState<{
    connected: boolean
    status: string
    message: string
    requiresReconnect?: boolean
    needsSetup?: boolean
    details?: {
      folderId?: string
      folderName?: string
      folderOwner?: string
      tokenValid?: boolean
      lastChecked?: string
      missingCredentials?: string[]
      setupInstructions?: Record<string, string>
    }
  } | null>(null)

  // R2 Storage status
  const [r2Status, setR2Status] = useState<{
    connected: boolean
    status: string
    message: string
    details?: {
      bucket?: string
      accountId?: string
    }
    setupInstructions?: string[]
  } | null>(null)

  // Sync state
  const [syncStatus, setSyncStatus] = useState<{
    isSyncing: boolean
    progress: number
    currentStep: string
    direction: 'drive-to-r2' | 'r2-to-drive' | 'bidirectional' | null
    result?: {
      success: boolean
      totalFiles?: number
      migratedFiles?: number
      syncedFiles?: number
      skippedFiles?: number
      errorFiles?: number
      errors?: { filename: string; error: string }[]
    }
    lastSync?: string | null
  }>({
    isSyncing: false,
    progress: 0,
    currentStep: '',
    direction: null,
    lastSync: null
  })

  // Last sync result for UI display
  const [lastSyncResult, setLastSyncResult] = useState<{
    r2: 'synced' | 'pending' | 'error'
    googleDrive: 'synced' | 'pending' | 'error'
    timestamp?: Date
  } | null>(null)

  // Auto-backup state
  const [autoBackupStatus, setAutoBackupStatus] = useState<{
    isBackingUp: boolean
    progress: number
    currentStep: string
    result?: {
      success: boolean
      hasChanges: boolean
      totalChecked: number
      newFilesBackedUp: number
      modifiedFilesBackedUp: number
      skippedFiles: number
      errors: { filename: string; error: string }[]
      message: string
    }
    checkResult?: {
      needsBackup: boolean
      newFilesCount: number
      modifiedFilesCount: number
      unchangedFilesCount: number
    }
  }>({
    isBackingUp: false,
    progress: 0,
    currentStep: '',
  })

  // Excel Edit Diagnostic state
  const [showDiagnosticDialog, setShowDiagnosticDialog] = useState(false)
  const [diagnosticLoading, setDiagnosticLoading] = useState(false)
  const [diagnosticResult, setDiagnosticResult] = useState<{
    success: boolean
    message: string
    results: {
      step: string
      success: boolean
      message: string
      details?: Record<string, unknown>
      error?: string
      duration?: number
    }[]
    summary: {
      totalSteps: number
      passed: number
      failed: number
    }
    nextSteps: string[]
  } | null>(null)
  
  const checkAuth = useCallback(async () => {
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
  }, [])
  
  const initSystem = useCallback(async () => {
    try {
      await fetch('/api/init')
    } catch (error) {
      console.error('Init error:', error)
    }
  }, [])
  
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      if (!data.error) setStats(data)
    } catch (error) {
      console.error('Stats error:', error)
    }
  }, [])
  
  const fetchDriveStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/drive/status')
      const data = await res.json()
      setDriveStatus(data)
    } catch (error) {
      console.error('Drive status error:', error)
    }
  }, [])

  const fetchR2Status = useCallback(async () => {
    try {
      const res = await fetch('/api/r2/status')
      const data = await res.json()
      setR2Status(data)
    } catch (error) {
      console.error('R2 status error:', error)
    }
  }, [])

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/status')
      const data = await res.json()
      if (data.success && data.stats) {
        setSyncStatus(prev => ({
          ...prev,
          lastSync: data.stats.lastSync
        }))
      }
    } catch (error) {
      console.error('Sync status error:', error)
    }
  }, [])

  // Sync handler
  const handleSync = async (direction: 'drive-to-r2' | 'r2-to-drive' | 'bidirectional' = 'bidirectional') => {
    if (!driveStatus?.connected || !r2Status?.connected) {
      toast({
        title: '⚠️ Storage Tidak Siap',
        description: 'Pastikan Google Drive dan Cloudflare R2 terhubung sebelum sync',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    setSyncStatus(prev => ({
      ...prev,
      isSyncing: true,
      progress: 0,
      direction,
      currentStep: 'Mempersiapkan sync...',
      result: undefined
    }))

    const progressSteps = [
      { progress: 10, step: 'Menghubungkan ke Google Drive...' },
      { progress: 20, step: 'Menghubungkan ke Cloudflare R2...' },
      { progress: 30, step: 'Memeriksa file di Google Drive...' },
      { progress: 40, step: 'Memeriksa file di Cloudflare R2...' },
      { progress: 50, step: 'Membandingkan file...' },
      { progress: 60, step: 'Sinkronisasi file...' },
      { progress: 80, step: 'Menyelesaikan sync...' },
    ]

    const progressInterval = setInterval(() => {
      setSyncStatus(prev => {
        if (prev.progress >= 85) return prev
        const nextStep = progressSteps.find(s => s.progress > prev.progress)
        if (nextStep) {
          return {
            ...prev,
            progress: nextStep.progress,
            currentStep: nextStep.step
          }
        }
        return prev
      })
    }, 800)

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', direction })
      })
      
      const data = await res.json()
      
      clearInterval(progressInterval)
      
      if (data.success) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          progress: 100,
          currentStep: 'Sync selesai!',
          result: {
            success: true,
            totalFiles: data.result?.driveToR2 + data.result?.r2ToDrive,
            syncedFiles: data.result?.driveToR2 + data.result?.r2ToDrive,
            errorFiles: data.result?.errors?.length || 0,
            errors: data.result?.errors
          }
        }))

        toast({
          title: '✅ Sync Berhasil!',
          description: `${data.result?.driveToR2 || 0} file Drive→R2, ${data.result?.r2ToDrive || 0} file R2→Drive`,
          duration: 5000
        })
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (error) {
      clearInterval(progressInterval)
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        progress: 0,
        currentStep: '',
        result: {
          success: false,
          errorFiles: 1,
          errors: [{ filename: 'sync', error: error instanceof Error ? error.message : 'Unknown error' }]
        }
      }))

      toast({
        title: '❌ Sync Gagal',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat sync',
        variant: 'destructive',
        duration: 5000
      })
    }

    fetchSyncStatus()
  }

  // Migration handler
  const handleMigrate = async (dryRun: boolean = false) => {
    if (!driveStatus?.connected || !r2Status?.connected) {
      toast({
        title: '⚠️ Storage Tidak Siap',
        description: 'Pastikan Google Drive dan Cloudflare R2 terhubung sebelum migrasi',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    setSyncStatus(prev => ({
      ...prev,
      isSyncing: true,
      progress: 0,
      direction: 'drive-to-r2',
      currentStep: dryRun ? 'Simulasi migrasi...' : 'Memulai migrasi...',
      result: undefined
    }))

    const progressSteps = [
      { progress: 10, step: 'Menghubungkan ke Google Drive...' },
      { progress: 25, step: 'Membaca daftar file...' },
      { progress: 40, step: 'Memeriksa file yang sudah ada...' },
      { progress: 55, step: 'Mengunduh file dari Google Drive...' },
      { progress: 70, step: 'Mengunggah ke Cloudflare R2...' },
      { progress: 85, step: 'Menyimpan data sync...' },
    ]

    const progressInterval = setInterval(() => {
      setSyncStatus(prev => {
        if (prev.progress >= 85) return prev
        const nextStep = progressSteps.find(s => s.progress > prev.progress)
        if (nextStep) {
          return {
            ...prev,
            progress: nextStep.progress,
            currentStep: nextStep.step
          }
        }
        return prev
      })
    }, 1000)

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate', dryRun })
      })
      
      const data = await res.json()
      
      clearInterval(progressInterval)
      
      if (data.success) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          progress: 100,
          currentStep: dryRun ? 'Simulasi selesai!' : 'Migrasi selesai!',
          result: {
            success: true,
            totalFiles: data.result?.totalFiles,
            migratedFiles: data.result?.migratedFiles,
            skippedFiles: data.result?.skippedFiles,
            errorFiles: data.result?.errorFiles,
            errors: data.result?.errors
          }
        }))

        toast({
          title: dryRun ? '📋 Simulasi Selesai' : '✅ Migrasi Berhasil!',
          description: dryRun 
            ? `${data.result?.totalFiles || 0} file siap untuk dimigrasi`
            : `${data.result?.migratedFiles || 0} file berhasil dimigrasi, ${data.result?.skippedFiles || 0} dilewati`,
          duration: 5000
        })
      } else {
        throw new Error(data.error || 'Migration failed')
      }
    } catch (error) {
      clearInterval(progressInterval)
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        progress: 0,
        currentStep: '',
        result: {
          success: false,
          errorFiles: 1,
          errors: [{ filename: 'migrate', error: error instanceof Error ? error.message : 'Unknown error' }]
        }
      }))

      toast({
        title: '❌ Migrasi Gagal',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat migrasi',
        variant: 'destructive',
        duration: 5000
      })
    }

    fetchSyncStatus()
  }

  // Auto-backup handler
  const handleAutoBackup = async () => {
    if (!driveStatus?.connected || !r2Status?.connected) {
      toast({
        title: '⚠️ Storage Tidak Siap',
        description: 'Pastikan Google Drive dan Cloudflare R2 terhubung sebelum backup',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    setSyncStatus(prev => ({
      ...prev,
      isSyncing: true,
      progress: 0,
      currentStep: 'Memeriksa perubahan file...',
      direction: 'r2-to-drive'
    }))

    setAutoBackupStatus(prev => ({
      ...prev,
      isBackingUp: true,
      progress: 0,
      currentStep: 'Memeriksa perubahan file...',
      result: undefined,
      checkResult: undefined
    }))

    const progressSteps = [
      { progress: 10, step: 'Menghubungkan ke Cloudflare R2...' },
      { progress: 20, step: 'Memeriksa file di R2...' },
      { progress: 35, step: 'Membandingkan dengan Google Drive...' },
      { progress: 50, step: 'Mendeteksi file baru dan yang berubah...' },
      { progress: 65, step: 'Memproses backup...' },
      { progress: 80, step: 'Menyelesaikan backup...' },
    ]

    const progressInterval = setInterval(() => {
      setAutoBackupStatus(prev => {
        if (prev.progress >= 85) return prev
        const nextStep = progressSteps.find(s => s.progress > prev.progress)
        if (nextStep) {
          setSyncStatus(s => ({
            ...s,
            progress: nextStep.progress,
            currentStep: nextStep.step
          }))
          return {
            ...prev,
            progress: nextStep.progress,
            currentStep: nextStep.step
          }
        }
        return prev
      })
    }, 700)

    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' })
      })
      
      const data = await res.json()
      
      clearInterval(progressInterval)
      
      if (data.success) {
        const result = data.result
        
        setLastSyncResult({
          r2: 'synced',
          googleDrive: 'synced',
          timestamp: new Date()
        })

        setAutoBackupStatus(prev => ({
          ...prev,
          isBackingUp: false,
          progress: 100,
          currentStep: result.hasChanges ? 'Backup selesai!' : 'Tidak ada perubahan',
          result: {
            success: result.success,
            hasChanges: result.hasChanges,
            totalChecked: result.totalChecked,
            newFilesBackedUp: result.newFilesBackedUp,
            modifiedFilesBackedUp: result.modifiedFilesBackedUp,
            skippedFiles: result.skippedFiles,
            errors: result.errors,
            message: result.message
          }
        }))

        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          progress: 100,
          currentStep: result.hasChanges ? 'Backup selesai!' : 'Tidak ada perubahan'
        }))

        setTimeout(() => {
          setSyncStatus(prev => ({
            ...prev,
            progress: 0,
            currentStep: ''
          }))
        }, 2000)

        if (result.hasChanges) {
          toast({
            title: '✅ Backup Berhasil!',
            description: `${result.newFilesBackedUp} file baru, ${result.modifiedFilesBackedUp} file diperbarui, ${result.skippedFiles} tidak berubah`,
            duration: 5000
          })
        } else {
          toast({
            title: '✅ Tidak Ada Perubahan',
            description: 'Semua file sudah up-to-date. Tidak ada file yang perlu di-backup.',
            duration: 5000
          })
        }
      } else {
        throw new Error(data.error || 'Backup failed')
      }
    } catch (error) {
      clearInterval(progressInterval)
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        progress: 0,
        currentStep: ''
      }))
      
      setAutoBackupStatus(prev => ({
        ...prev,
        isBackingUp: false,
        progress: 0,
        currentStep: '',
        result: {
          success: false,
          hasChanges: false,
          totalChecked: 0,
          newFilesBackedUp: 0,
          modifiedFilesBackedUp: 0,
          skippedFiles: 0,
          errors: [{ filename: 'backup', error: error instanceof Error ? error.message : 'Unknown error' }],
          message: 'Backup gagal'
        }
      }))

      toast({
        title: '❌ Backup Gagal',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat backup',
        variant: 'destructive',
        duration: 5000
      })
    }

    fetchSyncStatus()
  }

  // Run Excel Edit Diagnostic
  const handleRunDiagnostic = useCallback(async () => {
    setShowDiagnosticDialog(true)
    setDiagnosticLoading(true)
    setDiagnosticResult(null)

    try {
      const res = await fetch('/api/excel-edit/diagnose')
      const data = await res.json()

      setDiagnosticResult(data)

      if (data.success) {
        toast({
          title: '✅ Diagnostik Berhasil',
          description: 'Semua komponen Excel Edit System berfungsi dengan baik.',
          duration: 5000
        })
      } else {
        toast({
          title: '⚠️ Diagnostik Gagal',
          description: `Terdapat ${data.summary?.failed || 0} masalah yang perlu diperbaiki.`,
          variant: 'destructive',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Diagnostic error:', error)
      toast({
        title: '❌ Error',
        description: 'Gagal menjalankan diagnostik',
        variant: 'destructive',
        duration: 5000
      })
    }
    setDiagnosticLoading(false)
  }, [toast])
  
  const fetchSopFiles = useCallback(async (resetPage = false) => {
    try {
      const page = resetPage ? 1 : sopPagination.page
      const params = new URLSearchParams()
      if (sopFilters.search) params.append('search', sopFilters.search)
      if (sopFilters.kategori && sopFilters.kategori !== 'SEMUA') params.append('kategori', sopFilters.kategori)
      if (sopFilters.jenis && sopFilters.jenis !== 'SEMUA') params.append('jenis', sopFilters.jenis)
      if (sopFilters.status && sopFilters.status !== 'SEMUA') params.append('status', sopFilters.status)
      if (sopFilters.tahun) params.append('tahun', sopFilters.tahun)
      params.append('page', page.toString())
      params.append('limit', sopPagination.limit.toString())
      
      const res = await fetch(`/api/sop?${params}`)
      const data = await res.json()
      if (!data.error) {
        setSopFiles(data.data)
        setSopPagination(p => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages, page }))
      }
    } catch (error) {
      console.error('Fetch SOP error:', error)
    }
  }, [sopFilters, sopPagination.page, sopPagination.limit])
  
  const fetchVerificationList = useCallback(async (filter = 'SEMUA') => {
    try {
      const params = new URLSearchParams()
      params.append('publicOnly', 'true')
      if (filter !== 'SEMUA') {
        params.append('verificationStatus', filter)
      }
      
      const res = await fetch(`/api/sop?${params}`)
      const data = await res.json()
      if (!data.error) {
        setVerificationList(data.data)
      }
    } catch (error) {
      console.error('Fetch verification error:', error)
    }
  }, [])
  
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: logsPagination.page.toString(),
        limit: logsPagination.limit.toString()
      })
      
      const res = await fetch(`/api/logs?${params}`)
      const data = await res.json()
      if (!data.error) {
        setLogs(data.data)
        setLogsPagination(p => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages }))
      }
    } catch (error) {
      console.error('Fetch logs error:', error)
    }
  }, [logsPagination.page, logsPagination.limit])
  
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (!data.error) setUsers(data.data)
    } catch (error) {
      console.error('Fetch users error:', error)
    }
  }, [])
  
  // Check auth on mount
  useEffect(() => {
    checkAuth()
    initSystem()
  }, [checkAuth, initSystem])
  
  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchStats()
      
      fetchDriveStatus()
      fetchR2Status()
      fetchSyncStatus()
      
      if (currentPage === 'katalog') fetchSopFiles()
      if (currentPage === 'verifikasi') fetchVerificationList(verificationFilter)
      if (currentPage === 'logs') fetchLogs()
      if (currentPage === 'users' && user.role === 'ADMIN') fetchUsers()
    }
  }, [isAuthenticated, user, currentPage, sopPagination.page, logsPagination.page, verificationFilter, fetchStats, fetchDriveStatus, fetchR2Status, fetchSyncStatus, fetchSopFiles, fetchVerificationList, fetchLogs, fetchUsers])
  
  // Live search with debounce - direct API call
  useEffect(() => {
    if (!isAuthenticated || currentPage !== 'katalog') return
    
    // Debounce timer for live search
    const debounceTimer = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        if (searchInput) params.append('search', searchInput)
        if (sopFilters.kategori && sopFilters.kategori !== 'SEMUA') params.append('kategori', sopFilters.kategori)
        if (sopFilters.jenis && sopFilters.jenis !== 'SEMUA') params.append('jenis', sopFilters.jenis)
        if (sopFilters.status && sopFilters.status !== 'SEMUA') params.append('status', sopFilters.status)
        if (sopFilters.tahun) params.append('tahun', sopFilters.tahun)
        params.append('sortBy', sortBy)
        params.append('page', '1')
        params.append('limit', sopPagination.limit.toString())
        
        const res = await fetch(`/api/sop?${params}`)
        const data = await res.json()
        if (!data.error) {
          setSopFiles(data.data)
          setSopPagination(p => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages, page: 1 }))
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 500) // 500ms debounce delay
    
    return () => clearTimeout(debounceTimer)
  }, [searchInput, sopFilters.kategori, sopFilters.jenis, sopFilters.status, sopFilters.tahun, sortBy, isAuthenticated, currentPage, sopPagination.limit])
  
  // Reset page when non-search filters change
  useEffect(() => {
    if (isAuthenticated && currentPage === 'katalog') {
      setSopPagination(p => ({ ...p, page: 1 }))
      setIsSearching(true)
    }
  }, [sopFilters.kategori, sopFilters.jenis, sopFilters.status, sopFilters.tahun, sortBy, isAuthenticated, currentPage])
  
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
  
  const handleUpload = async (e: React.FormEvent, isPublic = false) => {
    e.preventDefault()
    const form = isPublic ? publicForm : uploadForm
    if (!form.file) {
      toast({ title: 'Error', description: 'File diperlukan', variant: 'destructive' })
      return
    }
    
    setLoading(true)
    
    const LARGE_FILE_THRESHOLD = 4 * 1024 * 1024
    const VERCEL_MAX_LIMIT = 4.5 * 1024 * 1024
    const isLargeFile = form.file.size > LARGE_FILE_THRESHOLD
    
    try {
      if (form.file.size > VERCEL_MAX_LIMIT) {
        toast({ 
          title: '⚠️ File Terlalu Besar', 
          description: `File (${(form.file.size / 1024 / 1024).toFixed(2)} MB) melebihi batas upload (4.5 MB). Silakan upload file ke Google Drive secara manual, lalu hubungi admin untuk menambahkan file ke katalog.`, 
          variant: 'destructive',
          duration: 8000
        })
        setLoading(false)
        return
      }
      
      if (isLargeFile) {
        toast({ title: '📤 Upload File', description: `Mengupload file (${(form.file.size / 1024 / 1024).toFixed(2)} MB)...`, duration: 5000 })
        await handleProxyUpload(form, isPublic)
      } else {
        await handleSmallFileUpload(form, isPublic)
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({ title: 'Error', description: 'Terjadi kesalahan saat upload', variant: 'destructive' })
    }
    setLoading(false)
  }
  
  const handleSmallFileUpload = async (form: typeof uploadForm | typeof publicForm, isPublic: boolean) => {
    const uploadingToast = toast({ 
      title: '📤 Mengupload File...', 
      description: 'Mengupload ke Cloudflare R2 & Google Drive',
      duration: 60000
    })

    setSyncStatus(prev => ({
      ...prev,
      isSyncing: true,
      progress: 20,
      currentStep: 'Mengupload ke R2...',
      direction: 'r2-to-drive'
    }))

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

    setSyncStatus(prev => ({
      ...prev,
      progress: 40,
      currentStep: 'Menyinkronkan ke Google Drive...'
    }))
    
    const res = await fetch('/api/sop', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    
    if (data.error) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        progress: 0,
        currentStep: ''
      }))
      toast({ title: 'Error', description: data.error, variant: 'destructive' })
    } else {
      const syncResult = data.syncStatus
      const r2StatusText = syncResult?.r2 === 'synced' ? '✅ R2' : '⏳ R2'
      const driveStatus = syncResult?.googleDrive === 'synced' ? '✅ Google Drive' : '⏳ Google Drive'

      setLastSyncResult({
        r2: syncResult?.r2 || 'pending',
        googleDrive: syncResult?.googleDrive || 'pending',
        timestamp: new Date()
      })
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        progress: 100,
        currentStep: 'Upload selesai!'
      }))

      setTimeout(() => {
        setSyncStatus(prev => ({
          ...prev,
          progress: 0,
          currentStep: ''
        }))
      }, 2000)

      toast({ 
        title: '✅ Upload Berhasil!', 
        description: `${r2StatusText} | ${driveStatus}`,
        duration: 5000
      })
      resetUploadForm(isPublic)
      fetchSopFiles()
      fetchStats()
      fetchSyncStatus()
    }
  }
  
  const handleProxyUpload = async (form: typeof uploadForm | typeof publicForm, isPublic: boolean) => {
    const file = form.file!
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
    }
    const mimeType = mimeTypes[fileExtension] || 'application/octet-stream'

    setSyncStatus(prev => ({
      ...prev,
      isSyncing: true,
      progress: 10,
      currentStep: 'Mengupload ke Google Drive...',
      direction: 'drive-to-r2'
    }))
    
    toast({ title: '📤 Step 1/3', description: `Mengupload file (${(file.size / 1024 / 1024).toFixed(2)} MB) ke Google Drive...`, duration: 5000 })
    
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
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        progress: 0,
        currentStep: ''
      }))
      throw new Error(uploadData.error || 'Failed to upload file')
    }
    
    const driveFileId = uploadData.driveFileId

    setSyncStatus(prev => ({
      ...prev,
      progress: 50,
      currentStep: 'Menyinkronkan ke R2...'
    }))
    
    toast({ title: '📝 Step 2/3', description: 'Menyimpan data & sync ke R2...', duration: 3000 })
    
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
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        progress: 0,
        currentStep: ''
      }))
      throw new Error(sopData.error)
    }

    const syncResult = sopData.syncStatus
    const r2StatusText = syncResult?.r2 === 'synced' ? '✅ R2' : '⏳ R2'
    const driveStatusText = syncResult?.googleDrive === 'synced' ? '✅ Google Drive' : '⏳ Google Drive'

    setLastSyncResult({
      r2: syncResult?.r2 || 'pending',
      googleDrive: syncResult?.googleDrive || 'pending',
      timestamp: new Date()
    })

    setSyncStatus(prev => ({
      ...prev,
      isSyncing: false,
      progress: 100,
      currentStep: 'Upload selesai!'
    }))

    setTimeout(() => {
      setSyncStatus(prev => ({
        ...prev,
        progress: 0,
        currentStep: ''
      }))
    }, 2000)
    
    toast({ 
      title: '✅ Upload Berhasil!', 
      description: `${r2StatusText} | ${driveStatusText}`,
      duration: 5000 
    })
    resetUploadForm(isPublic)
    fetchSopFiles()
    fetchStats()
    fetchSyncStatus()
  }
  
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
  
  // Download file dari Cloudflare R2
  const handleDownload = async (id: string) => {
    const sop = sopFiles.find(s => s.id === id)
    
    if (!sop?.filePath) {
      toast({
        title: '⚠️ File Tidak Tersedia',
        description: 'File tidak ditemukan di storage.',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    try {
      toast({ title: '📥 Mengunduh...', description: 'Mempersiapkan file dari Cloudflare R2...' })
      
      // Generate custom filename for display
      const fileExt = sop.fileName.split('.').pop()?.toLowerCase() || 'pdf'
      const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
      const customFileName = `${sanitizeFileName(sop.nomorSop)} - ${sanitizeFileName(sop.judul)}.${fileExt}`
      
      // Fetch file from our download API (avoids CORS issues)
      const res = await fetch(`/api/download?id=${id}`)
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Gagal mengunduh file')
      }
      
      // Increment download counter
      await fetch('/api/sop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, incrementDownload: true })
      })
      
      // Get file blob
      const blob = await res.blob()
      
      // Create download link with custom filename
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = customFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast({ title: '✅ Download Selesai', description: `File: ${customFileName}` })
      fetchStats()
    } catch (error) {
      console.error('Download error:', error)
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'Gagal mengunduh file', variant: 'destructive' })
    }
  }
  
  // Preview file dari Cloudflare R2
  const handlePreview = async (id: string) => {
    const sop = sopFiles.find(s => s.id === id)
    if (!sop) return

    if (!sop.filePath) {
      toast({
        title: '⚠️ File Tidak Tersedia',
        description: 'File tidak ditemukan di storage.',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    const fileExtension = sop.fileName.toLowerCase().split('.').pop()
    toast({ title: '📄 Membuka Preview...', description: 'Mempersiapkan file dari Cloudflare R2' })

    try {
      const res = await fetch(`/api/file?action=preview&id=${id}`)
      const data = await res.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Gagal mengakses file')
      }

      // PDF files - langsung buka URL
      if (fileExtension === 'pdf') {
        window.open(data.downloadUrl, '_blank')
        fetchStats()
        return
      }

      // Excel/Word files - gunakan Microsoft Office Online Viewer
      if (data.viewerUrl) {
        window.open(data.viewerUrl, '_blank')
        toast({
          title: '📊 Preview Dibuka',
          description: 'Membuka di Microsoft Office Online Viewer',
          duration: 3000
        })
      } else if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank')
      }
      
      fetchStats()
    } catch (error) {
      console.error('Preview error:', error)
      toast({
        title: '❌ Error',
        description: 'Gagal membuka preview file',
        variant: 'destructive',
        duration: 5000
      })
    }
  }
  
  // Print file - Open PDF in new tab and trigger print dialog
  const handlePrint = useCallback(async (id: string) => {
    const sop = sopFiles.find(s => s.id === id)
    if (!sop) return

    if (!sop.filePath) {
      toast({
        title: '⚠️ File Tidak Tersedia',
        description: 'File tidak ditemukan di storage.',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    const fileExtension = sop.fileName.toLowerCase().split('.').pop()
    
    // Check if file type is supported
    if (!['pdf', 'xlsx', 'xls', 'xlsm'].includes(fileExtension || '')) {
      toast({
        title: '⚠️ Tidak Didukung',
        description: 'Hanya file PDF dan Excel yang bisa di-print',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    // For PDF files - open in new tab and print
    if (fileExtension === 'pdf') {
      try {
        toast({ 
          title: '🖨️ Mempersiapkan Print...', 
          description: 'Mengakses file PDF...',
          duration: 30000
        })
        
        const res = await fetch(`/api/print?id=${id}`)
        const data = await res.json()
        
        if (data.success && data.pdfUrl) {
          // Open PDF in new tab
          const printWindow = window.open(data.pdfUrl, '_blank')
          if (printWindow) {
            // Wait for PDF to load then trigger print dialog
            setTimeout(() => {
              try {
                printWindow.print()
              } catch {
                // Browser may block print on cross-origin PDFs
                // User can still use Ctrl+P
              }
            }, 1500)
          }
          
          toast({
            title: '✅ PDF Dibuka',
            description: 'Tekan Ctrl+P untuk print jika dialog tidak muncul otomatis',
            duration: 5000
          })
          
          fetchStats()
        } else {
          throw new Error(data.error || 'Gagal mengakses file')
        }
      } catch (error) {
        console.error('Print error:', error)
        toast({
          title: '❌ Error',
          description: 'Gagal mempersiapkan file untuk print',
          variant: 'destructive',
          duration: 5000
        })
      }
      return
    }

    // For Excel files - directly open PDF via Microsoft Graph
    try {
      toast({ 
        title: '🖨️ Mempersiapkan Print...', 
        description: 'Mengonversi Excel ke PDF via Microsoft Graph...',
        duration: 60000
      })
      
      // Use Excel Print API with Microsoft Graph (A4, Landscape, FitToWidth)
      const printUrl = `/api/excel-print?key=${encodeURIComponent(sop.filePath)}&id=${sop.id}`
      
      // Open PDF directly in new tab
      const printWindow = window.open(printUrl, '_blank')
      
      if (printWindow) {
        // Wait for PDF to load then trigger print dialog
        setTimeout(() => {
          try {
            printWindow.print()
          } catch {
            // Browser may block print on cross-origin PDFs
            // User can still use Ctrl+P
          }
        }, 2000)
      }
      
      toast({
        title: '✅ PDF Dibuka',
        description: 'Dokumen dibuka di tab baru. Tekan Ctrl+P jika dialog print tidak muncul.',
        duration: 5000
      })
      
      fetchStats()
      
    } catch (error) {
      console.error('Print error:', error)
      toast({
        title: '❌ Error',
        description: 'Gagal mengkonversi file ke PDF',
        variant: 'destructive',
        duration: 5000
      })
    }
  }, [sopFiles, toast, fetchStats])
  
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
  
  // Handle Excel Edit - Start editing session with Microsoft 365
  const handleOpenExcelEdit = async (id: string) => {
    const sop = sopFiles.find(s => s.id === id)
    if (!sop) return
    
    setExcelEditData(sop)
    setExcelEditUrl(null)
    setExcelEditDriveItemId(null)
    setExcelEditSessionId(null)
    setShowExcelEditDialog(true)
    setExcelEditLoading(true)
    
    try {
      // Start editing session - this will:
      // 1. Download from R2
      // 2. Upload to OneDrive
      // 3. Create edit link
      const res = await fetch('/api/excel-edit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectKey: sop.filePath,
          fileId: sop.id
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        setExcelEditUrl(data.editUrl)
        setExcelEditDriveItemId(data.driveItemId)
        setExcelEditSessionId(data.sessionId)
        toast({
          title: '✅ File Siap Diedit',
          description: 'Klik "Buka Excel Online" untuk mulai mengedit. Setelah selesai, klik "Sync ke R2".',
          duration: 6000
        })
      } else {
        toast({ 
          title: '❌ Gagal Memulai Edit', 
          description: data.error || 'Terjadi kesalahan', 
          variant: 'destructive' 
        })
      }
    } catch (error) {
      console.error('Failed to start edit:', error)
      toast({ 
        title: '❌ Error', 
        description: 'Gagal menghubungi server', 
        variant: 'destructive' 
      })
    }
    setExcelEditLoading(false)
  }
  
  // Handle Desktop Excel Edit - Download file for local editing
  const handleDesktopEdit = async (id: string) => {
    const sop = sopFiles.find(s => s.id === id)
    if (!sop) return
    
    if (!sop.filePath) {
      toast({
        title: '⚠️ File Tidak Tersedia',
        description: 'File tidak ditemukan di storage.',
        variant: 'destructive',
        duration: 5000
      })
      return
    }
    
    try {
      toast({
        title: '📥 Mengunduh File...',
        description: 'Mempersiapkan file untuk diedit di Desktop',
        duration: 30000
      })
      
      // Generate custom filename from SOP number and title
      const fileExt = sop.fileName.split('.').pop()?.toLowerCase() || 'xlsx'
      const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
      const customFileName = `${sanitizeFileName(sop.nomorSop)} - ${sanitizeFileName(sop.judul)}.${fileExt}`
      
      console.log('🔍 [Desktop Edit] SOP Data:', {
        id: sop.id,
        nomorSop: sop.nomorSop,
        judul: sop.judul,
        fileName: sop.fileName,
        customFileName
      })
      
      // Download file with session
      const res = await fetch('/api/excel-edit/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectKey: sop.filePath,
          fileId: sop.id,
          sopNumber: sop.nomorSop,
          sopTitle: sop.judul
        })
      })
      
      // Handle file locked response (status 423)
      if (res.status === 423) {
        const lockData = await res.json()
        toast({
          title: '🔒 File Terkunci',
          description: lockData.message || `File sedang diedit oleh ${lockData.lockedBy?.email || 'user lain'}`,
          variant: 'destructive',
          duration: 8000
        })
        return
      }
      
      if (!res.ok) {
        let errorMessage = 'Gagal mengunduh file'
        let errorDetails = ''
        
        try {
          const contentType = res.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errorData = await res.json()
            errorMessage = errorData.error || errorMessage
            errorDetails = errorData.details || ''
          } else {
            // Handle non-JSON response
            const textError = await res.text()
            console.error('Non-JSON error response:', textError)
            errorMessage = `Server error (${res.status})`
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError)
          errorMessage = `Gagal mengunduh file (${res.status})`
        }
        
        console.error('❌ [Desktop Edit] Download error:', {
          status: res.status,
          statusText: res.statusText,
          errorMessage,
          errorDetails
        })
        
        throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage)
      }
      
      // Get session info from headers
      const sessionId = res.headers.get('X-Edit-Session-Id')
      const sessionExpires = res.headers.get('X-Edit-Session-Expires')
      const originalHash = res.headers.get('X-Original-Hash')
      const serverFilename = res.headers.get('X-Custom-Filename')
      const lastEditorEmail = res.headers.get('X-Last-Editor-Email')
      const lastEditorName = res.headers.get('X-Last-Editor-Name')
      const lastEditorTime = res.headers.get('X-Last-Editor-Time')
      
      console.log('📥 [Desktop Edit] Response headers:', {
        sessionId: sessionId ? 'received' : 'missing',
        sessionExpires,
        originalHash: originalHash ? 'received' : 'missing',
        serverFilename,
        lastEditorEmail
      })
      
      if (!sessionId) {
        throw new Error('Session ID tidak diterima')
      }
      
      // Use server filename as primary, fallback to local customFileName
      const finalFileName = serverFilename || customFileName
      console.log(`📁 [Desktop Edit] Final filename: "${finalFileName}"`)
      
      // Store session
      setDesktopEditSessionToken(sessionId)
      setDesktopEditOriginalHash(originalHash)
      setExcelEditData(sop)
      
      // Get file blob
      const blob = await res.blob()
      
      // Create download link with custom filename
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = finalFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      // Show session info
      const expiresAt = sessionExpires ? new Date(sessionExpires) : new Date(Date.now() + 30 * 60 * 1000)
      const remainingMinutes = Math.round((expiresAt.getTime() - Date.now()) / 60000)
      
      let description = `Edit file di Excel Desktop, lalu klik "Selesai Edit & Sync" untuk upload. Sesi berlaku ${remainingMinutes} menit.`
      if (lastEditorEmail) {
        description += ` Terakhir diedit oleh ${lastEditorName || lastEditorEmail}.`
      }
      
      toast({
        title: '✅ File Diunduh',
        description,
        duration: 8000
      })
      
    } catch (error) {
      console.error('Desktop edit error:', error)
      toast({
        title: '❌ Error',
        description: error instanceof Error ? error.message : 'Gagal mengunduh file',
        variant: 'destructive',
        duration: 5000
      })
    }
  }
  
  // Handle Desktop Sync - Upload edited file
  const handleDesktopSync = async () => {
    if (!desktopSyncFile || !desktopEditSessionToken || !excelEditData) return
    
    setDesktopSyncing(true)
    
    try {
      const formData = new FormData()
      formData.append('file', desktopSyncFile)
      formData.append('sessionId', desktopEditSessionToken)
      
      const res = await fetch('/api/excel-edit/desktop-sync', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      
      // Handle conflict detected (status 409)
      if (res.status === 409 && data.error === 'CONFLICT_DETECTED') {
        console.log('⚠️ [Sync] Conflict detected:', data)
        
        setConflictData({
          sessionId: desktopEditSessionToken,
          message: data.message,
          lastEditor: data.conflict?.lastEditor,
          originalHash: data.conflict?.originalHash,
          currentHash: data.conflict?.currentHash
        })
        setShowConflictDialog(true)
        setDesktopSyncing(false)
        return
      }
      
      if (data.success) {
        if (data.unchanged) {
          toast({
            title: 'ℹ️ File Tidak Berubah',
            description: data.message,
            duration: 5000
          })
        } else {
          toast({
            title: '✅ Sync Berhasil!',
            description: data.message,
            duration: 5000
          })
          fetchSopFiles()
          fetchStats()
        }
        
        // Reset state
        setShowDesktopSyncDialog(false)
        setDesktopSyncFile(null)
        setDesktopEditSessionToken(null)
        setDesktopEditOriginalHash(null)
      } else {
        toast({
          title: '❌ Sync Gagal',
          description: data.error || 'Terjadi kesalahan saat sync',
          variant: 'destructive',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Desktop sync error:', error)
      toast({
        title: '❌ Error',
        description: 'Gagal menghubungi server',
        variant: 'destructive',
        duration: 5000
      })
    }
    
    setDesktopSyncing(false)
  }
  
  // Handle Force Sync - Overwrite even with conflict
  const handleForceSync = async () => {
    if (!desktopSyncFile || !conflictData?.sessionId) return
    
    setForceSyncing(true)
    
    try {
      const formData = new FormData()
      formData.append('file', desktopSyncFile)
      formData.append('sessionId', conflictData.sessionId)
      formData.append('confirmed', 'true')
      
      const res = await fetch('/api/excel-edit/force-sync', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({
          title: '⚠️ Force Sync Berhasil!',
          description: data.message,
          duration: 5000
        })
        fetchSopFiles()
        fetchStats()
        
        // Reset all state
        setShowConflictDialog(false)
        setShowDesktopSyncDialog(false)
        setConflictData(null)
        setDesktopSyncFile(null)
        setDesktopEditSessionToken(null)
        setDesktopEditOriginalHash(null)
      } else {
        toast({
          title: '❌ Force Sync Gagal',
          description: data.error || 'Terjadi kesalahan',
          variant: 'destructive',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Force sync error:', error)
      toast({
        title: '❌ Error',
        description: 'Gagal menghubungi server',
        variant: 'destructive',
        duration: 5000
      })
    }
    
    setForceSyncing(false)
  }
  
  // Handle Cancel Conflict - User chooses to cancel
  const handleCancelConflict = () => {
    setShowConflictDialog(false)
    // Keep the sync dialog open so user can choose different file or cancel entirely
  }
  
  // Handle Cancel Session - User cancels the entire edit session
  const handleCancelSession = () => {
    setShowConflictDialog(false)
    setShowDesktopSyncDialog(false)
    setConflictData(null)
    setDesktopSyncFile(null)
    setDesktopEditSessionToken(null)
    setDesktopEditOriginalHash(null)
    
    toast({
      title: '🚫 Sesi Dibatalkan',
      description: 'Anda dapat memulai edit ulang kapan saja',
      duration: 3000
    })
  }
  
  // Open Desktop Sync Dialog
  const handleOpenDesktopSync = () => {
    if (!desktopEditSessionToken) {
      toast({
        title: '⚠️ Tidak Ada Session',
        description: 'Download file terlebih dahulu dengan klik "Edit di Desktop"',
        variant: 'destructive',
        duration: 5000
      })
      return
    }
    setDesktopSyncFile(null)
    setShowDesktopSyncDialog(true)
  }
  
  // Open Excel Online in new tab
  const handleOpenExcelOnline = () => {
    if (!excelEditUrl) return
    window.open(excelEditUrl, '_blank')
    toast({
      title: '📊 Excel Online Dibuka',
      description: 'Edit file di Excel Online. Setelah selesai dan disimpan, kembali ke sini untuk sync.',
      duration: 5000
    })
  }
  
  // Sync file from OneDrive back to R2
  const handleSyncToR2 = async () => {
    if (!excelEditDriveItemId) return
    
    setExcelEditSyncing(true)
    try {
      const res = await fetch('/api/excel-edit/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveItemId: excelEditDriveItemId
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({
          title: '✅ Sync Berhasil!',
          description: `File berhasil disinkronkan ke R2. ${data.results?.length || 0} file diproses.`,
          duration: 5000
        })
        fetchSopFiles()
        fetchStats()
        setShowExcelEditDialog(false)
      } else {
        toast({ 
          title: '❌ Sync Gagal', 
          description: data.error || 'Terjadi kesalahan saat sync', 
          variant: 'destructive' 
        })
      }
    } catch (error) {
      toast({ 
        title: '❌ Error', 
        description: 'Gagal menghubungi server', 
        variant: 'destructive' 
      })
    }
    setExcelEditSyncing(false)
  }
  
  // Check edit status
  const handleCheckEditStatus = async () => {
    if (!excelEditDriveItemId) return
    
    try {
      const res = await fetch(`/api/excel-edit/status?driveItemId=${excelEditDriveItemId}`)
      const data = await res.json()
      
      if (data.status === 'synced') {
        toast({
          title: '✅ File Sudah Disync',
          description: 'File sudah tidak ada di folder edit. Mungkin sudah otomatis disinkronkan.',
          duration: 5000
        })
        setShowExcelEditDialog(false)
        fetchSopFiles()
      } else if (data.status === 'editing') {
        toast({
          title: '📝 File Masih Diedit',
          description: `Terakhir diubah: ${data.file?.lastModified ? new Date(data.file.lastModified).toLocaleString('id-ID') : 'N/A'}`,
          duration: 3000
        })
      }
    } catch (error) {
      console.error('Failed to check status:', error)
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
  
  // Buka dialog edit
  const handleOpenEdit = (id: string) => {
    const sop = sopFiles.find(s => s.id === id)
    if (!sop) return
    
    setEditData(sop)
    setEditForm({
      judul: sop.judul,
      kategori: sop.kategori,
      jenis: sop.jenis,
      tahun: sop.tahun,
      status: sop.status
    })
    setShowEditDialog(true)
  }
  
  // Simpan perubahan edit
  const handleSaveEdit = async () => {
    if (!editData) return
    
    try {
      const res = await fetch('/api/sop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editData.id,
          judul: editForm.judul,
          kategori: editForm.kategori,
          jenis: editForm.jenis,
          tahun: editForm.tahun,
          status: editForm.status
        })
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: '✅ Berhasil', description: 'Data SOP berhasil diperbarui!' })
        setShowEditDialog(false)
        setEditData(null)
        fetchSopFiles()
        fetchStats()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan saat menyimpan', variant: 'destructive' })
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
        toast({ 
          title: '❌ Gagal', 
          description: data.error, 
          variant: 'destructive',
          duration: 5000
        })
      } else {
        toast({ 
          title: '✅ Berhasil', 
          description: data.message || 'User berhasil dibuat!',
          duration: 3000
        })
        setShowUserDialog(false)
        setNewUserForm({ name: '', email: '', password: '', role: 'STAF' })
        fetchUsers()
      }
    } catch (error) {
      console.error('Create user error:', error)
      toast({ 
        title: '❌ Error', 
        description: 'Terjadi kesalahan jaringan. Periksa koneksi internet Anda.', 
        variant: 'destructive',
        duration: 5000
      })
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

  // Handle delete SOP file
  const handleDeleteSop = async (id: string, fileName: string) => {
    if (!confirm(`Yakin ingin menghapus file "${fileName}"?\n\nFile akan dihapus permanen dari sistem dan storage.`)) return
    
    try {
      const res = await fetch(`/api/sop?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      
      if (data.error) {
        toast({ title: '❌ Gagal', description: data.error, variant: 'destructive' })
      } else {
        toast({ 
          title: '✅ Berhasil', 
          description: `File "${fileName}" berhasil dihapus!`,
          duration: 3000
        })
        fetchSopFiles()
        fetchStats()
      }
    } catch (error) {
      toast({ title: '❌ Error', description: 'Terjadi kesalahan saat menghapus file', variant: 'destructive' })
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
              <p>© FOE - 2026</p>
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
  
  const menuItems = [
    { id: 'dashboard' as PageView, label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'STAF'] },
    { id: 'katalog' as PageView, label: 'Katalog SOP', icon: FileText, roles: ['ADMIN', 'STAF'] },
    { id: 'verifikasi' as PageView, label: 'Verifikasi SOP', icon: CheckCircle, roles: ['ADMIN'] },
    { id: 'logs' as PageView, label: 'Log Aktivitas', icon: History, roles: ['ADMIN'] },
    { id: 'users' as PageView, label: 'Manajemen User', icon: Users, roles: ['ADMIN'] },
  ]
  
  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/background.jpg)' }}>
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Header */}
        <motion.header 
          className="relative z-10 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-md text-white p-4 shadow-xl border-b border-orange-500/20"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <SARLogo size="md" />
              <div>
                <h1 className="text-xl font-bold tracking-wide text-white">Katalog SOP dan IK</h1>
                <p className="text-xs text-orange-400 flex items-center gap-2">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Direktorat Kesiapsiagaan - BASARNAS
                </p>
              </div>
            </motion.div>
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <StorageStatus 
                compact 
                syncStatus={syncStatus}
                lastSyncResult={lastSyncResult}
                onBackup={handleAutoBackup}
                isBackingUp={autoBackupStatus.isBackingUp}
                onDiagnose={handleRunDiagnostic}
                isDiagnosing={diagnosticLoading}
              />
              <Button 
                onClick={() => setShowLogin(true)}
                className="btn-sar bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login Admin
              </Button>
            </motion.div>
          </div>
        </motion.header>
        
        {/* Public Content */}
        <main className="relative z-10 flex-1 flex items-center justify-center p-6">
          <motion.div 
            className="max-w-lg w-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white shadow-2xl border-0 overflow-hidden rounded-2xl">
              {/* Header with BASARNAS styling */}
              <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 p-8 text-white relative overflow-hidden">
                {/* Animated radar pattern */}
                <div className="absolute inset-0">
                  <motion.div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full"
                    style={{
                      background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.1) 30deg, transparent 60deg)'
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
                
                <motion.div 
                  className="relative z-10 text-center"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Logo with beacon animation */}
                  <motion.div 
                    className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    style={{
                      boxShadow: '0 0 30px rgba(249, 115, 22, 0.5), 0 0 60px rgba(249, 115, 22, 0.3)'
                    }}
                  >
                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(255,255,255,0.3)',
                          '0 0 40px rgba(255,255,255,0.5)',
                          '0 0 20px rgba(255,255,255,0.3)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-12 h-12 rounded-xl bg-white flex items-center justify-center"
                    >
                      <Shield className="w-7 h-7 text-orange-600" />
                    </motion.div>
                  </motion.div>
                  
                  <motion.h1 
                    className="text-2xl font-bold mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    SISTEM KATALOG SOP & IK
                  </motion.h1>
                  
                  <motion.div 
                    className="flex items-center justify-center gap-2 text-orange-100"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-medium">DIREKTORAT KESIAPSIAGAAN - BASARNAS</span>
                  </motion.div>
                  
                  <motion.p 
                    className="text-orange-200 text-sm mt-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Submit SOP Publik - Kirim dokumen untuk verifikasi
                  </motion.p>
                </motion.div>
              </div>
              
              {/* Form Content */}
              <CardContent className="p-6 bg-gradient-to-b from-white to-orange-50/30">
                <form onSubmit={(e) => handleUpload(e, true)} className="space-y-5">
                  <motion.div 
                    className="grid grid-cols-2 gap-4"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    <motion.div className="space-y-2" variants={fadeInUp}>
                      <Label className="font-semibold text-gray-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-orange-500" />
                        Nama Lengkap
                      </Label>
                      <Input 
                        value={publicForm.nama}
                        onChange={(e) => setPublicForm({ ...publicForm, nama: e.target.value })}
                        placeholder="Masukkan nama lengkap"
                        required
                        className="border-2 border-gray-200 focus:border-orange-500 text-gray-900 placeholder:text-gray-400 h-11 rounded-xl"
                      />
                    </motion.div>
                    <motion.div className="space-y-2" variants={fadeInUp}>
                      <Label className="font-semibold text-gray-700 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-orange-500" />
                        Email
                      </Label>
                      <Input 
                        type="email"
                        value={publicForm.email}
                        onChange={(e) => setPublicForm({ ...publicForm, email: e.target.value })}
                        placeholder="email@contoh.com"
                        required
                        className="border-2 border-gray-200 focus:border-orange-500 text-gray-900 placeholder:text-gray-400 h-11 rounded-xl"
                      />
                    </motion.div>
                  </motion.div>
                  
                  <motion.div className="space-y-2" variants={fadeInUp}>
                    <Label className="font-semibold text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-500" />
                      Judul SOP/IK
                    </Label>
                    <Input 
                      value={publicForm.judul}
                      onChange={(e) => setPublicForm({ ...publicForm, judul: e.target.value })}
                      placeholder="Masukkan judul SOP atau IK"
                      required
                      className="border-2 border-gray-200 focus:border-orange-500 text-gray-900 placeholder:text-gray-400 h-11 rounded-xl"
                    />
                  </motion.div>
                  
                  <motion.div 
                    className="grid grid-cols-2 gap-4"
                    variants={staggerContainer}
                  >
                    <motion.div className="space-y-2" variants={fadeInUp}>
                      <Label className="font-semibold text-gray-700">Kategori</Label>
                      <Select value={publicForm.kategori} onValueChange={(v) => setPublicForm({ ...publicForm, kategori: v })}>
                        <SelectTrigger className="border-2 border-gray-200 focus:border-orange-500 text-gray-900 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </motion.div>
                    <motion.div className="space-y-2" variants={fadeInUp}>
                      <Label className="font-semibold text-gray-700">Jenis</Label>
                      <Select value={publicForm.jenis} onValueChange={(v) => setPublicForm({ ...publicForm, jenis: v })}>
                        <SelectTrigger className="border-2 border-gray-200 focus:border-orange-500 text-gray-900 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {JENIS_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  </motion.div>
                  
                  <motion.div 
                    className="grid grid-cols-2 gap-4"
                    variants={staggerContainer}
                  >
                    <motion.div className="space-y-2" variants={fadeInUp}>
                      <Label className="font-semibold text-gray-700">Tahun</Label>
                      <Input 
                        type="number"
                        value={publicForm.tahun}
                        onChange={(e) => setPublicForm({ ...publicForm, tahun: parseInt(e.target.value) })}
                        required
                        className="border-2 border-gray-200 focus:border-orange-500 text-gray-900 h-11 rounded-xl"
                      />
                    </motion.div>
                    <motion.div className="space-y-2" variants={fadeInUp}>
                      <Label className="font-semibold text-gray-700">Status</Label>
                      <Select value={publicForm.status} onValueChange={(v) => setPublicForm({ ...publicForm, status: v })}>
                        <SelectTrigger className="border-2 border-gray-200 focus:border-orange-500 text-gray-900 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  </motion.div>
                  
                  <motion.div className="space-y-2" variants={fadeInUp}>
                    <Label className="font-semibold text-gray-700 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-orange-500" />
                      Upload File (Excel/PDF)
                    </Label>
                    <div className="relative flex items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-xl bg-gradient-to-b from-gray-50 to-white hover:border-orange-400 transition-colors cursor-pointer overflow-hidden group">
                      {/* Hidden file input */}
                      <input 
                        type="file"
                        accept=".xlsx,.pdf"
                        onChange={(e) => setPublicForm({ ...publicForm, file: e.target.files?.[0] || null })}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      {/* Centered content */}
                      <div className="flex flex-col items-center justify-center text-center gap-2 pointer-events-none">
                        <motion.div 
                          className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg"
                          whileHover={{ scale: 1.05 }}
                        >
                          <Upload className="w-6 h-6 text-white" />
                        </motion.div>
                        <div>
                          <p className="font-semibold text-gray-700">
                            {publicForm.file ? publicForm.file.name : 'Choose File'}
                          </p>
                          {publicForm.file && (
                            <p className="text-xs text-green-600 mt-1">File siap diupload</p>
                          )}
                          {!publicForm.file && (
                            <p className="text-xs text-gray-500">Klik atau drag file ke sini</p>
                          )}
                        </div>
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">Format: .xlsx, .pdf (Max 4.5 MB)</p>
                  </motion.div>
                  
                  <motion.div variants={fadeInUp} className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-xl shadow-orange-500/30 text-base font-bold py-7 rounded-xl relative overflow-hidden group"
                      disabled={loading}
                    >
                      {/* Animated background on hover */}
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Mengirim...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            KIRIM DOKUMEN
                          </>
                        )}
                      </span>
                    </Button>
                  </motion.div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        
        {/* Glowing Footer - Bottom Right */}
        <motion.div 
          className="fixed bottom-4 right-4 z-50"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-lg blur-md opacity-60 animate-pulse" />
            
            {/* Shimmer container */}
            <div className="relative px-4 py-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-lg border border-orange-500/30 overflow-hidden">
              {/* Animated shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent animate-shimmer" />
              
              {/* Text with glow */}
              <p className="text-sm font-medium relative z-10">
                <span className="text-gray-400">© </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-400 animate-pulse font-bold">
                  FOE - 2026
                </span>
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Login Dialog */}
        <Dialog open={showLogin} onOpenChange={setShowLogin}>
          <DialogContent className="sm:max-w-md bg-white border-0 overflow-hidden p-0">
            <DialogTitle className="sr-only">Login Admin</DialogTitle>
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 p-6 text-white relative overflow-hidden">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/0 via-white/20 to-white/0 animate-pulse" />
              </div>
              
              <motion.div 
                className="relative z-10 flex flex-col items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div 
                  className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Shield className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold">Login Admin</h2>
                <p className="text-orange-100 text-sm mt-1">Sistem Katalog SOP & IK</p>
              </motion.div>
            </div>
            
            {/* Form */}
            <motion.form 
              onSubmit={handleLogin} 
              className="p-6 space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label className="font-semibold text-gray-700 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-orange-500" />
                  Email
                </Label>
                <Input 
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="Masukkan email admin"
                  required
                  className="border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-500 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl"
                />
              </motion.div>
              
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Label className="font-semibold text-gray-700 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-500" />
                  Password
                </Label>
                <Input 
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Masukkan password"
                  required
                  className="border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-500 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl"
                />
              </motion.div>

              <motion.div 
                className="flex gap-3 pt-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowLogin(false)} 
                  className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 h-12 rounded-xl font-semibold"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-12 rounded-xl font-semibold shadow-lg shadow-orange-500/30" 
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    'Masuk'
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
  
  // Main Application
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <SARBackground />
      
      {/* Header */}
      <motion.header 
        className="relative z-20 glass-dark text-white shadow-2xl sticky top-0 no-print"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
      >
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
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <SARLogo size="md" />
              <div>
                <h1 className="text-xl font-bold tracking-wide">Katalog SOP dan IK</h1>
                <p className="text-xs text-orange-400 flex items-center gap-2">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Direktorat Kesiapsiagaan - BASARNAS
                </p>
              </div>
            </motion.div>
          </div>
          <div className="flex items-center gap-4">
            <StorageStatus 
              compact 
              syncStatus={syncStatus}
              lastSyncResult={lastSyncResult}
              onBackup={handleAutoBackup}
              isBackingUp={autoBackupStatus.isBackingUp}
              onDiagnose={handleRunDiagnostic}
              isDiagnosing={diagnosticLoading}
            />
            
            {/* User Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:bg-white/10 flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-orange-400">{user?.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {
                  handleLogout()
                  setShowLogin(true)
                }}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Switch User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.header>
      
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar */}
        <motion.aside 
          className={`relative ${sidebarOpen ? 'w-64' : 'w-0'} text-white transition-all duration-300 overflow-hidden no-print flex flex-col shrink-0 ${syncStatus.isSyncing ? 'syncing-sidebar' : ''}`}
          style={{ 
            position: 'sticky', 
            top: 0, 
            height: 'calc(100vh - 60px)',
            backgroundImage: 'url(/sidebar-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
          animate={{ width: sidebarOpen ? 256 : 0 }}
        >
          {/* Dark overlay with opacity for background visibility */}
          <div className="absolute inset-0 bg-gray-900/70" />
          
          {/* Navigation */}
          <nav className="relative z-10 p-4 space-y-2 flex-1">
            {menuItems.filter(item => item.roles.includes(user?.role || '')).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant={currentPage === item.id ? 'default' : 'ghost'}
                  className={`w-full justify-start gap-3 btn-sar ${currentPage === item.id ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                  onClick={() => setCurrentPage(item.id)}
                >
                  <item.icon className={`w-5 h-5 ${syncStatus.isSyncing ? 'animate-spin-slow' : ''}`} />
                  {item.label}
                  {/* Notification badge for Verifikasi SOP - only show if > 0 */}
                  {item.id === 'verifikasi' && stats?.totalPublikMenunggu !== undefined && stats.totalPublikMenunggu > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse"
                    >
                      {stats.totalPublikMenunggu}
                    </motion.span>
                  )}
                </Button>
              </motion.div>
            ))}
          </nav>

          {/* Syncing Animation Overlay */}
          <AnimatePresence>
            {syncStatus.isSyncing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-orange-500/5 pointer-events-none animate-pulse" />
                <div className="absolute top-0 left-0 w-full h-1.5 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 animate-sync-progress" />
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1.5 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 animate-sync-progress-reverse" />
                </div>
                <div className="absolute top-1/2 left-0 right-0 text-center pointer-events-none">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-full text-xs text-orange-300 backdrop-blur-sm">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    {syncStatus.currentStep || 'Syncing...'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto" style={{ height: 'calc(100vh - 60px)' }}>
          <AnimatePresence mode="wait">
            {/* Dashboard */}
            {currentPage === 'dashboard' && (
              <motion.div
                key="dashboard"
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                {!stats ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <motion.div 
                        className="sar-loading mx-auto mb-4"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      <p className="text-gray-500">Memuat data...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <motion.div 
                      className="flex items-center justify-between"
                      variants={fadeInUp}
                    >
                      <ShimmerTitle subtitle="Overview sistem katalog SOP dan IK">Dashboard</ShimmerTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleExport('xlsx')} className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Export Excel
                        </Button>
                        <Button variant="outline" onClick={() => handleExport('pdf')} className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
                          <FileIcon className="w-4 h-4 mr-2" />
                          Export PDF
                        </Button>
                      </div>
                    </motion.div>
                    
                    {/* R2 Setup Guide */}
                    {r2Status && r2Status.status === 'bucket_not_found' && r2Status.setupInstructions && (
                      <motion.div variants={fadeInUp}>
                        <Card className="border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 backdrop-blur">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 text-yellow-500">
                              <AlertTriangle className="w-5 h-5" />
                              Setup Cloudflare R2 Bucket
                            </CardTitle>
                            <CardDescription className="text-yellow-400/80">
                              Kredensial R2 valid, tapi bucket belum dibuat. Ikuti langkah berikut:
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="bg-black/20 rounded-lg p-4 border border-yellow-500/20">
                              <ol className="space-y-2">
                                {r2Status.setupInstructions.map((instruction, index) => (
                                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                                    <span className="font-mono text-yellow-400 font-medium min-w-[20px]">{index + 1}.</span>
                                    <span>{instruction.replace(/^\d+\.\s*/, '')}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                    
                    {/* Stats Cards */}
                    <motion.div 
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                      variants={staggerContainer}
                    >
                      <StatCard title="Total SOP" value={stats.totalSop} icon={FileText} color="orange" delay={0} />
                      <StatCard title="Total IK" value={stats.totalIk} icon={FolderOpen} color="yellow" delay={0.1} />
                      <StatCard title="Total Preview" value={stats.totalPreviews || 0} icon={Eye} color="cyan" delay={0.2} />
                      <StatCard title="Total Download" value={stats.totalDownloads || 0} icon={Download} color="purple" delay={0.3} />
                    </motion.div>
                    
                    {/* Status Cards */}
                    <motion.div 
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      variants={staggerContainer}
                    >
                      <StatCard title="Aktif" value={stats.totalAktif} icon={CheckCircle} color="green" delay={0.4} />
                      <StatCard title="Review" value={stats.totalReview} icon={Clock} color="yellow" delay={0.5} />
                      <StatCard title="Kadaluarsa" value={stats.totalKadaluarsa} icon={XCircle} color="red" delay={0.6} />
                    </motion.div>
                    
                    {/* Charts */}
                    <motion.div 
                      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                      variants={fadeInUp}
                    >
                      <Card className="glass-card border-0 shadow-xl">
                        <CardHeader>
                          <CardTitle className="text-lg text-blue-900 font-bold">Distribusi per Tahun</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.byTahun}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" strokeOpacity={0.3} />
                              <XAxis dataKey="tahun" stroke="#1e3a5f" tick={{ fill: '#1e3a5f', fontWeight: 600 }} />
                              <YAxis stroke="#1e3a5f" tick={{ fill: '#1e3a5f', fontWeight: 600 }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                                  border: '2px solid #f97316',
                                  borderRadius: '12px',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                                }}
                                itemStyle={{ color: '#1e3a5f', fontWeight: 600 }}
                                labelStyle={{ color: '#f97316', fontWeight: 700 }}
                              />
                              <Bar dataKey="count" fill="url(#colorGradient)" name="Jumlah" radius={[4, 4, 0, 0]} />
                              <defs>
                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#f97316" />
                                  <stop offset="100%" stopColor="#ea580c" />
                                </linearGradient>
                              </defs>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                      
                      <Card className="glass-card border-0 shadow-xl">
                        <CardHeader>
                          <CardTitle className="text-lg text-blue-900 font-bold">Distribusi per Kategori</CardTitle>
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
                                outerRadius={80}
                                labelLine={false}
                                stroke="#1e3a5f"
                                strokeWidth={2}
                              >
                                {stats.byKategori.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                                  border: '2px solid #f97316',
                                  borderRadius: '12px',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                                }}
                                itemStyle={{ color: '#1e3a5f', fontWeight: 600 }}
                                labelStyle={{ color: '#f97316', fontWeight: 700 }}
                              />
                              <Legend 
                                layout="vertical" 
                                align="right" 
                                verticalAlign="middle"
                                formatter={(value, entry) => <span className="text-blue-900 font-semibold">{value} ({entry.payload?.count || 0})</span>}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white border-2 border-orange-200 shadow-xl">
                        <CardHeader>
                          <CardTitle className="text-lg text-blue-900 font-bold">Distribusi per Jenis</CardTitle>
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
                                outerRadius={80}
                                labelLine={false}
                                stroke="#1e3a5f"
                                strokeWidth={2}
                              >
                                <Cell fill="#f97316" />
                                <Cell fill="#eab308" />
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                                  border: '2px solid #f97316',
                                  borderRadius: '12px',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                                }}
                                itemStyle={{ color: '#1e3a5f', fontWeight: 600 }}
                                labelStyle={{ color: '#f97316', fontWeight: 700 }}
                              />
                              <Legend 
                                layout="vertical" 
                                align="right" 
                                verticalAlign="middle"
                                formatter={(value, entry) => <span className="text-blue-900 font-semibold">{value} ({entry.payload?.count || 0})</span>}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white border-2 border-orange-200 shadow-xl">
                        <CardHeader>
                          <CardTitle className="text-lg text-blue-900 font-bold">Distribusi per Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.byStatus}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" strokeOpacity={0.3} />
                              <XAxis dataKey="status" stroke="#1e3a5f" tick={{ fill: '#1e3a5f', fontWeight: 600 }} />
                              <YAxis stroke="#1e3a5f" tick={{ fill: '#1e3a5f', fontWeight: 600 }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                                  border: '2px solid #eab308',
                                  borderRadius: '12px',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                                }}
                                itemStyle={{ color: '#1e3a5f', fontWeight: 600 }}
                                labelStyle={{ color: '#eab308', fontWeight: 700 }}
                              />
                              <Bar dataKey="count" fill="url(#yellowGradient)" name="Jumlah" radius={[4, 4, 0, 0]} />
                              <defs>
                                <linearGradient id="yellowGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#eab308" />
                                  <stop offset="100%" stopColor="#ca8a04" />
                                </linearGradient>
                              </defs>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </motion.div>
                    
                    {/* Recent Activity */}
                    <motion.div 
                      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                      variants={fadeInUp}
                    >
                      <Card className="bg-white border-2 border-orange-200 shadow-xl">
                        <CardHeader>
                          <CardTitle className="text-lg text-blue-900 font-bold flex items-center gap-2">
                            <Zap className="w-5 h-5 text-orange-500" />
                            Upload Terbaru
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-64">
                            <div className="space-y-3">
                              {stats.recentUploads.map((sop, index) => (
                                <motion.div 
                                  key={sop.id} 
                                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                >
                                  <div>
                                    <p className="font-medium text-blue-900">{sop.nomorSop}</p>
                                    <p className="text-sm text-gray-600 truncate max-w-[200px]">{sop.judul}</p>
                                  </div>
                                  <Badge variant="outline" className={STATUS_COLORS[sop.status]}>
                                    {sop.status}
                                  </Badge>
                                </motion.div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white border-2 border-orange-200 shadow-xl">
                        <CardHeader>
                          <CardTitle className="text-lg text-blue-900 font-bold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-cyan-500" />
                            Aktivitas Terbaru
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-64">
                            <div className="space-y-3">
                              {stats.recentLogs.map((log, index) => (
                                <motion.div 
                                  key={log.id} 
                                  className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                >
                                  <div className="w-2 h-2 mt-2 rounded-full bg-orange-500 animate-pulse" />
                                  <div>
                                    <p className="text-sm font-medium text-blue-900">{log.user?.name}</p>
                                    <p className="text-sm text-gray-600">{log.deskripsi}</p>
                                    <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString('id-ID')}</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </motion.div>
                    
                    {/* Top Documents */}
                    <motion.div 
                      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                      variants={fadeInUp}
                    >
                      <Card className="bg-white border-2 border-orange-200 shadow-xl">
                        <CardHeader>
                          <CardTitle className="text-lg text-blue-900 font-bold flex items-center gap-2">
                            <Eye className="w-5 h-5 text-cyan-500" />
                            Dokumen Paling Banyak Dilihat
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {stats.topViewed && stats.topViewed.length > 0 ? (
                            <div className="space-y-3">
                              {stats.topViewed.map((sop, index) => (
                                <motion.div 
                                  key={sop.id} 
                                  className="flex items-center gap-3 p-3 bg-cyan-50 rounded-lg"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                >
                                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-blue-900">{sop.nomorSop}</p>
                                    <p className="text-sm text-gray-600 truncate">{sop.judul}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-cyan-600">{sop.previewCount || 0}</p>
                                    <p className="text-xs text-gray-500">views</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 py-8">Belum ada data</p>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white border-2 border-orange-200 shadow-xl">
                        <CardHeader>
                          <CardTitle className="text-lg text-blue-900 font-bold flex items-center gap-2">
                            <Download className="w-5 h-5 text-purple-500" />
                            Dokumen Paling Banyak Diunduh
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {stats.topDownloaded && stats.topDownloaded.length > 0 ? (
                            <div className="space-y-3">
                              {stats.topDownloaded.map((sop, index) => (
                                <motion.div 
                                  key={sop.id} 
                                  className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                >
                                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-blue-900">{sop.nomorSop}</p>
                                    <p className="text-sm text-gray-600 truncate">{sop.judul}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-purple-600">{sop.downloadCount || 0}</p>
                                    <p className="text-xs text-gray-500">downloads</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 py-8">Belum ada data</p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </>
                )}
              </motion.div>
            )}
            
            {/* Katalog SOP */}
            {currentPage === 'katalog' && (
              <motion.div
                key="katalog"
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <ShimmerTitle subtitle="Daftar lengkap dokumen SOP dan IK">Katalog SOP dan IK</ShimmerTitle>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                      <DialogTrigger asChild>
                        <Button className="btn-sar bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/30">
                          <Plus className="w-4 h-4 mr-2" />
                          Tambah SOP/IK
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg bg-white border border-orange-200 shadow-xl">
                        <DialogHeader>
                          <DialogTitle className="text-orange-600 flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            Upload SOP/IK Baru
                          </DialogTitle>
                          <DialogDescription className="text-gray-600">Isi form berikut untuk menambahkan SOP atau IK baru</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => handleUpload(e)} className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="font-medium text-gray-800">Judul SOP/IK</Label>
                            <Input 
                              value={uploadForm.judul}
                              onChange={(e) => setUploadForm({ ...uploadForm, judul: e.target.value })}
                              placeholder="Masukkan judul SOP atau IK"
                              required
                              className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="font-medium text-gray-800">Kategori</Label>
                              <Select value={uploadForm.kategori} onValueChange={(v) => setUploadForm({ ...uploadForm, kategori: v })}>
                                <SelectTrigger className="border-gray-300 bg-white text-gray-900 focus:ring-orange-500"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                                <SelectContent>
                                  {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="font-medium text-gray-800">Jenis</Label>
                              <Select value={uploadForm.jenis} onValueChange={(v) => setUploadForm({ ...uploadForm, jenis: v })}>
                                <SelectTrigger className="border-gray-300 bg-white text-gray-900 focus:ring-orange-500"><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                                <SelectContent>
                                  {JENIS_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="font-medium text-gray-800">Tahun</Label>
                              <Input 
                                type="number"
                                value={uploadForm.tahun}
                                onChange={(e) => setUploadForm({ ...uploadForm, tahun: parseInt(e.target.value) })}
                                required
                                className="border-gray-300 bg-white text-gray-900 focus:border-orange-500 focus:ring-orange-500"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="font-medium text-gray-800">Status</Label>
                              <Select value={uploadForm.status} onValueChange={(v) => setUploadForm({ ...uploadForm, status: v })}>
                                <SelectTrigger className="border-gray-300 bg-white text-gray-900 focus:ring-orange-500"><SelectValue placeholder="Pilih status" /></SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-medium text-gray-800">Upload File (Excel/PDF)</Label>
                            
                            {/* Custom File Upload Dropzone */}
                            <div 
                              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                                uploadForm.file 
                                  ? 'border-green-400 bg-green-50' 
                                  : 'border-orange-300 bg-orange-50/50 hover:border-orange-400 hover:bg-orange-50'
                              }`}
                              onClick={() => document.getElementById('file-input')?.click()}
                              onDragOver={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const file = e.dataTransfer.files?.[0]
                                if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.pdf'))) {
                                  setUploadForm({ ...uploadForm, file })
                                }
                              }}
                            >
                              <input 
                                id="file-input"
                                type="file"
                                accept=".xlsx,.pdf"
                                className="hidden"
                                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                              />
                              
                              {uploadForm.file ? (
                                <div className="flex items-center justify-center gap-3">
                                  <div className="flex-shrink-0">
                                    {uploadForm.file.name.endsWith('.xlsx') ? (
                                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                                        <FileIcon className="w-6 h-6 text-red-600" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="font-medium text-gray-800 truncate max-w-[200px]">{uploadForm.file.name}</p>
                                    <p className="text-sm text-gray-500">
                                      {(uploadForm.file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setUploadForm({ ...uploadForm, file: null })
                                    }}
                                    className="flex-shrink-0 p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex justify-center">
                                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                                      <Upload className="w-8 h-8 text-orange-500" />
                                    </div>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-700">
                                      <span className="text-orange-600">Klik untuk upload</span> atau drag & drop
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                      Format: XLSX, PDF (Maks. 4 MB)
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)} className="border-gray-300 text-gray-700 hover:bg-gray-100">Batal</Button>
                            <Button type="submit" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white" disabled={loading}>
                              Upload
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  {/* Edit SOP Dialog */}
                  <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="sm:max-w-md bg-white border-2 border-orange-200 shadow-xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">Edit Data SOP</DialogTitle>
                        <DialogDescription className="text-gray-600">
                          Perbarui informasi dokumen {editData?.nomorSop}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-judul" className="text-gray-800 font-medium">Judul</Label>
                          <Input
                            id="edit-judul"
                            value={editForm.judul}
                            onChange={(e) => setEditForm({ ...editForm, judul: e.target.value })}
                            className="border-gray-300 bg-white text-gray-900"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-800 font-medium">Kategori</Label>
                            <Select value={editForm.kategori} onValueChange={(v) => setEditForm({ ...editForm, kategori: v })}>
                              <SelectTrigger className="border-gray-300 bg-white text-gray-900">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {KATEGORI_OPTIONS.map(k => (
                                  <SelectItem key={k} value={k}>{k}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-800 font-medium">Jenis</Label>
                            <Select value={editForm.jenis} onValueChange={(v) => setEditForm({ ...editForm, jenis: v })}>
                              <SelectTrigger className="border-gray-300 bg-white text-gray-900">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {JENIS_OPTIONS.map(j => (
                                  <SelectItem key={j} value={j}>{j}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-800 font-medium">Tahun</Label>
                            <Input
                              type="number"
                              value={editForm.tahun}
                              onChange={(e) => setEditForm({ ...editForm, tahun: parseInt(e.target.value) || new Date().getFullYear() })}
                              className="border-gray-300 bg-white text-gray-900"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-800 font-medium">Status</Label>
                            <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                              <SelectTrigger className="border-gray-300 bg-white text-gray-900">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="border-gray-300 text-gray-700 hover:bg-gray-100">
                          Batal
                        </Button>
                        <Button type="button" onClick={handleSaveEdit} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                          Simpan Perubahan
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Excel Edit Dialog - Microsoft 365 (No User Login Required) */}
                  <Dialog open={showExcelEditDialog} onOpenChange={setShowExcelEditDialog}>
                    <DialogContent className="sm:max-w-lg bg-white border-2 border-orange-200 shadow-xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <FileSpreadsheet className="w-5 h-5 text-green-600" />
                          Edit File Excel Online
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                          Edit langsung di Excel Online - tidak perlu login Microsoft
                        </DialogDescription>
                      </DialogHeader>
                      
                      {excelEditData && (
                        <div className="space-y-4">
                          {/* File Info */}
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <FileSpreadsheet className="w-10 h-10 text-green-600 mt-1" />
                              <div>
                                <p className="font-bold text-gray-900">{excelEditData.fileName}</p>
                                <p className="text-sm text-gray-600">{excelEditData.nomorSop} - {excelEditData.judul}</p>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">{excelEditData.jenis}</Badge>
                                  <Badge variant="outline" className="text-xs">{excelEditData.kategori}</Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Loading State */}
                          {excelEditLoading && (
                            <div className="flex flex-col items-center justify-center py-8">
                              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
                              <p className="text-gray-600">Memproses file...</p>
                              <p className="text-xs text-gray-400 mt-1">Download dari R2, upload ke OneDrive</p>
                            </div>
                          )}
                          
                          {/* Ready State */}
                          {!excelEditLoading && excelEditUrl && (
                            <>
                              {/* Success Message */}
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-green-800">
                                  <CheckCircle className="w-5 h-5" />
                                  <span className="font-medium">File siap diedit!</span>
                                </div>
                                <p className="text-sm text-green-700 mt-2">
                                  Klik tombol di bawah untuk membuka Excel Online. Edit file, simpan, lalu kembali ke sini untuk sync ke R2.
                                </p>
                              </div>
                              
                              {/* Instructions */}
                              <Alert className="bg-blue-50 border-blue-200">
                                <AlertTriangle className="w-4 h-4 text-blue-600" />
                                <AlertDescription className="text-blue-800 text-sm">
                                  <strong>Cara Edit:</strong><br/>
                                  1. Klik "Buka Excel Online" untuk mulai edit<br/>
                                  2. Edit file di browser (Excel Online)<br/>
                                  3. Simpan perubahan (Ctrl+S atau File → Save)<br/>
                                  4. Kembali ke sini dan klik "Sync ke R2"
                                </AlertDescription>
                              </Alert>
                              
                              {/* Session Info */}
                              {excelEditSessionId && (
                                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                  Session: {excelEditSessionId}
                                </div>
                              )}
                              
                              {/* Action Buttons */}
                              <div className="space-y-3">
                                <Button
                                  onClick={handleOpenExcelOnline}
                                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                                >
                                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                                  Buka Excel Online
                                </Button>
                                
                                <div className="flex gap-3">
                                  <Button
                                    onClick={handleCheckEditStatus}
                                    variant="outline"
                                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Cek Status
                                  </Button>
                                  <Button
                                    onClick={handleSyncToR2}
                                    disabled={excelEditSyncing}
                                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                                  >
                                    {excelEditSyncing ? (
                                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                                    ) : (
                                      <><Cloud className="w-4 h-4 mr-2" /> Sync ke R2</>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                          
                          {/* Error State */}
                          {!excelEditLoading && !excelEditUrl && (
                            <div className="text-center py-4">
                              <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                              <p className="text-gray-600">Gagal mempersiapkan file untuk editing</p>
                              <Button
                                onClick={() => handleOpenExcelEdit(excelEditData.id)}
                                variant="outline"
                                className="mt-3"
                              >
                                Coba Lagi
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  {/* Desktop Sync Dialog - Upload edited file */}
                  <Dialog open={showDesktopSyncDialog} onOpenChange={setShowDesktopSyncDialog}>
                    <DialogContent className="sm:max-w-md bg-white border-2 border-orange-200 shadow-xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <RefreshCw className="w-5 h-5 text-orange-600" />
                          Selesai Edit & Sync
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                          Upload file hasil edit untuk disinkronkan ke storage
                        </DialogDescription>
                      </DialogHeader>
                      
                      {excelEditData && (
                        <div className="space-y-4">
                          {/* File Info */}
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <FileSpreadsheet className="w-10 h-10 text-green-600 mt-1" />
                              <div>
                                <p className="font-bold text-gray-900">{excelEditData.fileName}</p>
                                <p className="text-sm text-gray-600">{excelEditData.nomorSop} - {excelEditData.judul}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Session Info */}
                          {desktopEditSessionToken && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm text-blue-800">
                                <strong>Session aktif:</strong> Maksimal 30 menit sejak download
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                Original hash: {desktopEditOriginalHash?.slice(0, 16)}...
                              </p>
                            </div>
                          )}
                          
                          {/* File Picker */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-700">
                              Pilih File Hasil Edit
                            </Label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                              <input
                                type="file"
                                accept=".xlsx,.xls,.xlsm"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    setDesktopSyncFile(file)
                                  }
                                }}
                                className="hidden"
                                id="desktop-sync-file"
                              />
                              <label
                                htmlFor="desktop-sync-file"
                                className="cursor-pointer"
                              >
                                {desktopSyncFile ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="text-sm text-gray-700">{desktopSyncFile.name}</span>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">
                                      Klik untuk memilih file
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      Format: .xlsx, .xls, .xlsm
                                    </p>
                                  </>
                                )}
                              </label>
                            </div>
                          </div>
                          
                          {/* Info */}
                          <Alert className="bg-amber-50 border-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <AlertDescription className="text-amber-800 text-sm">
                              <strong>Penting:</strong> File akan di-checksum dan dibandingkan dengan file asli.
                              Jika tidak ada perubahan, file tidak akan di-upload.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                      
                      <DialogFooter className="gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowDesktopSyncDialog(false)}
                          className="border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          Batal
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleDesktopSync}
                          disabled={!desktopSyncFile || desktopSyncing}
                          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                        >
                          {desktopSyncing ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                          ) : (
                            <><RefreshCw className="w-4 h-4 mr-2" /> Sync ke R2</>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Conflict Dialog - When file changed during edit session */}
                  <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
                    <DialogContent className="sm:max-w-lg bg-white border-2 border-red-300 shadow-xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-red-800 flex items-center gap-2">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                          ⚠️ Konflik Terdeteksi!
                        </DialogTitle>
                        <DialogDescription className="text-gray-700">
                          File telah diperbarui oleh user lain sejak Anda mulai edit.
                        </DialogDescription>
                      </DialogHeader>
                      
                      {conflictData && (
                        <div className="space-y-4">
                          {/* Warning Message */}
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 font-medium">
                              {conflictData.message}
                            </p>
                          </div>
                          
                          {/* Last Editor Info */}
                          {conflictData.lastEditor && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-sm text-amber-800">
                                <strong>Terakhir diedit oleh:</strong><br/>
                                {conflictData.lastEditor.name || conflictData.lastEditor.email}
                              </p>
                              <p className="text-xs text-amber-600 mt-1">
                                Waktu: {new Date(conflictData.lastEditor.syncedAt).toLocaleString('id-ID')}
                              </p>
                            </div>
                          )}
                          
                          {/* Hash Info */}
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 text-xs">Hash Awal (Anda)</p>
                                <p className="font-mono text-xs text-gray-700 truncate">
                                  {conflictData.originalHash?.slice(0, 20)}...
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Hash Saat Ini (R2)</p>
                                <p className="font-mono text-xs text-red-600 truncate">
                                  {conflictData.currentHash?.slice(0, 20)}...
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Options */}
                          <Alert className="bg-blue-50 border-blue-200">
                            <AlertTriangle className="w-4 h-4 text-blue-600" />
                            <AlertDescription className="text-blue-800 text-sm">
                              <strong>Pilihan Anda:</strong><br/>
                              • <strong>Force Overwrite:</strong> Timpa file dengan perubahan Anda (perubahan user lain akan hilang)<br/>
                              • <strong>Batalkan:</strong> Simpan file hasil edit Anda secara lokal dan download ulang file terbaru
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                      
                      <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleCancelSession}
                          className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Batalkan Sesi
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleForceSync}
                          disabled={forceSyncing}
                          className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white"
                        >
                          {forceSyncing ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                          ) : (
                            <><AlertTriangle className="w-4 h-4 mr-2" /> Force Overwrite</>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Excel Edit Diagnostic Dialog */}
                  <Dialog open={showDiagnosticDialog} onOpenChange={setShowDiagnosticDialog}>
                    <DialogContent className="sm:max-w-2xl bg-white border-2 border-orange-200 shadow-xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-orange-600" />
                          Diagnostik Excel Edit System
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                          Memeriksa semua komponen untuk fitur edit Excel dengan Microsoft 365
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {diagnosticLoading && (
                          <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                            <p className="text-gray-600">Menjalankan diagnostik...</p>
                          </div>
                        )}
                        
                        {diagnosticResult && !diagnosticLoading && (
                          <>
                            {/* Summary */}
                            <div className={`p-4 rounded-lg ${
                              diagnosticResult.success 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-red-50 border border-red-200'
                            }`}>
                              <div className="flex items-center gap-3">
                                {diagnosticResult.success ? (
                                  <CheckCircle className="w-8 h-8 text-green-500" />
                                ) : (
                                  <XCircle className="w-8 h-8 text-red-500" />
                                )}
                                <div>
                                  <p className={`font-bold ${diagnosticResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                    {diagnosticResult.success ? 'Semua Sistem Berfungsi!' : 'Terdapat Masalah'}
                                  </p>
                                  <p className={`text-sm ${diagnosticResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                    {diagnosticResult.message}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Stats */}
                              <div className="flex gap-4 mt-3 text-sm">
                                <span className="text-gray-600">
                                  Total: <strong>{diagnosticResult.summary.totalSteps}</strong>
                                </span>
                                <span className="text-green-600">
                                  Pass: <strong>{diagnosticResult.summary.passed}</strong>
                                </span>
                                <span className="text-red-600">
                                  Fail: <strong>{diagnosticResult.summary.failed}</strong>
                                </span>
                              </div>
                            </div>
                            
                            {/* Results List */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-700">Detail Hasil:</h4>
                              {diagnosticResult.results.map((result, index) => (
                                <div 
                                  key={index}
                                  className={`p-3 rounded-lg border ${
                                    result.success 
                                      ? 'bg-green-50 border-green-200' 
                                      : 'bg-red-50 border-red-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {result.success ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                      ) : (
                                        <XCircle className="w-5 h-5 text-red-500" />
                                      )}
                                      <span className="font-medium text-gray-900">{result.step}</span>
                                    </div>
                                    {result.duration && (
                                      <span className="text-xs text-gray-500">{result.duration}ms</span>
                                    )}
                                  </div>
                                  <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                    {result.message}
                                  </p>
                                  {result.error && (
                                    <p className="text-xs text-red-600 mt-1 font-mono bg-red-100 p-2 rounded">
                                      {result.error}
                                    </p>
                                  )}
                                  {result.details && (
                                    <div className="mt-2 text-xs bg-gray-100 p-2 rounded font-mono overflow-x-auto">
                                      {Object.entries(result.details).map(([key, value]) => (
                                        <div key={key} className="flex gap-2">
                                          <span className="text-gray-500">{key}:</span>
                                          <span className={typeof value === 'string' && value.includes('✅') ? 'text-green-600' : typeof value === 'string' && value.includes('❌') ? 'text-red-600' : 'text-gray-700'}>
                                            {String(value)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            {/* Next Steps */}
                            {!diagnosticResult.success && diagnosticResult.nextSteps.length > 0 && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="font-semibold text-amber-800 mb-2">Langkah Selanjutnya:</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
                                  {diagnosticResult.nextSteps.map((step, index) => (
                                    <li key={index}>{step}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      <DialogFooter className="gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowDiagnosticDialog(false)}
                          className="border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          Tutup
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleRunDiagnostic}
                          disabled={diagnosticLoading}
                          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                        >
                          {diagnosticLoading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menjalankan...</>
                          ) : (
                            <><RefreshCw className="w-4 h-4 mr-2" /> Jalankan Ulang</>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {/* Filters */}
                <Card className="bg-white border-2 border-orange-200 shadow-xl">
                  <CardContent className="p-5">
                    {/* Row 1: Search and Sort */}
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                      <div className="flex-1 relative">
                        <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">Pencarian</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input 
                            placeholder="Cari nomor atau judul dokumen..."
                            value={searchInput}
                            onChange={(e) => {
                              setSearchInput(e.target.value)
                              setIsSearching(true)
                            }}
                            className="pl-10 pr-10 h-11 border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500 rounded-lg"
                          />
                          {isSearching && (
                            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin" />
                          )}
                          {searchInput && !isSearching && (
                            <button
                              onClick={() => {
                                setSearchInput('')
                                setIsSearching(true)
                              }}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="w-full md:w-56">
                        <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">Urutkan</Label>
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                          <SelectTrigger className="h-11 border-2 border-gray-200 bg-white text-gray-900 focus:ring-orange-500 rounded-lg">
                            <SelectValue placeholder="Pilih urutan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tahun-asc">Tahun (Terkecil → Terbesar)</SelectItem>
                            <SelectItem value="tahun-desc">Tahun (Terbesar → Terkecil)</SelectItem>
                            <SelectItem value="uploadedAt-desc">Terbaru Diupload</SelectItem>
                            <SelectItem value="uploadedAt-asc">Terlama Diupload</SelectItem>
                            <SelectItem value="judul-asc">Judul (A → Z)</SelectItem>
                            <SelectItem value="judul-desc">Judul (Z → A)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Row 2: Filters */}
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-[140px]">
                        <Label className="text-xs font-medium text-gray-600 mb-1 block">Kategori</Label>
                        <Select value={sopFilters.kategori} onValueChange={(v) => setSopFilters({ ...sopFilters, kategori: v })}>
                          <SelectTrigger className="h-10 border-gray-200 bg-white text-gray-900 text-sm rounded-lg">
                            <SelectValue placeholder="Kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SEMUA">Semua Kategori</SelectItem>
                            {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <Label className="text-xs font-medium text-gray-600 mb-1 block">Jenis</Label>
                        <Select value={sopFilters.jenis} onValueChange={(v) => setSopFilters({ ...sopFilters, jenis: v })}>
                          <SelectTrigger className="h-10 border-gray-200 bg-white text-gray-900 text-sm rounded-lg">
                            <SelectValue placeholder="Jenis" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SEMUA">Semua Jenis</SelectItem>
                            {JENIS_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <Label className="text-xs font-medium text-gray-600 mb-1 block">Status</Label>
                        <Select value={sopFilters.status} onValueChange={(v) => setSopFilters({ ...sopFilters, status: v })}>
                          <SelectTrigger className="h-10 border-gray-200 bg-white text-gray-900 text-sm rounded-lg">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SEMUA">Semua Status</SelectItem>
                            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <Label className="text-xs font-medium text-gray-600 mb-1 block">Tahun</Label>
                        <Select value={sopFilters.tahun || 'SEMUA'} onValueChange={(v) => setSopFilters({ ...sopFilters, tahun: v === 'SEMUA' ? '' : v })}>
                          <SelectTrigger className="h-10 border-gray-200 bg-white text-gray-900 text-sm rounded-lg">
                            <SelectValue placeholder="Tahun" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SEMUA">Semua Tahun</SelectItem>
                            {stats?.byTahun?.map(t => (
                              <SelectItem key={t.tahun} value={t.tahun.toString()}>{t.tahun}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(sopFilters.kategori !== 'SEMUA' || sopFilters.jenis !== 'SEMUA' || sopFilters.status !== 'SEMUA' || sopFilters.tahun || searchInput) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSearchInput('')
                            setSopFilters({ kategori: 'SEMUA', jenis: 'SEMUA', status: 'SEMUA', tahun: '', search: '' })
                            setIsSearching(true)
                          }}
                          className="h-10 px-4 border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Table */}
                <Card className="bg-white border-2 border-orange-200 shadow-xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-orange-500 to-yellow-500">
                            <TableHead className="font-bold text-white">Nomor</TableHead>
                            <TableHead className="font-bold text-white">Judul</TableHead>
                            <TableHead className="font-bold text-white">Tahun</TableHead>
                            <TableHead className="font-bold text-white">Kategori</TableHead>
                            <TableHead className="font-bold text-white">Jenis</TableHead>
                            <TableHead className="font-bold text-white">Status</TableHead>
                            <TableHead className="font-bold text-white">Tanggal Upload</TableHead>
                            <TableHead className="font-bold text-white text-center">Aksi</TableHead>
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
                              <TableRow 
                                key={sop.id} 
                                className="hover:bg-orange-50 border-b border-gray-200"
                              >
                                <TableCell className="font-semibold text-blue-900">{sop.nomorSop}</TableCell>
                                <TableCell className="text-gray-800">{sop.judul}</TableCell>
                                <TableCell className="text-gray-600">{sop.tahun}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-orange-500 bg-orange-50 text-orange-700">{sop.kategori}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={sop.jenis === 'SOP' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'}>
                                    {sop.jenis}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={STATUS_COLORS[sop.status]}>
                                    {sop.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-600">{new Date(sop.uploadedAt).toLocaleDateString('id-ID')}</TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => handlePreview(sop.id)} title="Preview" className="hover:bg-cyan-500/20">
                                      <Eye className="w-4 h-4 text-cyan-400" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(sop.id)} title="Edit" className="hover:bg-orange-500/20">
                                      <Edit className="w-4 h-4 text-orange-400" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleDownload(sop.id)} title="Download" className="hover:bg-green-500/20">
                                      <Download className="w-4 h-4 text-green-400" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handlePrint(sop.id)} title="Print" className="hover:bg-gray-500/20">
                                      <Printer className="w-4 h-4 text-gray-400" />
                                    </Button>
                                    {user?.role === 'ADMIN' && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="hover:bg-green-100"
                                            title="Edit Excel"
                                          >
                                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>Pilih Mode Edit</DropdownMenuLabel>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => handleOpenExcelEdit(sop.id)}>
                                            <Cloud className="w-4 h-4 mr-2 text-blue-500" />
                                            Edit Online (Excel Online)
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleDesktopEdit(sop.id)}>
                                            <Download className="w-4 h-4 mr-2 text-orange-500" />
                                            Edit di Desktop (Download)
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                    {user?.role === 'ADMIN' && desktopEditSessionToken && (
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="hover:bg-orange-100"
                                        onClick={handleOpenDesktopSync}
                                        title="Selesai Edit & Sync"
                                      >
                                        <RefreshCw className="w-4 h-4 text-orange-600" />
                                      </Button>
                                    )}
                                    {user?.role === 'ADMIN' && (
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="hover:bg-red-100"
                                        onClick={() => handleDeleteSop(sop.id, sop.fileName)}
                                        title="Hapus File"
                                      >
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
                    </div>
                  </CardContent>
                </Card>
                
                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    Menampilkan {sopFiles.length} dari {sopPagination.total} data
                  </p>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={sopPagination.page === 1}
                      onClick={() => setSopPagination(p => ({ ...p, page: p.page - 1 }))}
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-400">Halaman {sopPagination.page} dari {sopPagination.totalPages || 1}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={sopPagination.page >= sopPagination.totalPages}
                      onClick={() => setSopPagination(p => ({ ...p, page: p.page + 1 }))}
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Other pages - Verifikasi, Logs, Users */}
            {currentPage === 'verifikasi' && (
              <motion.div
                key="verifikasi"
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <ShimmerTitle subtitle="Kelola pengajuan SOP dan IK dari publik">Verifikasi SOP Publik</ShimmerTitle>
                  <Select value={verificationFilter} onValueChange={(v) => setVerificationFilter(v)}>
                    <SelectTrigger className="w-48 border-orange-300 bg-white text-gray-900">
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
                  <StatCard title="Total SOP Aktif" value={stats?.totalAktif || 0} icon={CheckCircle} color="orange" delay={0} />
                  <StatCard title="Menunggu Verifikasi" value={stats?.totalPublikMenunggu || 0} icon={Clock} color="yellow" delay={0.1} />
                  <StatCard title="Total Ditolak" value={stats?.totalPublikDitolak || 0} icon={XCircle} color="red" delay={0.2} />
                </div>
                
                {/* Verification Table */}
                <Card className="bg-white border-2 border-orange-200 shadow-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
                    <CardTitle className="text-lg">Daftar Pengajuan Publik</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-orange-400 to-yellow-400">
                            <TableHead className="font-bold text-white">Pengirim</TableHead>
                            <TableHead className="font-bold text-white">Judul</TableHead>
                            <TableHead className="font-bold text-white">Jenis</TableHead>
                            <TableHead className="font-bold text-white">Kategori</TableHead>
                            <TableHead className="font-bold text-white">Status</TableHead>
                            <TableHead className="font-bold text-white">Tanggal</TableHead>
                            <TableHead className="font-bold text-white text-center">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {verificationList.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                                <div className="flex flex-col items-center gap-2">
                                  <FileText className="w-12 h-12 text-gray-400" />
                                  <p>Tidak ada pengajuan</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            verificationList.map((sop) => (
                              <TableRow key={sop.id} className="hover:bg-orange-50 border-b border-gray-200">
                                <TableCell>
                                  <div>
                                    <p className="font-semibold text-blue-900">{sop.submitterName}</p>
                                    <p className="text-sm text-gray-600">{sop.submitterEmail}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold text-blue-900">{sop.judul}</TableCell>
                                <TableCell>
                                  <Badge className={sop.jenis === 'SOP' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'}>
                                    {sop.jenis}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-orange-500 bg-orange-50 text-orange-700">{sop.kategori}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={
                                    sop.verificationStatus === 'MENUNGGU' ? 'bg-blue-500 text-white' :
                                    sop.verificationStatus === 'DISETUJUI' ? 'bg-green-500 text-white' :
                                    'bg-red-500 text-white'
                                  }>
                                    {sop.verificationStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-700">{new Date(sop.uploadedAt).toLocaleDateString('id-ID')}</TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => handlePreview(sop.id)} title="Preview" className="hover:bg-cyan-100">
                                      <Eye className="w-4 h-4 text-cyan-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleDownload(sop.id)} title="Download" className="hover:bg-green-100">
                                      <Download className="w-4 h-4 text-green-600" />
                                    </Button>
                                    {sop.verificationStatus === 'MENUNGGU' && (
                                      <>
                                        <Button size="icon" variant="ghost" onClick={() => handleVerification(sop.id, 'DISETUJUI')} title="Setujui" className="hover:bg-green-100">
                                          <Check className="w-4 h-4 text-green-600" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleVerification(sop.id, 'DITOLAK')} title="Tolak" className="hover:bg-red-100">
                                          <X className="w-4 h-4 text-red-600" />
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
              </motion.div>
            )}
            
            {currentPage === 'logs' && (
              <motion.div
                key="logs"
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <ShimmerTitle subtitle="Riwayat semua aktivitas sistem">Log Aktivitas</ShimmerTitle>
                
                <Card className="bg-white border-2 border-orange-200 shadow-xl overflow-hidden">
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-orange-500 to-yellow-500 sticky top-0">
                            <TableHead className="font-bold text-white">Waktu</TableHead>
                            <TableHead className="font-bold text-white">User</TableHead>
                            <TableHead className="font-bold text-white">Aktivitas</TableHead>
                            <TableHead className="font-bold text-white">Deskripsi</TableHead>
                            <TableHead className="font-bold text-white">File</TableHead>
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
                              <TableRow key={log.id} className="hover:bg-orange-50 border-b border-gray-200">
                                <TableCell className="text-sm text-gray-700">
                                  {new Date(log.createdAt).toLocaleString('id-ID')}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-semibold text-blue-900">{log.user?.name}</p>
                                    <p className="text-xs text-gray-500">{log.user?.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={
                                    log.aktivitas === 'LOGIN' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                    log.aktivitas === 'UPLOAD' ? 'bg-green-100 text-green-700 border-green-300' :
                                    log.aktivitas === 'DOWNLOAD' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                                    log.aktivitas === 'PREVIEW' ? 'bg-cyan-100 text-cyan-700 border-cyan-300' :
                                    log.aktivitas === 'VERIFIKASI' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                    'bg-gray-100 text-gray-700 border-gray-300'
                                  }>
                                    {log.aktivitas}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-700">{log.deskripsi}</TableCell>
                                <TableCell>
                                  {log.sopFile && (
                                    <span className="text-sm text-orange-600 font-medium">{log.sopFile.nomorSop}</span>
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
                  <p className="text-sm text-gray-600">
                    Menampilkan {logs.length} log
                  </p>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={logsPagination.page === 1}
                      onClick={() => setLogsPagination(p => ({ ...p, page: p.page - 1 }))}
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600 font-medium">Halaman {logsPagination.page}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={logsPagination.page >= logsPagination.totalPages}
                      onClick={() => setLogsPagination(p => ({ ...p, page: p.page + 1 }))}
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
            
            {currentPage === 'users' && (
              <motion.div
                key="users"
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <ShimmerTitle subtitle="Kelola pengguna sistem">Manajemen User</ShimmerTitle>
                  <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                    <DialogTrigger asChild>
                      <Button className="btn-sar bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/30">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white border-2 border-orange-200 shadow-xl p-0 overflow-hidden">
                      {/* Header with gradient */}
                      <DialogHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 p-5 text-white">
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                          <Users className="w-5 h-5" />
                          Tambah User Baru
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateUser} className="p-5 space-y-5">
                        <div className="space-y-2">
                          <Label className="font-semibold text-blue-900">Nama Lengkap</Label>
                          <Input 
                            value={newUserForm.name}
                            onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                            placeholder="Masukkan nama lengkap"
                            required
                            className="border-2 border-gray-200 focus:border-orange-500 text-gray-900 placeholder:text-gray-400 h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-semibold text-blue-900">Email</Label>
                          <Input 
                            type="email"
                            value={newUserForm.email}
                            onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                            placeholder="Masukkan email"
                            required
                            className="border-2 border-gray-200 focus:border-orange-500 text-gray-900 placeholder:text-gray-400 h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-semibold text-blue-900">Password</Label>
                          <Input 
                            type="password"
                            value={newUserForm.password}
                            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                            placeholder="Masukkan password"
                            required
                            className="border-2 border-gray-200 focus:border-orange-500 text-gray-900 placeholder:text-gray-400 h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-semibold text-blue-900">Role</Label>
                          <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v })}>
                            <SelectTrigger className="border-2 border-gray-200 focus:border-orange-500 text-gray-900 h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="STAF">Staf</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter className="pt-2 gap-2">
                          <Button type="button" variant="outline" onClick={() => setShowUserDialog(false)} className="border-gray-300 text-gray-700 hover:bg-gray-100">Batal</Button>
                          <Button type="submit" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white" disabled={loading}>
                            Simpan
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Desktop Sync Dialog - Upload edited file */}
                  <Dialog open={showDesktopSyncDialog} onOpenChange={setShowDesktopSyncDialog}>
                    <DialogContent className="sm:max-w-md bg-white border-2 border-orange-200 shadow-xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <RefreshCw className="w-5 h-5 text-orange-600" />
                          Selesai Edit & Sync
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                          Upload file hasil edit untuk disinkronkan ke storage
                        </DialogDescription>
                      </DialogHeader>
                      
                      {excelEditData && (
                        <div className="space-y-4">
                          {/* File Info */}
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <FileSpreadsheet className="w-10 h-10 text-green-600 mt-1" />
                              <div>
                                <p className="font-bold text-gray-900">{excelEditData.fileName}</p>
                                <p className="text-sm text-gray-600">{excelEditData.nomorSop} - {excelEditData.judul}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Session Info */}
                          {desktopEditSessionToken && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm text-blue-800">
                                <strong>Session aktif:</strong> Maksimal 30 menit sejak download
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                Original hash: {desktopEditOriginalHash?.slice(0, 16)}...
                              </p>
                            </div>
                          )}
                          
                          {/* File Picker */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-700">
                              Pilih File Hasil Edit
                            </Label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                              <input
                                type="file"
                                accept=".xlsx,.xls,.xlsm"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    setDesktopSyncFile(file)
                                  }
                                }}
                                className="hidden"
                                id="desktop-sync-file"
                              />
                              <label
                                htmlFor="desktop-sync-file"
                                className="cursor-pointer"
                              >
                                {desktopSyncFile ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="text-sm text-gray-700">{desktopSyncFile.name}</span>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">
                                      Klik untuk memilih file
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      Format: .xlsx, .xls, .xlsm
                                    </p>
                                  </>
                                )}
                              </label>
                            </div>
                          </div>
                          
                          {/* Info */}
                          <Alert className="bg-amber-50 border-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <AlertDescription className="text-amber-800 text-sm">
                              <strong>Penting:</strong> File akan di-checksum dan dibandingkan dengan file asli.
                              Jika tidak ada perubahan, file tidak akan di-upload.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                      
                      <DialogFooter className="gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowDesktopSyncDialog(false)}
                          className="border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          Batal
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleDesktopSync}
                          disabled={!desktopSyncFile || desktopSyncing}
                          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                        >
                          {desktopSyncing ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                          ) : (
                            <><RefreshCw className="w-4 h-4 mr-2" /> Sync ke R2</>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Excel Edit Diagnostic Dialog */}
                  <Dialog open={showDiagnosticDialog} onOpenChange={setShowDiagnosticDialog}>
                    <DialogContent className="sm:max-w-2xl bg-white border-2 border-orange-200 shadow-xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-orange-600" />
                          Diagnostik Excel Edit System
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                          Memeriksa semua komponen untuk fitur edit Excel dengan Microsoft 365
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {diagnosticLoading && (
                          <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                            <p className="text-gray-600">Menjalankan diagnostik...</p>
                          </div>
                        )}
                        
                        {diagnosticResult && !diagnosticLoading && (
                          <>
                            {/* Summary */}
                            <div className={`p-4 rounded-lg ${
                              diagnosticResult.success 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-red-50 border border-red-200'
                            }`}>
                              <div className="flex items-center gap-3">
                                {diagnosticResult.success ? (
                                  <CheckCircle className="w-8 h-8 text-green-500" />
                                ) : (
                                  <XCircle className="w-8 h-8 text-red-500" />
                                )}
                                <div>
                                  <p className={`font-bold ${diagnosticResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                    {diagnosticResult.success ? 'Semua Sistem Berfungsi!' : 'Terdapat Masalah'}
                                  </p>
                                  <p className={`text-sm ${diagnosticResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                    {diagnosticResult.message}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Stats */}
                              <div className="flex gap-4 mt-3 text-sm">
                                <span className="text-gray-600">
                                  Total: <strong>{diagnosticResult.summary.totalSteps}</strong>
                                </span>
                                <span className="text-green-600">
                                  Pass: <strong>{diagnosticResult.summary.passed}</strong>
                                </span>
                                <span className="text-red-600">
                                  Fail: <strong>{diagnosticResult.summary.failed}</strong>
                                </span>
                              </div>
                            </div>
                            
                            {/* Results List */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-700">Detail Hasil:</h4>
                              {diagnosticResult.results.map((result, index) => (
                                <div 
                                  key={index}
                                  className={`p-3 rounded-lg border ${
                                    result.success 
                                      ? 'bg-green-50 border-green-200' 
                                      : 'bg-red-50 border-red-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {result.success ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                      ) : (
                                        <XCircle className="w-5 h-5 text-red-500" />
                                      )}
                                      <span className="font-medium text-gray-900">{result.step}</span>
                                    </div>
                                    {result.duration && (
                                      <span className="text-xs text-gray-500">{result.duration}ms</span>
                                    )}
                                  </div>
                                  <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                    {result.message}
                                  </p>
                                  {result.error && (
                                    <p className="text-xs text-red-600 mt-1 font-mono bg-red-100 p-2 rounded">
                                      {result.error}
                                    </p>
                                  )}
                                  {result.details && (
                                    <div className="mt-2 text-xs bg-gray-100 p-2 rounded font-mono overflow-x-auto">
                                      {Object.entries(result.details).map(([key, value]) => (
                                        <div key={key} className="flex gap-2">
                                          <span className="text-gray-500">{key}:</span>
                                          <span className={typeof value === 'string' && value.includes('✅') ? 'text-green-600' : typeof value === 'string' && value.includes('❌') ? 'text-red-600' : 'text-gray-700'}>
                                            {String(value)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            {/* Next Steps */}
                            {!diagnosticResult.success && diagnosticResult.nextSteps.length > 0 && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="font-semibold text-amber-800 mb-2">Langkah Selanjutnya:</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
                                  {diagnosticResult.nextSteps.map((step, index) => (
                                    <li key={index}>{step}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      <DialogFooter className="gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowDiagnosticDialog(false)}
                          className="border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          Tutup
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleRunDiagnostic}
                          disabled={diagnosticLoading}
                          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                        >
                          {diagnosticLoading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menjalankan...</>
                          ) : (
                            <><RefreshCw className="w-4 h-4 mr-2" /> Jalankan Ulang</>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <Card className="bg-white border-2 border-orange-200 shadow-xl overflow-hidden">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-orange-500 to-yellow-500">
                          <TableHead className="font-bold text-white">Nama</TableHead>
                          <TableHead className="font-bold text-white">Email</TableHead>
                          <TableHead className="font-bold text-white">Role</TableHead>
                          <TableHead className="font-bold text-white">Tanggal Dibuat</TableHead>
                          <TableHead className="font-bold text-white text-center">Aksi</TableHead>
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
                            <TableRow key={u.id} className="hover:bg-orange-50 border-b border-gray-200">
                              <TableCell className="font-semibold text-blue-900">{u.name}</TableCell>
                              <TableCell className="text-gray-700">{u.email}</TableCell>
                              <TableCell>
                                <Badge className={u.role === 'ADMIN' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white'}>
                                  {u.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-600">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}</TableCell>
                              <TableCell className="text-center">
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteUser(u.id)} className="hover:bg-red-100">
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      
      {/* Glowing Footer - Bottom Right - Visible on all pages */}
      <motion.div 
        className="fixed bottom-4 right-4 z-50"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-lg blur-md opacity-60 animate-pulse" />
          
          {/* Shimmer container */}
          <div className="relative px-4 py-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-lg border border-orange-500/30 overflow-hidden">
            {/* Animated shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent animate-shimmer" />
            
            {/* Text with glow */}
            <p className="text-sm font-medium relative z-10">
              <span className="text-gray-400">© </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-400 animate-pulse font-bold">
                FOE - 2026
              </span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
