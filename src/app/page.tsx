'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Globe,
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
import PrintLoadingDialog from '@/components/PrintLoadingDialog'
import CopyrightPopup from '@/components/CopyrightPopup'
import LogoutAnimation from '@/components/LogoutAnimation'

// Types
type UserRole = 'ADMIN' | 'STAF' | 'DEVELOPER' | null
type PageView = 'dashboard' | 'katalog' | 'upload' | 'verifikasi' | 'arsip' | 'logs' | 'users' | 'submit-publik'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt?: string
}

interface SopFile {
  id: string
  nomorSop?: string
  judul: string
  tahun: number
  kategori: string
  jenis: string
  lingkup?: string
  status: string
  fileName: string
  filePath: string
  fileType: string
  driveFileId?: string
  uploadedBy: string
  uploadedAt: string
  updatedAt?: string
  user?: { name: string }
  isPublicSubmission?: boolean
  submitterName?: string
  submitterEmail?: string
  keterangan?: string
  verificationStatus?: string
  rejectionReason?: string
  verifiedAt?: string
  arsipFolder?: string
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
  sopFile?: { judul: string }
}

interface Stats {
  totalSop: number
  totalIk: number
  totalAktif: number
  totalReview: number
  totalKadaluarsa: number
  totalPublikMenunggu: number
  totalPublikDitolak: number
  totalPublikDitolakBaru?: number
  totalPreviews: number
  totalDownloads: number
  byTahun: { tahun: number; count: number }[]
  byKategori: { kategori: string; count: number }[]
  byJenis: { jenis: string; count: number }[]
  byLingkup: { lingkup: string; count: number }[]
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

// File Type Icon Component
function FileTypeIcon({ fileName, className = "w-4 h-4" }: { fileName: string; className?: string }) {
  const ext = fileName?.split('.').pop()?.toLowerCase() || ''

  // PDF Icon - Red
  if (ext === 'pdf') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="#DC2626" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2V8H20" fill="#EF4444" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="7" y="17" fontSize="5" fontWeight="bold" fill="white">PDF</text>
      </svg>
    )
  }

  // Excel Icon - Green
  if (['xlsx', 'xls', 'xlsm'].includes(ext)) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="#16A34A" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2V8H20" fill="#22C55E" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="6" y="17" fontSize="5" fontWeight="bold" fill="white">XLS</text>
      </svg>
    )
  }

  // Word Icon - Blue
  if (['docx', 'doc'].includes(ext)) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="#2563EB" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2V8H20" fill="#3B82F6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="6" y="17" fontSize="5" fontWeight="bold" fill="white">DOC</text>
      </svg>
    )
  }

  // Default file icon
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
      <path d="M14 2V8H20" />
    </svg>
  )
}

const KATEGORI_OPTIONS = ['SIAGA', 'LATIHAN', 'LAINNYA']
const JENIS_OPTIONS = ['SOP', 'IK', 'LAINNYA']
const LINGKUP_OPTIONS = ['BCC', 'Dit. Siaga', 'Basarnas', 'Kantor SAR', 'Antar Instansi', 'Internasional']
const STATUS_OPTIONS = ['AKTIF', 'REVIEW', 'KADALUARSA']

// Animation variants - optimized for performance
const fadeInUp = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 }
}

// Fast fade for page transitions (minimal animation)
const pageTransition = {
  initial: { opacity: 0.5 },
  animate: { opacity: 1 },
  exit: { opacity: 0.5 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.02 // Much faster stagger
    }
  }
}

const scaleIn = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 }
}

const slideInLeft = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 }
}

// Majestic Animated Title Component
function ShimmerTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  const letters = typeof children === 'string' ? children.split('') : [];

  return (
    <div className="relative group cursor-default">
      <h2 className="text-3xl md:text-4xl font-black relative inline-flex overflow-hidden pb-2">
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 blur-2xl bg-yellow-400/30 rounded-full"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Text Container */}
        <div className="relative z-10 flex">
          {typeof children === 'string' ? (
            letters.map((letter, index) => (
              <motion.span
                key={index}
                className="inline-block text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500"
                style={{
                  textShadow: '0 4px 20px rgba(250, 204, 21, 0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.05,
                  type: 'spring',
                  damping: 12,
                  stiffness: 200
                }}
                whileHover={{
                  y: -5,
                  scale: 1.1,
                  color: '#facc15', // text-yellow-400
                  transition: { duration: 0.2 }
                }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </motion.span>
            ))
          ) : (
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500">
              {children}
            </span>
          )}
        </div>

        {/* Sweeping Shimmer Line Below Text */}
        <motion.div
          className="absolute bottom-0 left-0 h-1 rounded-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent"
          initial={{ width: '0%', opacity: 0 }}
          animate={{
            width: ['0%', '100%', '0%'],
            left: ['0%', '0%', '100%'],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatDelay: 1
          }}
        />
      </h2>

      {/* Animated Subtitle */}
      {subtitle && (
        <motion.p
          className="text-slate-500 dark:text-slate-400 text-sm md:text-base mt-2 font-medium tracking-wide flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <span className="w-8 h-[2px] bg-yellow-400/50 rounded-full inline-block" />
          {subtitle}
        </motion.p>
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
  trend,
  action
}: {
  title: string
  value: number | string
  icon: React.ElementType
  color: string
  delay?: number
  trend?: 'up' | 'down'
  action?: React.ReactNode
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
              <p className={`text-xl font-bold ${c.titleText}`}>{title}</p>
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
            <div className="flex flex-col items-end gap-2">
              {action}
              <motion.div
                className={`w-14 h-14 ${c.icon} rounded-xl flex items-center justify-center shadow-lg`}
                whileHover={{ rotate: 5, scale: 1.1 }}
              >
                <Icon className="w-7 h-7" />
              </motion.div>
            </div>
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
  const [arsipList, setArsipList] = useState<SopFile[]>([])

  // Pagination
  const [sopPagination, setSopPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [verificationPagination, setVerificationPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [arsipPagination, setArsipPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })

  // Filters
  const [sopFilters, setSopFilters] = useState({
    search: '',
    kategori: 'SEMUA',
    jenis: 'SEMUA',
    lingkup: 'SEMUA',
    status: 'SEMUA',
    tahun: ''
  })

  // Sorting
  const [sortBy, setSortBy] = useState<'tahun-asc' | 'tahun-desc' | 'uploadedAt-desc' | 'uploadedAt-asc' | 'judul-asc' | 'judul-desc'>('uploadedAt-desc')

  // Debounced search for live search
  const [searchInput, setSearchInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Verification filter
  const [verificationFilter, setVerificationFilter] = useState('SEMUA')
  const [verificationLingkupFilter, setVerificationLingkupFilter] = useState('SEMUA')
  const [verificationSearch, setVerificationSearch] = useState('')
  const [verificationSortBy, setVerificationSortBy] = useState<'uploadedAt-desc' | 'uploadedAt-asc'>('uploadedAt-desc')

  // Arsip filter and search
  const [arsipSearch, setArsipSearch] = useState('')
  const [arsipLingkupFilter, setArsipLingkupFilter] = useState('SEMUA')
  const [arsipSortBy, setArsipSortBy] = useState<'uploadedAt-desc' | 'uploadedAt-asc'>('uploadedAt-desc')
  const [arsipSeenCount, setArsipSeenCount] = useState(0) // Track count of rejected files user has seen

  // Loading states for table pagination (to prevent blinking)
  const [katalogLoading, setKatalogLoading] = useState(false)
  const [verifikasiLoading, setVerifikasiLoading] = useState(false)
  const [arsipLoading, setArsipLoading] = useState(false)

  // Pagination debounce - prevents rapid clicks and double-fetching
  const isPaginationLoadingRef = useRef(false)
  const paginationDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Forms
  const [uploadForm, setUploadForm] = useState({
    judul: '',
    kategori: 'SIAGA',
    jenis: 'SOP',
    lingkup: 'BCC',
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
    lingkup: 'BCC',
    tahun: new Date().getFullYear(),
    keterangan: '',
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
  const [exportingXlsx, setExportingXlsx] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  // PDF Edit Warning Dialog
  const [showPdfWarningDialog, setShowPdfWarningDialog] = useState(false)

  // Copyright Popup
  const [showCopyrightPopup, setShowCopyrightPopup] = useState(false)

  // Logout animation
  const [showLogoutAnimation, setShowLogoutAnimation] = useState(false)

  // Edit Dialog
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editData, setEditData] = useState<SopFile | null>(null)
  const [editForm, setEditForm] = useState({
    nomorSop: '',
    judul: '',
    kategori: 'SIAGA',
    jenis: 'SOP',
    lingkup: 'BCC',
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

  // Rejection dialog for verification
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Login success animation
  const [showLoginSuccess, setShowLoginSuccess] = useState(false)
  const [loginSuccessName, setLoginSuccessName] = useState('')
  const [loginSuccessRole, setLoginSuccessRole] = useState<'ADMIN' | 'STAF' | 'DEVELOPER' | null>(null)

  // Loading states for operations with Basarnas animation
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null)
  const [printLoading, setPrintLoading] = useState<string | null>(null)

  // Print loading dialog state
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [printDialogFileId, setPrintDialogFileId] = useState<string | null>(null)
  const [printDialogFileName, setPrintDialogFileName] = useState('')
  const [printDialogFileType, setPrintDialogFileType] = useState('')

  // User edit dialog
  const [showEditUserDialog, setShowEditUserDialog] = useState(false)
  const [editUserData, setEditUserData] = useState<User & { lastLoginAt?: string; _count?: { logs: number } } | null>(null)
  const [editUserForm, setEditUserForm] = useState({ name: '', email: '', role: 'STAF' })

  // User activity history dialog
  const [showUserActivityDialog, setShowUserActivityDialog] = useState(false)
  const [userActivityLogs, setUserActivityLogs] = useState<LogEntry[]>([])
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<User | null>(null)

  // Password change dialog
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false)
  const [passwordChangeForm, setPasswordChangeForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)

  // Password visibility in users table (for DEVELOPER)
  const [usersIncludePassword, setUsersIncludePassword] = useState(false)

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
    r2: 'synced' | 'pending' | 'error',
    googleDrive: 'synced' | 'pending' | 'error',
    timestamp?: Date
  } | undefined>(undefined)

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

  // Restore Desktop Edit Session from localStorage on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('desktopEditSessionToken')
      const savedHash = localStorage.getItem('desktopEditOriginalHash')
      const savedData = localStorage.getItem('excelEditData')

      if (savedToken) setDesktopEditSessionToken(savedToken)
      if (savedHash) setDesktopEditOriginalHash(savedHash)
      if (savedData) {
        setExcelEditData(JSON.parse(savedData))
      }
    } catch (e) {
      console.warn('Failed to restore desktop edit session from localStorage', e)
    }
  }, [])

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

  // Run System Diagnostic
  const handleRunDiagnostic = useCallback(async () => {
    setShowDiagnosticDialog(true)
    setDiagnosticLoading(true)
    setDiagnosticResult(null)

    try {
      const res = await fetch('/api/system-diagnostic')
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
    // Prevent concurrent fetches
    if (isPaginationLoadingRef.current) return
    isPaginationLoadingRef.current = true

    setKatalogLoading(true)
    try {
      const page = resetPage ? 1 : sopPagination.page
      const params = new URLSearchParams()
      // Use searchInput for search - this is the live search value that's always in sync
      if (searchInput) params.append('search', searchInput)
      if (sopFilters.kategori && sopFilters.kategori !== 'SEMUA') params.append('kategori', sopFilters.kategori)
      if (sopFilters.jenis && sopFilters.jenis !== 'SEMUA') params.append('jenis', sopFilters.jenis)
      if (sopFilters.lingkup && sopFilters.lingkup !== 'SEMUA') params.append('lingkup', sopFilters.lingkup)
      if (sopFilters.status && sopFilters.status !== 'SEMUA') params.append('status', sopFilters.status)
      if (sopFilters.tahun) params.append('tahun', sopFilters.tahun)
      params.append('page', page.toString())
      params.append('limit', sopPagination.limit.toString())
      params.append('sortBy', sortBy)

      const res = await fetch(`/api/sop?${params}`)

      // Check for HTTP errors
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setSopFiles(data.data)
      setSopPagination(p => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages, page }))
    } catch (error) {
      console.error('Fetch SOP error:', error)
      // Show error toast for user feedback
      toast({
        title: 'Error',
        description: 'Gagal memuat data. Silakan coba lagi.',
        variant: 'destructive'
      })
    } finally {
      setKatalogLoading(false)
      // Reset loading flag after a short delay to prevent rapid re-fetching
      setTimeout(() => {
        isPaginationLoadingRef.current = false
      }, 100)
    }
  }, [searchInput, sopFilters.kategori, sopFilters.jenis, sopFilters.lingkup, sopFilters.status, sopFilters.tahun, sopPagination.page, sopPagination.limit, sortBy, toast])

  const fetchVerificationList = useCallback(async (filter = 'SEMUA', lingkupFilter = 'SEMUA', search = '', sortByParam = 'uploadedAt-desc', pageInput?: number) => {
    setVerifikasiLoading(true)
    try {
      const page = pageInput || verificationPagination.page
      const params = new URLSearchParams()
      params.append('publicOnly', 'true')
      if (filter !== 'SEMUA') {
        params.append('verificationStatus', filter)
      }
      if (lingkupFilter !== 'SEMUA') {
        params.append('lingkup', lingkupFilter)
      }
      if (search) {
        params.append('search', search)
      }
      params.append('sortBy', sortByParam)
      params.append('page', page.toString())
      params.append('limit', verificationPagination.limit.toString())

      const res = await fetch(`/api/sop?${params}`)
      const data = await res.json()
      if (!data.error) {
        setVerificationList(data.data)
        setVerificationPagination(p => ({
          ...p,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
          page: page
        }))
      }
    } catch (error) {
      console.error('Fetch verification error:', error)
    } finally {
      setVerifikasiLoading(false)
    }
  }, [verificationPagination.page, verificationPagination.limit])

  const fetchArsipList = useCallback(async (lingkupFilter = 'SEMUA', search = '', sortByParam = 'uploadedAt-desc', pageInput?: number) => {
    setArsipLoading(true)
    try {
      const page = pageInput || arsipPagination.page
      const params = new URLSearchParams()
      params.append('publicOnly', 'true')
      params.append('verificationStatus', 'DITOLAK')
      if (lingkupFilter !== 'SEMUA') {
        params.append('lingkup', lingkupFilter)
      }
      if (search) {
        params.append('search', search)
      }
      params.append('sortBy', sortByParam)
      params.append('page', page.toString())
      params.append('limit', arsipPagination.limit.toString())

      const res = await fetch(`/api/sop?${params}`)
      const data = await res.json()
      if (!data.error) {
        setArsipList(data.data)
        setArsipPagination(p => ({
          ...p,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
          page: page
        }))
      }
    } catch (error) {
      console.error('Fetch arsip error:', error)
    } finally {
      setArsipLoading(false)
    }
  }, [arsipPagination.page, arsipPagination.limit])

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
      console.log('🔄 Fetching users...')
      const res = await fetch('/api/users')
      const data = await res.json()
      console.log('📋 Users response:', data)
      if (data.error) {
        console.error('Fetch users API error:', data.error)
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive'
        })
      } else {
        console.log('✅ Users loaded:', data.data?.length || 0, 'users')
        setUsers(data.data || [])
        setUsersIncludePassword(data.includePassword || false)
      }
    } catch (error) {
      console.error('Fetch users error:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat data user',
        variant: 'destructive'
      })
    }
  }, [toast])

  // Check auth on mount
  useEffect(() => {
    checkAuth()
    initSystem()
    // Fetch R2 status on mount for public page display
    fetchR2Status()
  }, [checkAuth, initSystem, fetchR2Status])

  // Load user-specific arsipSeenCount when user logs in
  useEffect(() => {
    if (user?.id) {
      const userArsipKey = `arsipSeenCount_${user.id}`
      const savedArsipSeenCount = localStorage.getItem(userArsipKey)
      if (savedArsipSeenCount) {
        setArsipSeenCount(parseInt(savedArsipSeenCount, 10) || 0)
      } else {
        // First time login for this user - initialize to 0
        // User will see notification if there are rejected files
        setArsipSeenCount(0)
        localStorage.setItem(userArsipKey, '0')
      }
    }
  }, [user?.id])

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchStats()
      fetchDriveStatus()
      fetchR2Status()
      fetchSyncStatus()

      if (currentPage === 'logs') fetchLogs()

      // Debug logging for users page
      console.log('🔍 Checking users page condition:', {
        currentPage,
        userRole: user?.role,
        isAdmin: user?.role === 'ADMIN'
      })

      if (currentPage === 'users' && (user?.role === 'DEVELOPER' || user?.role === 'ADMIN')) {
        console.log('✅ Calling fetchUsers...')
        fetchUsers()
      }
    }
  }, [isAuthenticated, user, currentPage, logsPagination.page, fetchStats, fetchDriveStatus, fetchR2Status, fetchSyncStatus, fetchLogs, fetchUsers])

  // Single useEffect for katalog - handles all fetching including pagination
  useEffect(() => {
    if (!isAuthenticated || currentPage !== 'katalog') return

    // Debounce timer for live search - only apply debounce when user is typing
    // No debounce for initial load or filter changes
    const debounceTimer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const params = new URLSearchParams()
        if (searchInput) params.append('search', searchInput)
        if (sopFilters.kategori && sopFilters.kategori !== 'SEMUA') params.append('kategori', sopFilters.kategori)
        if (sopFilters.jenis && sopFilters.jenis !== 'SEMUA') params.append('jenis', sopFilters.jenis)
        if (sopFilters.lingkup && sopFilters.lingkup !== 'SEMUA') params.append('lingkup', sopFilters.lingkup)
        if (sopFilters.status && sopFilters.status !== 'SEMUA') params.append('status', sopFilters.status)
        if (sopFilters.tahun) params.append('tahun', sopFilters.tahun)
        params.append('sortBy', sortBy)
        params.append('page', sopPagination.page.toString())
        params.append('limit', sopPagination.limit.toString())

        const res = await fetch(`/api/sop?${params}`)
        const data = await res.json()
        if (!data.error) {
          setSopFiles(data.data)
          setSopPagination(p => ({
            ...p,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages,
            page: sopPagination.page
          }))
        }
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setIsSearching(false)
        setKatalogLoading(false) // Clear loading state after fetch
      }
    }, searchInput ? 300 : 0) // No debounce for initial load

    return () => clearTimeout(debounceTimer)
  }, [isAuthenticated, currentPage, searchInput, sopFilters.kategori, sopFilters.jenis, sopFilters.lingkup, sopFilters.status, sopFilters.tahun, sortBy, sopPagination.page, sopPagination.limit])

  // Separate useEffect for fetching users - ensures it's called when navigating to users page
  useEffect(() => {
    // Log all values to debug
    console.log('🔍 Users useEffect triggered:', {
      isAuthenticated,
      userRole: user?.role,
      currentPage,
      shouldFetch: isAuthenticated && (user?.role === 'DEVELOPER' || user?.role === 'ADMIN') && currentPage === 'users'
    })

    if (isAuthenticated && (user?.role === 'DEVELOPER' || user?.role === 'ADMIN') && currentPage === 'users') {
      console.log('✅ Calling fetchUsers...')
      fetchUsers()
    }
  }, [isAuthenticated, user?.role, currentPage]) // Removed fetchUsers from deps to prevent infinite loops

  // Reset page when search or filters change (not when page changes)
  useEffect(() => {
    if (isAuthenticated && currentPage === 'katalog') {
      setSopPagination(p => ({ ...p, page: 1 }))
    }
  }, [searchInput, sopFilters.kategori, sopFilters.jenis, sopFilters.lingkup, sopFilters.status, sopFilters.tahun, sortBy, isAuthenticated, currentPage])

  // Live search for verification page with debounce
  useEffect(() => {
    if (!isAuthenticated || currentPage !== 'verifikasi') return

    // Immediate fetch on page load or filter change (no debounce for initial load)
    // Only debounce when user is typing in search
    const debounceTimer = setTimeout(() => {
      fetchVerificationList(verificationFilter, verificationLingkupFilter, verificationSearch, verificationSortBy, verificationPagination.page)
    }, verificationSearch ? 300 : 0) // No debounce for initial load or filter changes

    return () => clearTimeout(debounceTimer)
  }, [verificationSearch, verificationFilter, verificationLingkupFilter, verificationSortBy, verificationPagination.page, isAuthenticated, currentPage, fetchVerificationList])

  // Live search for arsip page with debounce
  useEffect(() => {
    if (!isAuthenticated || currentPage !== 'arsip') return

    // Immediate fetch on page load (no debounce for initial load)
    // Only debounce when user is typing in search
    const debounceTimer = setTimeout(() => {
      fetchArsipList(arsipLingkupFilter, arsipSearch, arsipSortBy, arsipPagination.page)
    }, arsipSearch ? 300 : 0) // No debounce for initial load

    return () => clearTimeout(debounceTimer)
  }, [arsipSearch, arsipLingkupFilter, arsipSortBy, arsipPagination.page, isAuthenticated, currentPage, fetchArsipList])

  // Reset page for verifikasi
  useEffect(() => {
    if (isAuthenticated && currentPage === 'verifikasi') {
      setVerificationPagination(p => ({ ...p, page: 1 }))
    }
  }, [verificationSearch, verificationFilter, verificationLingkupFilter, verificationSortBy, isAuthenticated, currentPage])

  // Reset page for arsip
  useEffect(() => {
    if (isAuthenticated && currentPage === 'arsip') {
      setArsipPagination(p => ({ ...p, page: 1 }))
    }
  }, [arsipSearch, arsipLingkupFilter, arsipSortBy, isAuthenticated, currentPage])

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

        // Show beautiful login success animation
        setLoginSuccessName(data.user?.name || 'User')
        setLoginSuccessRole(data.user?.role || null)
        setShowLoginSuccess(true)

        // Hide animation after 3 seconds
        setTimeout(() => {
          setShowLoginSuccess(false)
        }, 3000)

        // Run auto-rename in background (check and rename files that don't match titles)
        if (data.user?.role === 'ADMIN' || data.user?.role === 'DEVELOPER') {
          fetch('/api/auto-rename', { method: 'POST' })
            .then(res => res.json())
            .then(renameData => {
              if (renameData.success && renameData.renamed > 0) {
                console.log(`✅ [Auto-Rename] ${renameData.renamed} files renamed`)
              }
            })
            .catch(err => console.warn('[Auto-Rename] Error:', err))
        }

        // Fetch data immediately after login
        fetchStats()
        fetchDriveStatus()
        fetchR2Status()
        fetchSyncStatus()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    // Tampilkan animasi goodbye dahulu
    setShowLogoutAnimation(true)
    // Proses logout di background
    try {
      await fetch('/api/auth', { method: 'DELETE' })
    } catch (_) { /* ignore */ }
    // Tunggu animasi selesai (3 detik), lalu reset state
    setTimeout(() => {
      setShowLogoutAnimation(false)
      setUser(null)
      setIsAuthenticated(false)
      setCurrentPage('dashboard')
    }, 3200)
  }

  const handleUpload = async (e: React.FormEvent, isPublic = false) => {
    e.preventDefault()
    const form = isPublic ? publicForm : uploadForm
    if (!form.file) {
      toast({ title: 'Error', description: 'File diperlukan', variant: 'destructive' })
      return
    }

    setLoading(true)

    const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024
    const VERCEL_MAX_LIMIT = 50 * 1024 * 1024
    const isLargeFile = form.file.size > LARGE_FILE_THRESHOLD

    try {
      if (form.file.size > VERCEL_MAX_LIMIT) {
        toast({
          title: '⚠️ File Terlalu Besar',
          description: `File (${(form.file.size / 1024 / 1024).toFixed(2)} MB) melebihi batas upload (50 MB). Silakan upload file ke Google Drive secara manual, lalu hubungi admin untuk menambahkan file ke katalog.`,
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
      description: 'Mengupload ke Cloudflare R2 (Primary Storage)',
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
    formData.append('lingkup', form.lingkup || 'BCC')
    formData.append('tahun', form.tahun.toString())
    // For public submissions, use default 'AKTIF' status since publicForm doesn't have status field
    formData.append('status', isPublic ? 'AKTIF' : (form as typeof uploadForm).status)
    formData.append('file', form.file!)

    if (isPublic) {
      formData.append('isPublicSubmission', 'true')
      formData.append('submitterName', publicForm.nama)
      formData.append('submitterEmail', publicForm.email)
      formData.append('keterangan', publicForm.keterangan || '')
    }

    setSyncStatus(prev => ({
      ...prev,
      progress: 50,
      currentStep: 'Memproses...'
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
      const driveStatus = syncResult?.googleDrive === 'synced' ? '✅ Google Drive' : '⏳ Google Drive (backup)'

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
      currentStep: 'Mempersiapkan upload ke R2...',
      direction: 'r2-to-drive'
    }))

    toast({ title: '📤 Step 1/4', description: `Mempersiapkan upload file (${(file.size / 1024 / 1024).toFixed(2)} MB)...`, duration: 5000 })

    // Step 1: Get presigned upload URL from R2
    const urlRes = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        jenis: form.jenis,
        isPublicSubmission: isPublic
      })
    })

    const urlData = await urlRes.json()

    if (!urlData.success) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        progress: 0,
        currentStep: ''
      }))
      throw new Error(urlData.error || 'Failed to get upload URL')
    }

    const { uploadUrl, uploadKey } = urlData

    setSyncStatus(prev => ({
      ...prev,
      progress: 20,
      currentStep: 'Mengupload ke R2...'
    }))

    toast({ title: '📤 Step 2/4', description: 'Mengupload langsung ke Cloudflare R2...', duration: 5000 })

    // Step 2: Upload directly to R2 using presigned URL
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: file
    })

    if (!uploadRes.ok) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        progress: 0,
        currentStep: ''
      }))
      throw new Error('Failed to upload file to R2')
    }

    setSyncStatus(prev => ({
      ...prev,
      progress: 60,
      currentStep: 'Menyimpan data...'
    }))

    toast({ title: '📝 Step 3/4', description: 'Menyimpan data ke database...', duration: 3000 })

    // Step 3: Confirm upload and create SOP record
    const sopRes = await fetch('/api/upload-url', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadKey,
        fileName: file.name,
        judul: form.judul,
        kategori: form.kategori,
        jenis: form.jenis,
        tahun: form.tahun,
        lingkup: form.lingkup,
        status: isPublic ? 'AKTIF' : (form as any).status,
        isPublicSubmission: isPublic,
        submitterName: isPublic ? publicForm.nama : null,
        submitterEmail: isPublic ? publicForm.email : null,
        keterangan: isPublic ? publicForm.keterangan : null
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

    setSyncStatus(prev => ({
      ...prev,
      progress: 80,
      currentStep: 'Membackup ke Google Drive...'
    }))

    toast({ title: '☁️ Step 4/4', description: 'Membackup ke Google Drive (background)...', duration: 3000 })

    const syncResult = sopData.syncStatus
    const r2StatusText = syncResult?.r2 === 'synced' ? '✅ R2' : '⏳ R2'
    const driveStatusText = syncResult?.googleDrive === 'synced' ? '✅ Google Drive' : '⏳ Google Drive (background)'

    setLastSyncResult({
      r2: syncResult?.r2 || 'synced',
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
        nama: '', email: '', judul: '', kategori: 'SIAGA', jenis: 'SOP', lingkup: 'BCC',
        tahun: new Date().getFullYear(), keterangan: '', file: null
      })
    } else {
      setUploadForm({
        judul: '', kategori: 'SIAGA', jenis: 'SOP', lingkup: 'BCC',
        tahun: new Date().getFullYear(), status: 'AKTIF', file: null
      })
    }
  }

  // Download file dari Cloudflare R2
  const handleDownload = async (id: string) => {
    // Find file from all available lists
    const sop = sopFiles.find(s => s.id === id) || verificationList.find(s => s.id === id) || arsipList.find(s => s.id === id)

    if (!sop?.filePath && !sop?.driveFileId) {
      toast({
        title: '⚠️ File Tidak Tersedia',
        description: 'File tidak ditemukan di storage.',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    setDownloadLoading(id) // Start loading animation

    try {
      // Generate custom filename for display
      const fileExt = sop.fileName.split('.').pop()?.toLowerCase() || 'pdf'
      const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
      const customFileName = `${sanitizeFileName(sop.judul)}.${fileExt}`

      // Fetch file from our download API (avoids CORS issues)
      const res = await fetch(`/api/download?id=${id}`)

      if (!res.ok) {
        const errorText = await res.text()
        let errorData = { error: 'Unknown Error' };
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error('[Download API] Error was not JSON:', errorText)
        }
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

      setDownloadLoading(null)
      toast({ title: '✅ Download Selesai', description: `File: ${customFileName}` })
      fetchStats()
    } catch (error) {
      console.error('Download error:', error)
      setDownloadLoading(null)
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'Gagal mengunduh file', variant: 'destructive' })
    }
  }

  // Preview file dari Cloudflare R2 - Upload ke OneDrive untuk Office Online
  const handlePreview = async (id: string) => {
    // Find file from all available lists
    const sop = sopFiles.find(s => s.id === id) || verificationList.find(s => s.id === id) || arsipList.find(s => s.id === id)
    if (!sop) return

    if (!sop.filePath && !sop.driveFileId) {
      toast({
        title: '⚠️ File Tidak Tersedia',
        description: 'File tidak ditemukan di storage.',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    const fileExtension = sop.fileName.toLowerCase().split('.').pop()
    setPreviewLoading(id) // Start loading animation

    try {
      // For PDF files - download directly from R2 and open
      if (fileExtension === 'pdf') {
        const res = await fetch(`/api/file?action=preview&id=${id}`)
        const contentType = res.headers.get('content-type') || ''

        if (res.ok && (contentType.includes('application/pdf') || contentType === '')) {
          const blob = await res.blob()
          if (blob.size === 0) {
            toast({ title: '⚠️ File Kosong', description: 'File ini tidak memiliki isi (0 bytes).', variant: 'destructive' })
            setPreviewLoading(null)
            return
          }
          const url = window.URL.createObjectURL(blob)
          window.open(url, '_blank')
          setPreviewLoading(null)
          fetchStats()
          return
        }

        const text = await res.text()

        if (!res.ok) {
          console.error(`[Preview PDF] API Error ${res.status}:`, text)
          toast({ title: `Error ${res.status}`, description: 'Gagal memuat preview dari server.', variant: 'destructive' })
          setPreviewLoading(null)
          return
        }

        try {
          if (!text.trim()) {
            throw new Error('Empty response body')
          }
          const data = JSON.parse(text)
          if (data.downloadUrl) {
            window.open(data.downloadUrl, '_blank')
          }
        } catch (e) {
          console.error('[Preview PDF] Failed to parse JSON. Status:', res.status, 'Raw text:', text)
          toast({ title: 'Error API', description: 'Gagal membaca response server (PDF).', variant: 'destructive' })
        }
        setPreviewLoading(null)
        fetchStats()
        return
      }

      // For Excel/Word files - upload to OneDrive temp and open in Office Online
      if (['xlsx', 'xls', 'xlsm', 'docx', 'doc'].includes(fileExtension || '')) {
        toast({
          title: '📤 Mempersiapkan Preview...',
          description: 'Mengupload file ke OneDrive untuk preview di Office Online',
          duration: 10000
        })

        const res = await fetch('/api/preview-office', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: id })
        })

        const text = await res.text()
        let data;
        try {
          data = JSON.parse(text)
        } catch (e) {
          console.error('[Preview Office] Failed to parse JSON. Status:', res.status, 'Raw text:', text)
          throw new Error('Gagal membaca response dari server (Office Preview).')
        }

        console.log('📋 [Preview] Response:', { success: data.success, viewerUrl: data.viewerUrl?.substring(0, 100) })

        if (!data.success) {
          throw new Error(data.error || 'Gagal mempersiapkan preview')
        }

        // Open in Office Online viewer
        if (data.viewerUrl) {
          console.log('🔗 [Preview] Opening URL:', data.viewerUrl.substring(0, 150))

          const previewWindow = window.open(data.viewerUrl, '_blank')

          // Handle popup blocker
          if (!previewWindow || previewWindow.closed) {
            toast({
              title: '⚠️ Popup Diblokir',
              description: `Klik link ini untuk membuka: ${data.viewerUrl}`,
              duration: 30000
            })
          } else {
            toast({
              title: '📊 Preview Dibuka',
              description: 'File dibuka di Microsoft Office Online. File temp akan dihapus setelah ditutup.',
              duration: 5000
            })

            // Track the window and clean up when closed
            if (data.driveItemId) {
              const checkClosed = setInterval(() => {
                if (previewWindow.closed) {
                  clearInterval(checkClosed)
                  // Delete temp file from OneDrive
                  fetch('/api/preview-office', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ driveItemId: data.driveItemId })
                  }).catch(err => console.warn('Failed to cleanup temp file:', err))
                }
              }, 2000) // Check every 2 seconds
            }
          }
        }

        setPreviewLoading(null)
        fetchStats()
        return
      }

      // For other file types - fallback to download
      toast({
        title: '⚠️ Preview Tidak Tersedia',
        description: 'Tipe file ini tidak mendukung preview. Gunakan tombol download.',
        variant: 'destructive',
        duration: 5000
      })
      setPreviewLoading(null)

    } catch (error) {
      console.error('Preview error:', error)
      setPreviewLoading(null)
      toast({
        title: '❌ Error',
        description: error instanceof Error ? error.message : 'Gagal membuka preview file',
        variant: 'destructive',
        duration: 5000
      })
    }
  }

  // ==========================================
  // PUBLIC FILE HANDLERS (VERIFIKASI & ARSIP)
  // ==========================================

  // Download Khusus File Publik
  const handleVerifikasiDownload = async (id: string) => {
    // Cari spesifik di list verifikasi dan arsip (dibedakan lokasi arraynya)
    const sop = verificationList.find(s => s.id === id) || arsipList.find(s => s.id === id)

    if (!sop?.filePath && !sop?.driveFileId) {
      toast({
        title: '⚠️ File Tidak Tersedia',
        description: 'File publik tidak ditemukan di storage.',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    setDownloadLoading(id) // Start loading animation

    try {
      const fileExt = sop.fileName.split('.').pop()?.toLowerCase() || 'pdf'
      const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
      const customFileName = `${sanitizeFileName(sop.judul)}.${fileExt}`

      // Fetch file from our download API (avoids CORS issues)
      const res = await fetch(`/api/download?id=${id}`)

      if (!res.ok) {
        const errorText = await res.text()
        let errorData = { error: 'Unknown Error' };
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error('[Download API] Error was not JSON:', errorText)
        }
        throw new Error(errorData.error || 'Gagal mengunduh file publik')
      }

      // Increment download counter
      await fetch('/api/sop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, incrementDownload: true })
      })

      // Get file blob
      const blob = await res.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = customFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setDownloadLoading(null)
      toast({ title: '✅ Download Selesai', description: `File Publik: ${customFileName}` })
      fetchStats()
    } catch (error) {
      console.error('Download error:', error)
      setDownloadLoading(null)
      toast({ title: '❌ Error', description: error instanceof Error ? error.message : 'Gagal mengunduh file publik', variant: 'destructive' })
    }
  }

  // Preview Khusus File Publik
  const handleVerifikasiPreview = async (id: string) => {
    // Cari spesifik di list verifikasi dan arsip (dibedakan lokasi arraynya)
    const sop = verificationList.find(s => s.id === id) || arsipList.find(s => s.id === id)
    if (!sop) return

    if (!sop.filePath && !sop.driveFileId) {
      toast({
        title: '⚠️ File Tidak Tersedia',
        description: 'File publik tidak ditemukan di storage.',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    const fileExtension = sop.fileName.toLowerCase().split('.').pop()
    setPreviewLoading(id) // Start loading animation

    try {
      if (fileExtension === 'pdf') {
        const res = await fetch(`/api/file?action=preview&id=${id}`)
        const contentType = res.headers.get('content-type') || ''

        // Fallback or explicit check for PDF. Notice we also check if res.ok is successful
        if (res.ok && (contentType.includes('application/pdf') || contentType === '')) {
          const blob = await res.blob()
          if (blob.size === 0) {
            toast({ title: '⚠️ File Kosong', description: 'File ini tidak memiliki isi (0 bytes).', variant: 'destructive' })
            setPreviewLoading(null)
            return
          }
          const url = window.URL.createObjectURL(blob)
          window.open(url, '_blank')
          setPreviewLoading(null)
          fetchStats()
          return
        }

        const text = await res.text()

        if (!res.ok) {
          console.error(`[Preview PDF] API Error ${res.status}:`, text)
          toast({ title: `Error ${res.status}`, description: 'Gagal memuat preview tiket publik dari server.', variant: 'destructive' })
          setPreviewLoading(null)
          return
        }

        try {
          if (!text.trim()) {
            throw new Error('Empty response body')
          }
          const data = JSON.parse(text)
          if (data.downloadUrl) {
            window.open(data.downloadUrl, '_blank')
          }
        } catch (e) {
          console.error('[Preview PDF] Failed to parse JSON. Status:', res.status, 'Raw text:', text)
          toast({ title: 'Error API', description: 'Gagal membaca response server (PDF Publik).', variant: 'destructive' })
        }
        setPreviewLoading(null)
        fetchStats()
        return
      }

      if (['xlsx', 'xls', 'xlsm', 'docx', 'doc'].includes(fileExtension || '')) {
        toast({
          title: '📤 Mempersiapkan Preview Publik...',
          description: 'Mengupload file publik ke OneDrive untuk preview di Office Online',
          duration: 10000
        })

        const res = await fetch('/api/preview-office', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: id })
        })

        const text = await res.text()
        let data;
        try {
          data = JSON.parse(text)
        } catch (e) {
          console.error('[Preview Office] Failed to parse JSON. Status:', res.status, 'Raw text:', text)
          throw new Error('Gagal membaca response dari server (Office Preview Publik).')
        }

        console.log('📋 [Preview Publik] Response:', { success: data.success, viewerUrl: data.viewerUrl?.substring(0, 100) })

        if (!data.success) {
          throw new Error(data.error || 'Gagal mempersiapkan preview publik')
        }

        if (data.viewerUrl) {
          console.log('🔗 [Preview Publik] Opening URL:', data.viewerUrl.substring(0, 150))
          const previewWindow = window.open(data.viewerUrl, '_blank')

          if (!previewWindow || previewWindow.closed) {
            toast({
              title: '⚠️ Popup Diblokir',
              description: `Klik link ini untuk membuka preview publik: ${data.viewerUrl}`,
              duration: 30000
            })
          } else {
            toast({
              title: '📊 Preview Publik Dibuka',
              description: 'File dibuka di Microsoft Office Online. File temp akan dihapus setelah ditutup.',
              duration: 5000
            })

            if (data.driveItemId) {
              const checkClosed = setInterval(() => {
                if (previewWindow.closed) {
                  clearInterval(checkClosed)
                  fetch('/api/preview-office', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ driveItemId: data.driveItemId })
                  }).catch(err => console.warn('Failed to cleanup temp file:', err))
                }
              }, 2000)
            }
          }
        }

        setPreviewLoading(null)
        fetchStats()
        return
      }

      toast({
        title: '⚠️ Preview Tidak Tersedia',
        description: 'Tipe file publik ini tidak mendukung preview. Gunakan tombol download.',
        variant: 'destructive',
        duration: 5000
      })
      setPreviewLoading(null)

    } catch (error) {
      console.error('Preview error:', error)
      setPreviewLoading(null)
      toast({
        title: '❌ Error',
        description: error instanceof Error ? error.message : 'Gagal membuka preview file publik',
        variant: 'destructive',
        duration: 5000
      })
    }
  }


  // Print file - Open loading dialog with progress
  const handlePrint = useCallback(async (id: string) => {
    // Find file from all available lists
    const sop = sopFiles.find(s => s.id === id) || verificationList.find(s => s.id === id) || arsipList.find(s => s.id === id)
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
    if (!['pdf', 'xlsx', 'xls', 'xlsm', 'docx', 'doc'].includes(fileExtension || '')) {
      toast({
        title: '⚠️ Tidak Didukung',
        description: 'Hanya file PDF, Excel (.xlsx, .xls), dan Word (.docx, .doc) yang bisa di-print',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    // Open print loading dialog
    setPrintDialogFileId(id)
    setPrintDialogFileName(sop.fileName)
    setPrintDialogFileType(fileExtension || 'pdf')
    setShowPrintDialog(true)
    setPrintLoading(id)
  }, [sopFiles, verificationList, arsipList, toast])

  // Handle print dialog close
  const handlePrintDialogClose = useCallback(() => {
    setShowPrintDialog(false)
    setPrintDialogFileId(null)
    setPrintLoading(null)
  }, [])

  // Handle print complete
  const handlePrintComplete = useCallback(() => {
    fetchStats()
  }, [fetchStats])

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

  // Handle Desktop Excel/Word Edit - Download file for local editing
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

    // Check if file is PDF - PDF cannot be edited, show warning dialog
    const fileExtension = sop.fileName.toLowerCase().split('.').pop()
    if (fileExtension === 'pdf') {
      setShowPdfWarningDialog(true)
      return
    }

    try {
      toast({
        title: '📥 Mengunduh File...',
        description: 'Mempersiapkan file untuk diedit di Desktop',
        duration: 30000
      })

      // Generate custom filename from title
      const fileExt = sop.fileName.split('.').pop()?.toLowerCase() || 'xlsx'
      const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
      const customFileName = `${sanitizeFileName(sop.judul)}.${fileExt}`

      console.log('🔍 [Desktop Edit] SOP Data:', {
        id: sop.id,
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

      // Persist to localStorage to survive page reloads
      localStorage.setItem('desktopEditSessionToken', sessionId)
      localStorage.setItem('desktopEditOriginalHash', originalHash)
      localStorage.setItem('excelEditData', JSON.stringify(sop))

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
      const fileTypeLabel = sop.fileType === 'docx' || sop.fileType === 'doc' ? 'Word' : 'Excel'
      let description = `Edit file di ${fileTypeLabel} Desktop, lalu klik "Selesai Edit & Sync" untuk upload. Sesi tidak ada batas waktu.`
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

        // Clear persistence
        localStorage.removeItem('desktopEditSessionToken')
        localStorage.removeItem('desktopEditOriginalHash')
        localStorage.removeItem('excelEditData')
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

        // Clear persistence
        localStorage.removeItem('desktopEditSessionToken')
        localStorage.removeItem('desktopEditOriginalHash')
        localStorage.removeItem('excelEditData')
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

    // Clear persistence
    localStorage.removeItem('desktopEditSessionToken')
    localStorage.removeItem('desktopEditOriginalHash')
    localStorage.removeItem('excelEditData')

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

      // Check content-type before parsing
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        // Not JSON - likely an error page
        const textResponse = await res.text()
        console.error('Non-JSON response:', textResponse.slice(0, 500))
        throw new Error(`Server error (${res.status}): Response is not valid JSON`)
      }

      const data = await res.json()

      if (res.ok && data.success) {
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
          description: data.error || data.details || 'Terjadi kesalahan saat sync',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        title: '❌ Error',
        description: error instanceof Error ? error.message : 'Gagal menghubungi server',
        variant: 'destructive'
      })
    }
    setExcelEditSyncing(false)
  }

  // Cancel edit and delete file from OneDrive
  const handleCancelEdit = async () => {
    if (!excelEditDriveItemId) {
      // Just close the dialog if no file was uploaded
      setShowExcelEditDialog(false)
      resetExcelEditState()
      return
    }

    const confirmCancel = confirm('Yakin ingin membatalkan edit? File di OneDrive akan dihapus dan perubahan tidak akan disimpan.')
    if (!confirmCancel) return

    try {
      const res = await fetch('/api/excel-edit/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveItemId: excelEditDriveItemId
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: '✅ Edit Dibatalkan',
          description: 'File telah dihapus dari OneDrive. Tidak ada perubahan yang disimpan.',
          duration: 4000
        })
      } else {
        toast({
          title: 'Edit Dibatalkan',
          description: 'Dialog ditutup. File mungkin masih ada di OneDrive.',
          duration: 4000
        })
      }
    } catch (error) {
      toast({
        title: 'Edit Dibatalkan',
        description: 'Dialog ditutup.',
        duration: 3000
      })
    }

    setShowExcelEditDialog(false)
    resetExcelEditState()
  }

  // Reset edit state
  const resetExcelEditState = () => {
    setExcelEditData(null)
    setExcelEditUrl(null)
    setExcelEditDriveItemId(null)
    setExcelEditSessionId(null)
    setExcelEditLoading(false)
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

  const handleVerification = async (id: string, status: string, reason?: string) => {
    try {
      const res = await fetch('/api/sop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          verificationStatus: status,
          rejectionReason: status === 'DITOLAK' ? reason : undefined
        })
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Berhasil', description: `SOP berhasil ${status === 'DISETUJUI' ? 'disetujui' : 'ditolak'}!` })
        fetchVerificationList(verificationFilter, verificationLingkupFilter, verificationSearch, verificationSortBy)
        fetchArsipList(arsipLingkupFilter, arsipSearch, arsipSortBy)
        fetchStats()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  // Open rejection dialog
  const handleOpenRejectDialog = (id: string) => {
    setRejectTargetId(id)
    setRejectReason('')
    setShowRejectDialog(true)
  }

  // Confirm rejection
  const handleConfirmReject = async () => {
    if (!rejectTargetId) return
    if (!rejectReason.trim()) {
      toast({ title: 'Error', description: 'Alasan penolakan harus diisi', variant: 'destructive' })
      return
    }
    await handleVerification(rejectTargetId, 'DITOLAK', rejectReason)
    setShowRejectDialog(false)
    setRejectTargetId(null)
    setRejectReason('')
  }

  // Buka dialog edit
  const handleOpenEdit = (id: string) => {
    const sop = sopFiles.find(s => s.id === id)
    if (!sop) return

    setEditData(sop)
    setEditForm({
      nomorSop: sop.nomorSop || '',
      judul: sop.judul,
      kategori: sop.kategori,
      jenis: sop.jenis,
      lingkup: sop.lingkup || 'BCC',
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
          nomorSop: editForm.nomorSop,
          judul: editForm.judul,
          kategori: editForm.kategori,
          jenis: editForm.jenis,
          lingkup: editForm.lingkup,
          tahun: editForm.tahun,
          status: editForm.status
        })
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        // Show toast with rename info if file was renamed
        if (data.renamed) {
          toast({
            title: '✅ Berhasil Diperbarui',
            description: `Data SOP diperbarui. File di-rename: "${data.renamed.oldName}" → "${data.renamed.newName}"`,
            duration: 5000
          })
        } else {
          toast({ title: '✅ Berhasil', description: 'Data SOP berhasil diperbarui!' })
        }
        setShowEditDialog(false)

        // Update local state immediately for instant UI update
        setSopFiles(prev => prev.map(file => {
          if (file.id === editData.id) {
            return {
              ...file,
              nomorSop: editForm.nomorSop,
              judul: editForm.judul,
              kategori: editForm.kategori,
              jenis: editForm.jenis,
              tahun: editForm.tahun,
              status: editForm.status,
              fileName: data.data?.fileName || file.fileName
            }
          }
          return file
        }))

        setEditData(null)
        fetchSopFiles() // Refresh SOP list to show updated timestamp
        fetchStats() // Refresh stats for filters
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
        fetchVerificationList(verificationFilter, verificationLingkupFilter, verificationSearch, verificationSortBy)
        fetchArsipList(arsipLingkupFilter, arsipSearch, arsipSortBy)
        fetchStats()
      }
    } catch (error) {
      toast({ title: '❌ Error', description: 'Terjadi kesalahan saat menghapus file', variant: 'destructive' })
    }
  }

  // Handle reset stats (bulk delete by status)
  const handleResetStats = async (status: 'MENUNGGU' | 'DITOLAK') => {
    const categoryName = status === 'MENUNGGU' ? 'Verifikasi (Menunggu)' : 'Arsip (Ditolak)'
    if (!confirm(`⚠️ PERINGATAN DEVELOPER ⚠️\n\nAnda yakin ingin MENGHAPUS SEMUA file di kategori ${categoryName}?\n\nTindakan ini akan menghapus data permanen dari database dan storage.`)) return

    try {
      const res = await fetch(`/api/sop?bulkStatus=${status}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.error) {
        toast({ title: '❌ Gagal', description: data.error, variant: 'destructive' })
      } else {
        toast({
          title: '✅ Berhasil',
          description: data.message || 'Counter berhasil di-reset ke 0!',
          duration: 3000
        })
        if (status === 'MENUNGGU') fetchVerificationList(verificationFilter, verificationLingkupFilter, verificationSearch, verificationSortBy)
        else fetchArsipList(arsipLingkupFilter, arsipSearch, arsipSortBy)
        fetchStats()
      }
    } catch (error) {
      toast({ title: '❌ Error', description: 'Terjadi kesalahan saat melakukan reset stats', variant: 'destructive' })
    }
  }

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (format === 'xlsx') setExportingXlsx(true)
    else setExportingPdf(true)

    try {
      if (format === 'xlsx') {
        // Open the export URL directly in a new tab.
        // The API returns Content-Disposition: attachment so the browser will download it natively.
        toast({ title: '📤 Mengunduh Excel...', description: 'File laporan sedang diunduh di tab baru' })
        window.open('/api/export?format=xlsx', '_blank')
        toast({ title: '✅ Export Berhasil', description: 'File Excel sedang diunduh' })
        setExportingXlsx(false)
        return
      }

      // PDF Export — open the dedicated HTML report page in a new tab
      // The /api/report endpoint returns Content-Type: text/html with Content-Disposition: inline
      // so the browser ALWAYS renders it as a page, never downloads it.
      const tab = window.open('/api/report', '_blank')
      if (!tab) {
        toast({ title: 'Error', description: 'Pop-up diblokir browser. Izinkan pop-up untuk situs ini.', variant: 'destructive' })
      } else {
        toast({ title: '📄 Laporan Terbuka', description: 'Laporan analitik dibuka di tab baru. Gunakan Ctrl+P untuk simpan sebagai PDF.' })
      }
      setExportingPdf(false)
    } catch (error) {
      console.error('Export error:', error)
      toast({ title: 'Error', description: 'Gagal membuka laporan', variant: 'destructive' })
    } finally {
      setExportingPdf(false)
    }
  }
  // Handle navigation with notification clearing and loading state
  const handleNavigation = useCallback((page: PageView) => {
    setCurrentPage(page)

    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }

    // Set loading states immediately when navigating to show loading indicator
    if (page === 'verifikasi') {
      setVerifikasiLoading(true)
    }
    if (page === 'arsip') {
      setArsipLoading(true)
    }
    if (page === 'katalog') {
      setKatalogLoading(true)
    }

    // When navigating to arsip page, mark all newly rejected files as seen
    if (page === 'arsip' && stats?.totalPublikDitolakBaru && stats.totalPublikDitolakBaru > 0) {
      // Clear badge immediately for smooth UI
      setStats(prev => prev ? { ...prev, totalPublikDitolakBaru: 0 } : null)

      // Tell server we visited arsip
      fetch('/api/users/visit-arsip', { method: 'POST' })
        .catch(err => console.error('Failed to update arsip visit time:', err))
    }
  }, [stats?.totalPublikDitolakBaru])

  const menuItems = [
    { id: 'dashboard' as PageView, label: 'Laporan Analitik', icon: LayoutDashboard, roles: ['ADMIN', 'STAF', 'DEVELOPER'] },
    { id: 'katalog' as PageView, label: 'Katalog SOP', icon: FileText, roles: ['ADMIN', 'STAF', 'DEVELOPER'] },
    { id: 'verifikasi' as PageView, label: 'Verifikasi SOP', icon: CheckCircle, roles: ['ADMIN', 'DEVELOPER'] },
    { id: 'arsip' as PageView, label: 'Arsip', icon: FolderOpen, roles: ['ADMIN', 'DEVELOPER'] },
    { id: 'logs' as PageView, label: 'Log Aktivitas', icon: History, roles: ['ADMIN', 'DEVELOPER'] },
    { id: 'users' as PageView, label: 'Manajemen User', icon: Users, roles: ['DEVELOPER'] },
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
              {/* Simple Storage Status for Public Page */}
              <div className="flex items-center gap-2">
                <div className={`w - 2 h - 2 rounded - full ${r2Status?.connected ? 'bg-green-500' : 'bg-red-500'} `} />
                <span className={`text - sm font - medium ${r2Status?.connected ? 'text-green-400' : 'text-red-400'} `}>
                  Storage {r2Status?.connected ? 'OK' : 'Tidak Tersedia'}
                </span>
              </div>
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

        {/* Public Content - Optimized Premium Layout (Zero Scrolling) */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-2 sm:p-4 lg:p-6 max-h-screen overflow-hidden">
          {/* Animated Hero Section - Compressed */}
          <motion.div
            className="w-full max-w-4xl mb-4 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="inline-block mb-2"
              animate={{
                scale: [1, 1.03, 1],
                filter: ['drop-shadow(0 0 8px rgba(249, 115, 22, 0.4))', 'drop-shadow(0 0 18px rgba(249, 115, 22, 0.7))', 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.4))']
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <SARLogo size="sm" />
            </motion.div>
            <h1 className="text-2xl font-black tracking-widest text-white drop-shadow-lg mb-1">E-KATALOG BASARNAS</h1>
            <p className="text-orange-400/80 text-[10px] tracking-[0.4em] font-bold uppercase">Direktorat Kesiapsiagaan</p>
          </motion.div>

          {/* Main Form Container - Compressed Gap */}
          <motion.div
            className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            {/* Left Side: Visual/Context - Compressed */}
            <div className="lg:col-span-4 hidden lg:block space-y-4">
              <Card className="bg-black/40 backdrop-blur-md border-orange-500/30 text-white overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none" />
                <CardHeader className="py-3 px-4 relative z-10">
                  <div className="flex items-center gap-2 text-orange-400 mb-1">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span className="text-[9px] font-black tracking-widest uppercase">Status Operasional</span>
                  </div>
                  <CardTitle className="text-lg">Standar Operasional</CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4 relative z-10 space-y-3">
                  <p className="text-xs text-gray-300 leading-snug">
                    Ajukan dokumen SOP/IK Anda secara digital untuk verifikasi real-time melalui platform E-Katalog.
                  </p>
                  <div className="space-y-2 pt-1">
                    {[
                      { icon: CheckCircle, text: "Verifikasi Cloud" },
                      { icon: Globe, text: "Akses Terpusat" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-orange-200/80 font-medium">
                        <item.icon className="w-3.5 h-3.5 text-orange-500" />
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Info - Compact */}
              <div
                className="p-3 rounded-xl bg-orange-500/10 border border-white/5 flex items-center gap-3 backdrop-blur-sm cursor-pointer hover:bg-orange-500/20 hover:border-orange-500/30 transition-all group/help"
                onClick={() => window.open('/panduan', '_blank')}
              >
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center group-hover/help:scale-110 transition-transform">
                  <FileText className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white uppercase tracking-tight group-hover/help:text-orange-400 transition-colors">Butuh Bantuan?</p>
                  <p className="text-[9px] text-gray-500">Klik untuk buka Panduan Sistem</p>
                </div>
              </div>
            </div>

            {/* Right Side: The Form - Compressed Padding/Gaps */}
            <div className="lg:col-span-8 w-full">
              <Card className="bg-white/5 backdrop-blur-2xl shadow-2xl border border-white/10 overflow-hidden rounded-[1.5rem]">
                {/* Header Section - Compact */}
                <div className="relative py-3 px-6 bg-gradient-to-r from-orange-600 to-red-600 text-white flex items-center justify-between">
                  <div className="relative z-10">
                    <h3 className="text-sm font-black tracking-tight uppercase">Form Pengajuan Dokumen</h3>
                    <p className="text-orange-100/70 text-[9px] font-medium tracking-wide">Input data verifikasi sistem</p>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1 bg-white/10 rounded-full border border-white/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[8px] font-bold tracking-widest uppercase">System Online</span>
                  </div>
                </div>

                <CardContent className="p-5 flex flex-col gap-4">
                  <form onSubmit={(e) => handleUpload(e, true)} className="space-y-4">
                    {/* Grid for Inputs - Compressed Gaps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                      {/* Submitter Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                          <Users className="w-3 h-3 text-orange-500" />
                          <h4 className="text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">Identitas</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          <div className="space-y-1">
                            <Label className="text-white/50 text-[9px] font-bold uppercase tracking-widest pl-1">Nama Lengkap</Label>
                            <Input
                              value={publicForm.nama}
                              onChange={(e) => setPublicForm({ ...publicForm, nama: e.target.value })}
                              placeholder="Input nama..."
                              required
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-700 focus:border-orange-500 h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/50 text-[9px] font-bold uppercase tracking-widest pl-1">Email</Label>
                            <Input
                              type="email"
                              value={publicForm.email}
                              onChange={(e) => setPublicForm({ ...publicForm, email: e.target.value })}
                              placeholder="Input email..."
                              required
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-700 focus:border-orange-500 h-9 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Document Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                          <FileText className="w-3 h-3 text-orange-500" />
                          <h4 className="text-[9px] font-black text-white/30 tracking-[0.2em] uppercase">Dokumen</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          <div className="space-y-1">
                            <Label className="text-white/50 text-[9px] font-bold uppercase tracking-widest pl-1">Judul SOP/IK</Label>
                            <Input
                              value={publicForm.judul}
                              onChange={(e) => setPublicForm({ ...publicForm, judul: e.target.value })}
                              placeholder="Input judul..."
                              required
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-700 focus:border-orange-500 h-9 text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-white/50 text-[9px] font-bold uppercase tracking-widest pl-1">Lingkup</Label>
                              <Select value={publicForm.lingkup} onValueChange={(v) => setPublicForm({ ...publicForm, lingkup: v })}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                  {LINGKUP_OPTIONS.map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-white/50 text-[9px] font-bold uppercase tracking-widest pl-1">Jenis</Label>
                              <Select value={publicForm.jenis} onValueChange={(v) => setPublicForm({ ...publicForm, jenis: v })}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                  {JENIS_OPTIONS.map(j => <SelectItem key={j} value={j} className="text-xs">{j}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compact Section: File & Keterangan */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
                      <div className="md:col-span-4 space-y-1.5">
                        <Label className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em]">File Lampiran</Label>
                        <div className="relative h-20 border-2 border-dashed border-white/10 rounded-xl group hover:border-orange-500/50 hover:bg-orange-500/5 transition-all">
                          <input
                            type="file"
                            accept=".xlsx,.xls,.pdf,.docx,.doc"
                            onChange={(e) => setPublicForm({ ...publicForm, file: e.target.files?.[0] || null })}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                            <motion.div animate={publicForm.file ? { scale: [1, 1.1, 1], color: '#22c55e' } : {}}>
                              {publicForm.file ? <CheckCircle className="w-5 h-5" /> : <Upload className="w-4 h-4 text-white/30 group-hover:text-orange-500" />}
                            </motion.div>
                            <p className="text-[9px] text-white/70 font-bold truncate max-w-full mt-1">
                              {publicForm.file ? publicForm.file.name : 'PDF / EXCEL'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-8 space-y-1.5">
                        <Label className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em]">Keterangan</Label>
                        <Textarea
                          value={publicForm.keterangan}
                          onChange={(e) => setPublicForm({ ...publicForm, keterangan: e.target.value })}
                          placeholder="Catatan singkat (opsional)..."
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-700 focus:border-orange-500 h-20 text-xs resize-none"
                        />
                      </div>
                    </div>

                    {/* Submit Button Section - Compact */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full h-11 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-xl shadow-orange-500/10 text-xs font-black tracking-widest uppercase rounded-xl relative overflow-hidden group"
                        disabled={loading}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>PROSES...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>KIRIM DOKUMEN SEKARANG</span>
                            </>
                          )}
                        </span>
                      </Button>
                      <div className="flex justify-center mt-3 gap-4 opacity-30 font-mono text-[8px] text-white tracking-widest">
                        <span>SYSTEM ID: BCC-2026</span>
                        <span>|</span>
                        <span>LOC: 06°07'12"S 106°51'34"E</span>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </main>



        {/* Glowing Footer - Bottom Left */}
        <motion.div
          className="fixed bottom-4 left-4 z-50"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="relative cursor-pointer" onClick={() => setShowCopyrightPopup(true)}>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-lg blur-md opacity-60 animate-pulse" />

            {/* Shimmer container */}
            <div className="relative px-4 py-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-lg border border-orange-500/30 overflow-hidden hover:border-orange-500/60 transition-colors">
              {/* Animated shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent animate-shimmer" />

              {/* Text with glow */}
              <p className="text-sm font-medium relative z-10">
                <span className="text-gray-400">© </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-400 animate-pulse font-bold hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 transition-all">
                  FOE - 2026
                </span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Login Dialog */}
        <Dialog open={showLogin} onOpenChange={setShowLogin}>
          <DialogContent className="sm:max-w-md bg-transparent border-0 overflow-visible p-0 shadow-none" aria-describedby={undefined}>
            <DialogTitle className="sr-only">Login Admin</DialogTitle>

            {/* Animated Background Container */}
            <motion.div
              className="relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              {/* Outer Glow Ring */}
              <motion.div
                className="absolute -inset-4 rounded-3xl"
                style={{
                  background: 'conic-gradient(from 0deg, #f97316, #dc2626, #f97316, #fbbf24, #f97316)',
                  filter: 'blur(20px)',
                  opacity: 0.4
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />

              {/* Radar Sweep Effect */}
              <motion.div
                className="absolute -inset-8 rounded-full pointer-events-none"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0deg, rgba(249, 115, 22, 0.15) 30deg, transparent 60deg)'
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />

              {/* Floating Particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: i % 2 === 0 ? '#f97316' : '#fbbf24',
                    left: `${10 + i * 12}% `,
                    top: `${-20 + (i % 3) * 10}% `,
                    boxShadow: '0 0 10px currentColor'
                  }}
                  animate={{
                    y: [-10, 10, -10],
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{
                    duration: 2 + i * 0.3,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}

              {/* Main Card */}
              <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-orange-500/30 overflow-hidden backdrop-blur-xl">
                {/* Animated Grid Background */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `
  linear - gradient(rgba(249, 115, 22, 0.3) 1px, transparent 1px),
    linear - gradient(90deg, rgba(249, 115, 22, 0.3) 1px, transparent 1px)
      `,
                    backgroundSize: '30px 30px'
                  }} />
                </div>

                {/* Header with Animated Beacon */}
                <div className="relative p-8 text-white overflow-hidden">
                  {/* Beacon Pulse Effect */}
                  <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    animate={{
                      scale: [1, 2, 1],
                      opacity: [0.3, 0, 0.3]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="w-40 h-40 rounded-full border-2 border-orange-500/30" />
                  </motion.div>
                  <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    animate={{
                      scale: [1, 2.5, 1],
                      opacity: [0.2, 0, 0.2]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  >
                    <div className="w-40 h-40 rounded-full border-2 border-orange-500/20" />
                  </motion.div>

                  <motion.div
                    className="relative z-10 flex flex-col items-center"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Animated SAR Logo */}
                    <motion.div
                      className="relative w-20 h-20 mb-4"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                      {/* Rotating Ring */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl border-2 border-orange-400/50"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                      />

                      {/* Inner Glow */}
                      <motion.div
                        className="absolute inset-1 rounded-xl bg-gradient-to-br from-orange-500 to-red-600"
                        animate={{
                          boxShadow: [
                            '0 0 20px rgba(249, 115, 22, 0.5)',
                            '0 0 40px rgba(249, 115, 22, 0.8)',
                            '0 0 20px rgba(249, 115, 22, 0.5)'
                          ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />

                      {/* Icon */}
                      <div className="absolute inset-2 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Shield className="w-8 h-8 text-white" />
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* Title with Glowing Effect */}
                    <motion.h2
                      className="text-3xl font-bold relative"
                      animate={{
                        textShadow: [
                          '0 0 10px rgba(249, 115, 22, 0.5)',
                          '0 0 30px rgba(249, 115, 22, 0.8)',
                          '0 0 10px rgba(249, 115, 22, 0.5)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="bg-gradient-to-r from-orange-300 via-yellow-200 to-orange-300 bg-clip-text text-transparent">
                        LOGIN ADMIN
                      </span>
                    </motion.h2>

                    <motion.p
                      className="text-orange-200/80 text-sm mt-2 tracking-wider"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      SISTEM KATALOG SOP & IK
                    </motion.p>

                    <motion.div
                      className="flex items-center gap-2 mt-2 text-orange-300/60 text-xs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Radio className="w-3 h-3 animate-pulse" />
                      <span>DIREKTORAT KESIAPSIAGAAN</span>
                    </motion.div>
                  </motion.div>
                </div>

                {/* Form Section */}
                <motion.form
                  onSubmit={handleLogin}
                  className="p-8 pt-4 space-y-6 relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {/* Email Input */}
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Label className="font-semibold text-orange-200/90 flex items-center gap-2 text-sm tracking-wide">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      >
                        <Radio className="w-4 h-4 text-orange-400" />
                      </motion.div>
                      EMAIL
                    </Label>
                    <div className="relative group">
                      <motion.div
                        className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 opacity-0 group-focus-within:opacity-50 blur transition-opacity"
                      />
                      <Input
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        placeholder="Masukkan email admin"
                        required
                        className="relative h-12 bg-slate-800/50 border-2 border-orange-500/30 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-white placeholder:text-gray-500 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </motion.div>

                  {/* Password Input */}
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Label className="font-semibold text-orange-200/90 flex items-center gap-2 text-sm tracking-wide">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Shield className="w-4 h-4 text-orange-400" />
                      </motion.div>
                      PASSWORD
                    </Label>
                    <div className="relative group">
                      <motion.div
                        className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 opacity-0 group-focus-within:opacity-50 blur transition-opacity"
                      />
                      <Input
                        type="password"
                        autoComplete="current-password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        placeholder="Masukkan password"
                        required
                        className="relative h-12 bg-slate-800/50 border-2 border-orange-500/30 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-white placeholder:text-gray-500 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </motion.div>

                  {/* Buttons */}
                  <motion.div
                    className="flex gap-4 pt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <motion.div
                      className="flex-1"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowLogin(false)}
                        className="w-full border-2 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white h-12 rounded-xl font-semibold transition-all duration-300"
                      >
                        Batal
                      </Button>
                    </motion.div>

                    <motion.div
                      className="flex-1 relative"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Shimmer Effect */}
                      <motion.div
                        className="absolute inset-0 rounded-xl overflow-hidden"
                        style={{ zIndex: 0 }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        />
                      </motion.div>

                      <Button
                        type="submit"
                        className="relative w-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:via-orange-700 hover:to-red-700 text-white h-12 rounded-xl font-bold shadow-xl shadow-orange-500/40 transition-all duration-300 border border-orange-400/30"
                        disabled={loading}
                      >
                        <motion.span
                          className="flex items-center justify-center gap-2"
                          animate={loading ? {} : { scale: [1, 1.02, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {loading ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <RefreshCw className="w-5 h-5" />
                              </motion.div>
                              <span>Memproses...</span>
                            </>
                          ) : (
                            <>
                              <LogIn className="w-5 h-5" />
                              <span>MASUK</span>
                            </>
                          )}
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>

                  {/* Footer */}
                  <motion.div
                    className="text-center pt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <button
                      type="button"
                      className="text-gray-500 text-xs hover:text-orange-400 transition-colors cursor-pointer focus:outline-none focus:text-orange-400"
                      onClick={() => {
                        setShowLogin(false)
                        setShowCopyrightPopup(true)
                      }}
                    >
                      © 2026 Foe
                    </button>
                  </motion.div>
                </motion.form>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>

        {/* Copyright Popup */}
        <CopyrightPopup show={showCopyrightPopup} onClose={() => setShowCopyrightPopup(false)} />
      </div >
    )
  }

  // Main Application
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <SARBackground />

      {/* Logout Animation */}
      <LogoutAnimation show={showLogoutAnimation} userName={user?.name} />

      {/* Login Success Full Screen Animation */}
      <AnimatePresence>
        {showLoginSuccess && loginSuccessRole === 'DEVELOPER' ? (
          /* ==================== DEVELOPER ANIMATION - QING DYNASTY THEME ==================== */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          >
            {/* Imperial Golden Background */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-amber-900 via-yellow-800 to-orange-900"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
            />

            {/* Golden silk texture overlay */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFD700' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            />

            {/* Flying Dragon Animation */}
            <motion.div
              className="absolute w-full h-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {/* Dragon SVG circling the screen */}
              <motion.svg
                viewBox="0 0 800 600"
                className="absolute w-[600px] h-[450px]"
                style={{
                  filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 60px rgba(255, 140, 0, 0.5))'
                }}
                animate={{
                  x: [
                    'calc(0% - 200px)',
                    'calc(25% - 100px)',
                    'calc(50% - 300px)',
                    'calc(75% - 100px)',
                    'calc(100% - 400px)',
                    'calc(75% - 300px)',
                    'calc(50% - 200px)',
                    'calc(25% - 300px)',
                    'calc(0% - 200px)'
                  ],
                  y: [
                    'calc(0% - 100px)',
                    'calc(25% - 50px)',
                    'calc(50% - 150px)',
                    'calc(75% - 50px)',
                    'calc(100% - 200px)',
                    'calc(75% - 150px)',
                    'calc(50% - 100px)',
                    'calc(25% - 150px)',
                    'calc(0% - 100px)'
                  ],
                  rotate: [0, 10, -5, 15, -10, 5, -15, 10, 0],
                  scale: [1, 1.1, 0.95, 1.05, 1, 1.1, 0.95, 1.05, 1]
                }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                {/* Imperial Chinese Dragon */}
                <defs>
                  <linearGradient id="dragonGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700" />
                    <stop offset="25%" stopColor="#FFA500" />
                    <stop offset="50%" stopColor="#FFD700" />
                    <stop offset="75%" stopColor="#FF8C00" />
                    <stop offset="100%" stopColor="#FFD700" />
                  </linearGradient>
                  <linearGradient id="dragonBody" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFD700" />
                    <stop offset="50%" stopColor="#FFA500" />
                    <stop offset="100%" stopColor="#FF6B00" />
                  </linearGradient>
                </defs>

                {/* Dragon Body */}
                <motion.path
                  d="M100,300 
                     Q150,250 200,280 
                     Q250,310 300,260 
                     Q350,210 400,250 
                     Q450,290 500,240 
                     Q550,190 600,230 
                     Q650,270 700,220
                     Q720,200 740,210"
                  fill="none"
                  stroke="url(#dragonBody)"
                  strokeWidth="25"
                  strokeLinecap="round"
                  animate={{
                    d: [
                      "M100,300 Q150,250 200,280 Q250,310 300,260 Q350,210 400,250 Q450,290 500,240 Q550,190 600,230 Q650,270 700,220 Q720,200 740,210",
                      "M100,290 Q150,260 200,290 Q250,320 300,270 Q350,220 400,260 Q450,300 500,250 Q550,200 600,240 Q650,280 700,230 Q720,210 740,220",
                      "M100,310 Q150,240 200,270 Q250,300 300,250 Q350,200 400,240 Q450,280 500,230 Q550,180 600,220 Q650,260 700,210 Q720,190 740,200",
                      "M100,300 Q150,250 200,280 Q250,310 300,260 Q350,210 400,250 Q450,290 500,240 Q550,190 600,230 Q650,270 700,220 Q720,200 740,210"
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Dragon Head */}
                <motion.g
                  animate={{
                    x: [0, 5, -5, 0],
                    y: [0, -3, 3, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {/* Head base */}
                  <ellipse cx="720" cy="200" rx="45" ry="35" fill="url(#dragonGold)" />
                  {/* Snout */}
                  <ellipse cx="760" cy="200" rx="25" ry="18" fill="#FFA500" />
                  {/* Eye */}
                  <circle cx="730" cy="190" r="8" fill="#1a1a1a" />
                  <circle cx="732" cy="188" r="3" fill="#fff" />
                  {/* Horns */}
                  <path d="M700,170 Q680,140 690,120" fill="none" stroke="#FFD700" strokeWidth="6" strokeLinecap="round" />
                  <path d="M710,165 Q695,135 705,115" fill="none" stroke="#FFA500" strokeWidth="5" strokeLinecap="round" />
                  {/* Whiskers */}
                  <motion.path
                    d="M770,195 Q800,180 820,190"
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="2"
                    animate={{ d: ["M770,195 Q800,180 820,190", "M770,195 Q800,200 820,185", "M770,195 Q800,180 820,190"] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <motion.path
                    d="M770,205 Q800,220 820,210"
                    fill="none"
                    stroke="#FFA500"
                    strokeWidth="2"
                    animate={{ d: ["M770,205 Q800,220 820,210", "M770,205 Q800,210 820,215", "M770,205 Q800,220 820,210"] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  {/* Dragon flame from mouth */}
                  <motion.ellipse
                    cx="790"
                    cy="200"
                    rx="15"
                    ry="8"
                    fill="#FF4500"
                    animate={{ rx: [15, 20, 15], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                </motion.g>

                {/* Dragon Legs */}
                <motion.g
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ transformOrigin: '300px 280px' }}
                >
                  <path d="M280,280 L260,350 L280,350 L300,280" fill="url(#dragonGold)" />
                  <path d="M350,270 L340,340 L360,340 L370,270" fill="url(#dragonGold)" />
                </motion.g>

                {/* Dragon Claws */}
                <motion.g
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ transformOrigin: '270px 350px' }}
                >
                  <path d="M250,350 L245,370 M260,350 L258,372 M270,350 L272,368" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" />
                </motion.g>

                {/* Dragon Scales pattern */}
                {[...Array(12)].map((_, i) => (
                  <motion.ellipse
                    key={i}
                    cx={150 + i * 45}
                    cy={285 + (i % 2) * 20}
                    rx="15"
                    ry="10"
                    fill="rgba(255, 215, 0, 0.3)"
                    stroke="#FFA500"
                    strokeWidth="1"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}

                {/* Dorsal fins */}
                {[...Array(8)].map((_, i) => (
                  <motion.path
                    key={`fin - ${i} `}
                    d={`M${180 + i * 55},${260 - (i % 2) * 20} L${200 + i * 55},${220 - (i % 2) * 30} L${220 + i * 55},${265 - (i % 2) * 15} `}
                    fill="#FF6B00"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}

                {/* Dragon Tail */}
                <motion.path
                  d="M100,300 Q60,320 40,290 Q20,260 50,240 Q80,220 70,250"
                  fill="none"
                  stroke="url(#dragonBody)"
                  strokeWidth="20"
                  strokeLinecap="round"
                  animate={{
                    d: [
                      "M100,300 Q60,320 40,290 Q20,260 50,240 Q80,220 70,250",
                      "M100,300 Q60,310 30,280 Q10,250 40,230 Q70,210 60,240",
                      "M100,300 Q60,330 50,300 Q30,270 60,250 Q90,230 80,260",
                      "M100,300 Q60,320 40,290 Q20,260 50,240 Q80,220 70,250"
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.svg>
            </motion.div>

            {/* Golden sparkles */}
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={`sparkle - ${i} `}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}% `,
                  top: `${Math.random() * 100}% `,
                  width: `${4 + Math.random() * 8} px`,
                  height: `${4 + Math.random() * 8} px`,
                  background: `radial - gradient(circle, #FFD700 0 %, #FFA500 50 %, transparent 70 %)`,
                  borderRadius: '50%',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1 + Math.random() * 1.5,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'easeInOut'
                }}
              />
            ))}

            {/* Floating golden clouds */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`cloud - ${i} `}
                className="absolute opacity-40"
                style={{
                  left: `${-20 + i * 25}% `,
                  top: `${20 + (i % 3) * 25}% `,
                  width: '200px',
                  height: '80px',
                  background: 'radial-gradient(ellipse, rgba(255, 215, 0, 0.5) 0%, transparent 70%)',
                  borderRadius: '50%',
                }}
                animate={{
                  x: [0, 100, 0],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 8 + i * 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.5
                }}
              />
            ))}

            {/* Imperial emblem rays */}
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              {[...Array(16)].map((_, i) => (
                <div
                  key={`ray - ${i} `}
                  className="absolute left-1/2 top-1/2 w-1 h-[50vh]"
                  style={{
                    background: 'linear-gradient(to top, transparent, rgba(255, 215, 0, 0.2), transparent)',
                    transform: `rotate(${i * 22.5}deg) translateX(-50 %)`,
                    transformOrigin: 'center bottom',
                  }}
                />
              ))}
            </motion.div>

            {/* Main content */}
            <div className="relative z-10 text-center">
              {/* Imperial Crown/Logo */}
              <motion.div
                className="w-40 h-40 mx-auto mb-6 relative"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2
                }}
              >
                {/* Outer golden ring */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, #FFD700, #FFA500, #FF6B00, #FFA500, #FFD700)',
                    boxShadow: '0 0 60px rgba(255, 215, 0, 0.8), 0 0 100px rgba(255, 140, 0, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.3)'
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                />

                {/* Inner circle */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-800 via-yellow-700 to-orange-800 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-5xl"
                  >
                    👑
                  </motion.div>
                </div>

                {/* Pulsing glow */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    boxShadow: [
                      '0 0 30px rgba(255, 215, 0, 0.5), 0 0 60px rgba(255, 140, 0, 0.3)',
                      '0 0 60px rgba(255, 215, 0, 0.8), 0 0 100px rgba(255, 140, 0, 0.5)',
                      '0 0 30px rgba(255, 215, 0, 0.5), 0 0 60px rgba(255, 140, 0, 0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>

              {/* Imperial Title */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.h2
                  className="text-5xl font-black mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #FFA500, #FF6B00, #FFD700)',
                    backgroundSize: '300% 300%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 40px rgba(255, 215, 0, 0.8)',
                    fontFamily: 'serif'
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  龍帝降临
                </motion.h2>
                <motion.p
                  className="text-2xl text-amber-300 font-bold tracking-widest mb-4"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  DRAGON EMPEROR HAS ARRIVED
                </motion.p>
              </motion.div>

              {/* User name with imperial styling */}
              <motion.div
                className="inline-block px-10 py-4 mt-4 relative"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.8 }}
              >
                {/* Decorative frame */}
                <div className="absolute inset-0 border-2 border-amber-400/50 rounded-lg" />
                <div className="absolute inset-1 border border-amber-500/30 rounded-md" />

                <motion.p
                  className="text-3xl font-bold text-amber-200 relative z-10"
                  animate={{ textShadow: ['0 0 10px #FFD700', '0 0 20px #FFA500', '0 0 10px #FFD700'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {loginSuccessName}
                </motion.p>
                <p className="text-amber-400/80 text-sm mt-1 relative z-10">DEVELOPER ACCESS</p>
              </motion.div>

              {/* Status indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 flex items-center justify-center gap-3"
              >
                <motion.div
                  className="w-3 h-3 rounded-full bg-amber-400"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-amber-200 text-lg font-medium">Memasuki Istana...</span>
                <motion.div
                  className="w-3 h-3 rounded-full bg-amber-400"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                />
              </motion.div>
            </div>

            {/* Corner decorations - Imperial style */}
            {[
              { top: 'top-8', left: 'left-8', borders: 'border-t-4 border-l-4', rounded: 'rounded-tl-3xl' },
              { top: 'top-8', left: 'right-8', borders: 'border-t-4 border-r-4', rounded: 'rounded-tr-3xl' },
              { top: 'bottom-8', left: 'left-8', borders: 'border-b-4 border-l-4', rounded: 'rounded-bl-3xl' },
              { top: 'bottom-8', left: 'right-8', borders: 'border-b-4 border-r-4', rounded: 'rounded-br-3xl' },
            ].map((corner, i) => (
              <motion.div
                key={i}
                className={`absolute ${corner.top} ${corner.left} w - 24 h - 24 ${corner.borders} ${corner.rounded} border - amber - 400 / 60`}
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50, y: i < 2 ? -50 : 50 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.3 }}
              />
            ))}
          </motion.div>
        ) : showLoginSuccess ? (
          /* ==================== PREMIUM FULL-SCREEN ANIMATION FOR ADMIN, STAF, & OTHERS ==================== */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          >
            {/* 1. Full Screen Background Layer */}
            <motion.div
              className={`absolute inset-0 transition-colors duration-700 ${loginSuccessRole === 'ADMIN'
                ? 'bg-gradient-to-br from-red-900 via-red-800 to-red-950'
                : loginSuccessRole === 'STAF'
                  ? 'bg-gradient-to-br from-green-900 via-emerald-900 to-emerald-950'
                  : 'bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950'
                }`}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              {/* 2. SAR Grid/Coordinate Overlay */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                  backgroundSize: '40px 40px'
                }}
              />
              <motion.div
                className="absolute inset-0 border-[1px] border-white/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              {/* 3. Radar Sweep Effect */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vmax] h-[150vmax]"
                style={{
                  background: 'conic-gradient(from 0deg, rgba(255,255,255,0.15) 0deg, transparent 60deg, transparent 360deg)'
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />

              {/* 4. Scanning Line */}
              <motion.div
                className="absolute inset-x-0 h-[2px] bg-white/30 z-10 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                animate={{ top: ['-10%', '110%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>

            {/* Main Content Card */}
            <motion.div
              className="relative z-20 flex flex-col items-center justify-center p-12 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/20 shadow-2xl max-w-lg w-full mx-4"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            >
              {/* Identity Shield with Role-Based Glowing ring */}
              <div className="relative mb-8">
                <motion.div
                  className={`absolute -inset-6 rounded-full blur-2xl opacity-50 ${loginSuccessRole === 'ADMIN' ? 'bg-red-500' : loginSuccessRole === 'STAF' ? 'bg-green-500' : 'bg-purple-500'}`}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className={`w-28 h-28 rounded-full flex items-center justify-center border-4 border-white/30 ${loginSuccessRole === 'ADMIN' ? 'bg-red-600' : loginSuccessRole === 'STAF' ? 'bg-green-600' : 'bg-purple-600'}`}
                  initial={{ rotate: -90 }}
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.8, type: 'spring' }}
                >
                  <Shield className="w-14 h-14 text-white drop-shadow-lg" />
                </motion.div>
              </div>

              {/* Animated Text Section */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <span className={`px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 inline-block ${loginSuccessRole === 'ADMIN' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : loginSuccessRole === 'STAF' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                    {loginSuccessRole || 'USER'} ACCESS GRANTED
                  </span>
                  <h2 className="text-5xl font-black text-white tracking-tighter mb-2">
                    LOGIN <span className={loginSuccessRole === 'ADMIN' ? 'text-red-500' : loginSuccessRole === 'STAF' ? 'text-green-500' : 'text-purple-500'}>SUKSES!</span>
                  </h2>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-1"
                >
                  <p className="text-white/60 text-lg">Selamat Datang,</p>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {loginSuccessName}
                  </p>
                </motion.div>

                {/* BASARNAS Indicator */}
                <motion.div
                  className="pt-6 border-t border-white/10 mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <div className="flex items-center justify-center gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`w-2 h-2 rounded-full ${loginSuccessRole === 'ADMIN' ? 'bg-red-500' : loginSuccessRole === 'STAF' ? 'bg-green-500' : 'bg-purple-500'}`}
                    />
                    <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
                      DIREKTORAT KESIAPSIAGAAN
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Side Coordinates Decoration */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-12">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 0.3, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.1 }}
                  className="text-[10px] font-mono text-white/40 rotate-90 whitespace-nowrap"
                >
                  LAT: 06° 07' {12 + i * 5}" S / LONG: 106° 51' {34 + i * 8}" E
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
              userRole={user?.role}
            />

            {/* Active Edit Session Indicator */}
            {desktopEditSessionToken && excelEditData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 border border-orange-500/50 rounded-lg"
              >
                <FileSpreadsheet className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-orange-300 font-medium">
                  Edit: {excelEditData.fileName?.slice(0, 20)}...
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelSession}
                  className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
                >
                  <X className="w-3 h-3 mr-1" />
                  Batal
                </Button>
              </motion.div>
            )}

            {/* User Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:bg-white/10 flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium leading-tight">{user?.name}</p>
                    <p className="text-[10px] text-orange-400 font-medium uppercase tracking-wider">{user?.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 p-2 bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl overflow-hidden"
              >
                {/* User Info Header */}
                <div className="px-3 py-3 mb-2 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                      <span className="text-white text-base font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                      <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        {user?.role}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Menu Items */}
                <div className="space-y-1">
                  <DropdownMenuItem 
                    onClick={() => {
                      handleLogout()
                      setShowLogin(true)
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-gray-300 hover:text-white hover:bg-white/5 focus:bg-white/5 transition-all duration-150 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <RefreshCw className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Switch User</p>
                      <p className="text-[10px] text-gray-500">Ganti akun pengguna</p>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => {
                      setPasswordChangeForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      setShowPasswordChangeDialog(true)
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-gray-300 hover:text-white hover:bg-white/5 focus:bg-white/5 transition-all duration-150 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                      <Shield className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Ganti Password</p>
                      <p className="text-[10px] text-gray-500">Ubah kata sandi akun</p>
                    </div>
                  </DropdownMenuItem>
                </div>
                
                {/* Logout Section */}
                <div className="mt-2 pt-2 border-t border-white/10">
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 transition-all duration-150 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Logout</p>
                      <p className="text-[10px] text-red-400/60">Keluar dari aplikasi</p>
                    </div>
                  </DropdownMenuItem>
                </div>
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
          <nav className="relative z-10 py-4 space-y-1 flex-1">
            {menuItems.filter(item => item.roles.includes(user?.role || '')).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant={currentPage === item.id ? 'default' : 'ghost'}
                  className={`w-full justify-start gap-4 px-6 py-6 rounded-none border-l-4 transition-all duration-200 ${currentPage === item.id ? 'border-orange-500 bg-gradient-to-r from-orange-500/20 to-transparent text-white' : 'border-transparent text-gray-300 hover:border-gray-400 hover:bg-white/10 hover:text-white'}`}
                  onClick={() => handleNavigation(item.id)}
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
                  {/* Notification badge for Arsip - show if there are newly rejected files */}
                  {item.id === 'arsip' && stats?.totalPublikDitolakBaru !== undefined && stats.totalPublikDitolakBaru > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto min-w-[20px] h-5 px-1.5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse"
                    >
                      {stats.totalPublikDitolakBaru}
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
          <AnimatePresence mode="popLayout">
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
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      variants={fadeInUp}
                    >
                      <ShimmerTitle subtitle="Overview sistem katalog SOP dan IK">Laporan Analitik</ShimmerTitle>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleExport('xlsx')}
                          disabled={exportingXlsx}
                          className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 shadow-lg shadow-orange-500/5"
                        >
                          {exportingXlsx ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                          )}
                          {exportingXlsx ? 'Memproses...' : 'Export Excel'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleExport('pdf')}
                          disabled={exportingPdf}
                          className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 shadow-lg shadow-orange-500/5"
                        >
                          {exportingPdf ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <FileIcon className="w-4 h-4 mr-2" />
                          )}
                          {exportingPdf ? 'Memproses...' : 'Export PDF'}
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
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                      variants={staggerContainer}
                    >
                      <StatCard title="Aktif" value={stats.totalAktif} icon={CheckCircle} color="green" delay={0.4} />
                      <StatCard title="Review" value={stats.totalReview} icon={Clock} color="yellow" delay={0.5} />
                      <StatCard title="Kadaluarsa" value={stats.totalKadaluarsa} icon={XCircle} color="red" delay={0.6} />
                      <StatCard title="Total Lingkup" value={stats.byLingkup?.length || 0} icon={Globe} color="blue" delay={0.7} />
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
                                  <Cell key={`cell - ${index} `} fill={COLORS[index % COLORS.length]} />
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



                      <Card className="glass-card border-0 shadow-xl">
                        <CardHeader>
                          <CardTitle className="text-lg text-blue-900 font-bold">Distribusi per Lingkup</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={stats.byLingkup || []}
                                dataKey="count"
                                nameKey="lingkup"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                labelLine={false}
                                stroke="#1e3a5f"
                                strokeWidth={2}
                              >
                                {(stats.byLingkup || []).map((_, index) => (
                                  <Cell key={`cell - ${index} `} fill={COLORS[(index + 3) % COLORS.length]} />
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
                                  <div className="flex items-center gap-2">
                                    <FileTypeIcon fileName={sop.fileName} className="w-4 h-4 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-blue-900 truncate max-w-[200px]">{sop.judul}</p>
                                    </div>
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
                                  <div className="flex items-center gap-2 flex-1">
                                    <FileTypeIcon fileName={sop.fileName} className="w-4 h-4 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-blue-900 truncate">{sop.judul}</p>
                                    </div>
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
                                  <div className="flex items-center gap-2 flex-1">
                                    <FileTypeIcon fileName={sop.fileName} className="w-4 h-4 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium text-blue-900 truncate">{sop.judul}</p>
                                    </div>
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
                  {(user?.role === 'ADMIN' || user?.role === 'DEVELOPER') && (
                    <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                      <DialogTrigger asChild>
                        <Button className="btn-sar bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/30">
                          <Plus className="w-4 h-4 mr-2" />
                          Tambah SOP/IK
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-0 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-slate-900 rounded-[1.5rem]" aria-describedby={undefined}>
                        {/* Premium Glassmorphism Header */}
                        <div className="relative overflow-hidden p-6" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                          <div className="absolute inset-0 pointer-events-none">
                            <motion.div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-orange-500/10 blur-3xl" animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
                            <motion.div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-red-500/10 blur-3xl" animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                          </div>

                          <div className="relative z-10 flex items-center gap-5">
                            <motion.div
                              className="w-16 h-16 rounded-2xl flex items-center justify-center relative shadow-2xl"
                              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.9), rgba(220,38,38,0.9))', boxShadow: '0 10px 30px -10px rgba(249,115,22,0.5)' }}
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            >
                              <div className="absolute inset-0 rounded-2xl border border-white/20" />
                              <Upload className="w-8 h-8 text-white drop-shadow-md" />
                            </motion.div>
                            <div>
                              <DialogTitle className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 tracking-tight">
                                Upload Dokumen
                              </DialogTitle>
                              <DialogDescription className="text-slate-400 text-sm mt-1 font-medium">
                                Tambahkan SOP/IK baru ke dalam katalog sistem digital.
                              </DialogDescription>
                            </div>
                          </div>
                        </div>

                        {/* Form Content inside Glassmorphism container */}
                        <form onSubmit={(e) => handleUpload(e)} className="p-6 space-y-6 bg-slate-900 border-t border-slate-800">

                          {/* Grid Inputs */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Judul Dokumen <span className="text-red-500">*</span></Label>
                              <Input
                                value={uploadForm.judul}
                                onChange={(e) => setUploadForm({ ...uploadForm, judul: e.target.value })}
                                placeholder="Ketik judul SOP atau IK di sini..."
                                required
                                className="h-11 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl transition-all font-medium"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Kategori</Label>
                                <Select value={uploadForm.kategori} onValueChange={(v) => setUploadForm({ ...uploadForm, kategori: v })}>
                                  <SelectTrigger className="h-11 bg-slate-800/50 border-slate-700 text-slate-200 focus:border-orange-500 rounded-xl">
                                    <SelectValue placeholder="Pilih kategori" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 rounded-xl">
                                    {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k} className="focus:bg-slate-700 focus:text-white">{k}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Lingkup</Label>
                                <Select value={uploadForm.lingkup} onValueChange={(v) => setUploadForm({ ...uploadForm, lingkup: v })}>
                                  <SelectTrigger className="h-11 bg-slate-800/50 border-slate-700 text-slate-200 focus:border-orange-500 rounded-xl">
                                    <SelectValue placeholder="Pilih lingkup" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 rounded-xl">
                                    {LINGKUP_OPTIONS.map(l => <SelectItem key={l} value={l} className="focus:bg-slate-700 focus:text-white">{l}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Jenis</Label>
                                <Select value={uploadForm.jenis} onValueChange={(v) => setUploadForm({ ...uploadForm, jenis: v })}>
                                  <SelectTrigger className="h-11 bg-slate-800/50 border-slate-700 text-slate-200 focus:border-orange-500 rounded-xl">
                                    <SelectValue placeholder="Pilih jenis" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 rounded-xl">
                                    {JENIS_OPTIONS.map(j => <SelectItem key={j} value={j} className="focus:bg-slate-700 focus:text-white">{j}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Status</Label>
                                <Select value={uploadForm.status} onValueChange={(v) => setUploadForm({ ...uploadForm, status: v })}>
                                  <SelectTrigger className="h-11 bg-slate-800/50 border-slate-700 text-slate-200 focus:border-orange-500 rounded-xl">
                                    <SelectValue placeholder="Pilih status" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 rounded-xl">
                                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="focus:bg-slate-700 focus:text-white">{s}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tahun</Label>
                              <Input
                                type="number"
                                value={uploadForm.tahun || ''}
                                onChange={(e) => setUploadForm({ ...uploadForm, tahun: parseInt(e.target.value) })}
                                required
                                className="h-11 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl text-center font-medium"
                              />
                            </div>
                          </div>

                          {/* Futuristic File Dropzone */}
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                              File Dokumen <span className="text-red-500">*</span>
                            </Label>

                            <motion.div
                              whileHover={{ scale: uploadForm.file ? 1 : 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 group overflow-hidden ${uploadForm.file
                                ? 'border-orange-500/50 bg-orange-500/5 ring-4 ring-orange-500/10'
                                : 'border-slate-700 bg-slate-800/30 hover:border-orange-500/50 hover:bg-slate-800/80 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)]'
                                }`}
                              onClick={() => document.getElementById('file-input')?.click()}
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => {
                                e.preventDefault(); e.stopPropagation();
                                const file = e.dataTransfer.files?.[0];
                                if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc'))) {
                                  setUploadForm({ ...uploadForm, file });
                                }
                              }}
                            >
                              <input
                                id="file-input"
                                type="file"
                                accept=".xlsx,.xls,.pdf,.docx,.doc"
                                className="hidden"
                                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                              />

                              {uploadForm.file ? (
                                <div className="flex items-center justify-between gap-4 relative z-10">
                                  <div className="flex items-center gap-4">
                                    <div className="relative">
                                      <div className="absolute inset-0 bg-orange-500 blur-md opacity-20 rounded-full" />
                                      <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center relative z-10 shadow-lg">
                                        {uploadForm.file.name.endsWith('.xlsx') || uploadForm.file.name.endsWith('.xls') ? (
                                          <FileSpreadsheet className="w-7 h-7 text-green-400" />
                                        ) : uploadForm.file.name.endsWith('.docx') || uploadForm.file.name.endsWith('.doc') ? (
                                          <FileText className="w-7 h-7 text-blue-400" />
                                        ) : (
                                          <FileIcon className="w-7 h-7 text-red-400" />
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-left">
                                      <p className="font-bold text-white text-sm max-w-[220px] truncate">{uploadForm.file.name}</p>
                                      <p className="text-xs text-orange-400 font-medium mt-0.5">{(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                  </div>
                                  <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setUploadForm({ ...uploadForm, file: null }); }}
                                    className="p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  >
                                    <X className="w-5 h-5" />
                                  </motion.button>
                                </div>
                              ) : (
                                <div className="space-y-4 relative z-10 py-4">
                                  <div className="flex justify-center">
                                    <motion.div
                                      className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg group-hover:border-orange-500/30 group-hover:bg-slate-800 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all"
                                      animate={{ y: [0, -5, 0] }}
                                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                    >
                                      <Cloud className="w-7 h-7 text-slate-400 group-hover:text-orange-400 transition-colors" />
                                    </motion.div>
                                  </div>
                                  <div>
                                    <p className="font-bold text-white text-sm">
                                      <span className="text-orange-400">Pilih File</span> atau seret ke sini
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1.5 font-medium">
                                      Mendukung XLSX, DOCX, PDF (Maks. 50MB)
                                    </p>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-4 border-t border-slate-800 mt-6 relative">
                            {/* Decorative glow above buttons */}
                            <div className="absolute -top-6 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

                            <Button
                              type="button"
                              onClick={() => setShowUploadDialog(false)}
                              className="w-1/3 h-12 bg-slate-800 hover:bg-slate-700 text-white border-0 rounded-xl font-bold transition-colors"
                            >
                              Batal
                            </Button>
                            <Button
                              type="submit"
                              className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white border-0 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] rounded-xl font-bold relative overflow-hidden transition-all"
                              disabled={loading}
                            >
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                animate={loading ? {} : { x: ['-200%', '200%'] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                              />
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                  <>
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                      <RefreshCw className="w-5 h-5" />
                                    </motion.div>
                                    <span>Memproses...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-5 h-5" />
                                    <span>Upload ke Server</span>
                                  </>
                                )}
                              </span>
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Edit SOP Dialog */}
                  <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl overflow-hidden p-0 rounded-2xl" aria-describedby={undefined}>
                      {/* Header with Basarnas theme */}
                      <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-red-700 p-5 text-white overflow-hidden">
                        {/* Animated background */}
                        <div className="absolute inset-0 overflow-hidden">
                          <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full opacity-20"
                            style={{
                              background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.2) 30deg, transparent 60deg)'
                            }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                          />
                        </div>

                        <div className="relative z-10 flex items-center gap-4">
                          <motion.div
                            className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/20"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                          >
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                              <Edit className="w-4 h-4 text-orange-600" />
                            </div>
                          </motion.div>
                          <div>
                            <DialogTitle className="text-lg font-bold text-white">
                              Edit Data SOP
                            </DialogTitle>
                            <DialogDescription className="text-orange-100/80 text-sm mt-0.5">
                              Perbarui informasi dokumen
                            </DialogDescription>
                          </div>
                        </div>
                      </div>

                      {/* Form Content */}
                      <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="p-5 space-y-4 bg-gradient-to-b from-white via-orange-50/10 to-white">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-orange-100">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                              <FileText className="w-2 h-2 text-white" />
                            </div>
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Informasi Dokumen</span>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="edit-nomor-sop" className="text-xs font-semibold text-gray-600">No. SOP</Label>
                            <Input
                              id="edit-nomor-sop"
                              value={editForm.nomorSop}
                              onChange={(e) => setEditForm({ ...editForm, nomorSop: e.target.value })}
                              placeholder="Contoh: SOP-0001 atau IK-0001"
                              className="h-9 border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-gray-900 rounded-xl text-sm bg-white shadow-sm"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="edit-judul" className="text-xs font-semibold text-gray-600">Judul <span className="text-red-500">*</span></Label>
                            <Input
                              id="edit-judul"
                              value={editForm.judul}
                              onChange={(e) => setEditForm({ ...editForm, judul: e.target.value })}
                              className="h-9 border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-gray-900 rounded-xl text-sm bg-white shadow-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600">Kategori</Label>
                              <Select value={editForm.kategori} onValueChange={(v) => setEditForm({ ...editForm, kategori: v })}>
                                <SelectTrigger className="h-9 border-2 border-gray-200 focus:border-orange-500 text-gray-900 rounded-xl text-xs bg-white shadow-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {KATEGORI_OPTIONS.map(k => (
                                    <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600">Lingkup</Label>
                              <Select value={editForm.lingkup} onValueChange={(v) => setEditForm({ ...editForm, lingkup: v })}>
                                <SelectTrigger className="h-9 border-2 border-gray-200 focus:border-orange-500 text-gray-900 rounded-xl text-xs bg-white shadow-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {LINGKUP_OPTIONS.map(l => (
                                    <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600">Jenis</Label>
                              <Select value={editForm.jenis} onValueChange={(v) => setEditForm({ ...editForm, jenis: v })}>
                                <SelectTrigger className="h-9 border-2 border-gray-200 focus:border-orange-500 text-gray-900 rounded-xl text-xs bg-white shadow-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {JENIS_OPTIONS.map(j => (
                                    <SelectItem key={j} value={j} className="text-xs">{j}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600">Tahun</Label>
                              <Input
                                type="number"
                                value={editForm.tahun || ''}
                                onChange={(e) => setEditForm({ ...editForm, tahun: parseInt(e.target.value) })}
                                required
                                className="h-9 border-2 border-gray-200 focus:border-orange-500 text-gray-900 rounded-xl text-sm bg-white shadow-sm text-center"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-600">Status</Label>
                              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                                <SelectTrigger className="h-9 border-2 border-gray-200 focus:border-orange-500 text-gray-900 rounded-xl text-xs bg-white shadow-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {STATUS_OPTIONS.map(s => (
                                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowEditDialog(false)}
                            className="flex-1 h-10 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium"
                          >
                            Batal
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 h-10 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:via-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-500/30 rounded-xl font-bold relative overflow-hidden"
                          >
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              animate={{ x: ['-100%', '100%'] }}
                              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                            />
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              <Check className="w-4 h-4" />
                              Simpan Perubahan
                            </span>
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Excel Edit Dialog - Microsoft 365 (No User Login Required) */}
                  <Dialog open={showExcelEditDialog} onOpenChange={setShowExcelEditDialog}>
                    <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 shadow-2xl bg-gray-950" style={{ borderRadius: '1.25rem' }} aria-describedby={undefined}>
                      {/* Gradient Header */}
                      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a2744 0%, #0f172a 50%, #1a1a2e 100%)', padding: '28px 28px 24px' }}>
                        {/* Animated background orbs */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <motion.div className="absolute -top-6 -right-6 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)' }} animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }} />
                          <motion.div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)' }} animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 4, repeat: Infinity }} />
                          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                          <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 30px rgba(34,197,94,0.4)' }} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}>
                            <FileSpreadsheet className="w-7 h-7 text-white" />
                          </motion.div>
                          <div>
                            <DialogTitle className="text-xl font-black text-white tracking-tight">Edit Excel Online</DialogTitle>
                            <DialogDescription className="text-green-400/80 text-sm mt-0.5 font-medium">Microsoft 365 — Tanpa Login</DialogDescription>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-6 space-y-4" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)' }}>
                        {excelEditData && (
                          <>
                            {/* File Info Card */}
                            <motion.div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                                <FileSpreadsheet className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-white truncate text-sm">{excelEditData.fileName}</p>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{excelEditData.judul}</p>
                                <div className="flex gap-1.5 mt-2">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)' }}>{excelEditData.jenis}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>{excelEditData.kategori}</span>
                                </div>
                              </div>
                            </motion.div>

                            {/* Loading State */}
                            {excelEditLoading && (
                              <motion.div className="flex flex-col items-center justify-center py-10 rounded-2xl" style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <motion.div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 0 30px rgba(249,115,22,0.4)' }} animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                                  <RefreshCw className="w-6 h-6 text-white" />
                                </motion.div>
                                <p className="text-white font-semibold">Memproses file...</p>
                                <p className="text-xs text-gray-500 mt-1">Download dari R2 → Upload ke OneDrive</p>
                              </motion.div>
                            )}

                            {/* Ready State */}
                            {!excelEditLoading && excelEditUrl && (
                              <motion.div className="space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                {/* Ready badge */}
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
                                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 8px rgba(34,197,94,0.8)' }} />
                                  <span className="text-green-300 font-semibold text-sm">File siap diedit via Excel Online</span>
                                </div>

                                {/* Step guide */}
                                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Cara Edit</p>
                                  {[
                                    { step: '1', text: 'Klik "Buka Excel Online" untuk mulai edit', icon: '🚀' },
                                    { step: '2', text: 'Edit file di browser (Excel Online)', icon: '✏️' },
                                    { step: '3', text: 'Simpan perubahan (Ctrl+S atau File → Save)', icon: '💾' },
                                    { step: '4', text: 'Kembali ke sini lalu klik "Sync ke R2"', icon: '☁️' },
                                  ].map((item) => (
                                    <div key={item.step} className="flex items-center gap-3">
                                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>{item.step}</div>
                                      <span className="text-sm text-gray-300">{item.icon} {item.text}</span>
                                    </div>
                                  ))}
                                </div>

                                {excelEditSessionId && (
                                  <p className="text-[10px] text-gray-600 font-mono px-2">Session: {excelEditSessionId?.slice(0, 24)}...</p>
                                )}

                                {/* Action Buttons */}
                                <Button onClick={handleOpenExcelOnline} className="w-full h-11 font-bold text-sm relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 20px rgba(34,197,94,0.35)' }}>
                                  <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }} />
                                  <span className="relative flex items-center justify-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Buka Excel Online
                                  </span>
                                </Button>

                                <div className="grid grid-cols-2 gap-3">
                                  <Button onClick={handleCancelEdit} className="h-10 text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                    <X className="w-4 h-4 mr-1.5" />
                                    Batalkan
                                  </Button>
                                  <Button onClick={handleCheckEditStatus} className="h-10 text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#d1d5db' }}>
                                    <RefreshCw className="w-4 h-4 mr-1.5" />
                                    Cek Status
                                  </Button>
                                </div>

                                <Button onClick={handleSyncToR2} disabled={excelEditSyncing} className="w-full h-11 font-bold text-sm relative overflow-hidden" style={{ background: excelEditSyncing ? 'rgba(249,115,22,0.3)' : 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: excelEditSyncing ? 'none' : '0 4px 20px rgba(249,115,22,0.35)' }}>
                                  {!excelEditSyncing && (<motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 0.5 }} />)}
                                  <span className="relative flex items-center justify-center gap-2">
                                    {excelEditSyncing ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyinkronkan...</> : <><Cloud className="w-4 h-4" /> Sync ke R2</>}
                                  </span>
                                </Button>
                              </motion.div>
                            )}

                            {/* Error State */}
                            {!excelEditLoading && !excelEditUrl && (
                              <motion.div className="flex flex-col items-center justify-center py-8 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(239,68,68,0.2)' }}>
                                  <AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <p className="text-gray-300 font-medium">Gagal mempersiapkan file</p>
                                <Button onClick={() => handleOpenExcelEdit(excelEditData.id)} className="mt-4 h-9 text-sm px-6" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c' }}>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Coba Lagi
                                </Button>
                              </motion.div>
                            )}
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Desktop Sync Dialog - Upload edited file */}
                  <Dialog open={showDesktopSyncDialog} onOpenChange={setShowDesktopSyncDialog}>
                    <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl bg-gray-950" style={{ borderRadius: '1.25rem' }} aria-describedby={undefined}>
                      {/* Gradient Header */}
                      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1c1f3a 0%, #0f172a 50%, #1a1a2e 100%)', padding: '28px 28px 24px' }}>
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <motion.div className="absolute -top-6 -right-6 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)' }} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 3, repeat: Infinity }} />
                          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                          <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 0 30px rgba(249,115,22,0.4)' }} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}>
                            <RefreshCw className="w-7 h-7 text-white" />
                          </motion.div>
                          <div>
                            <DialogTitle className="text-xl font-black text-white tracking-tight">Selesai Edit &amp; Sync</DialogTitle>
                            <DialogDescription className="text-orange-400/80 text-sm mt-0.5 font-medium">Upload file hasil edit ke storage</DialogDescription>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-6 space-y-4" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)' }}>
                        {excelEditData && (
                          <motion.div className="space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            {/* File Info */}
                            <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ['docx', 'doc'].includes(excelEditData.fileType || '') ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                                {['docx', 'doc'].includes(excelEditData.fileType || '') ? <FileText className="w-6 h-6 text-white" /> : <FileSpreadsheet className="w-6 h-6 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-white truncate text-sm">{excelEditData.fileName}</p>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{excelEditData.judul}</p>
                                {desktopEditSessionToken && (
                                  <p className="text-[10px] text-indigo-400 mt-1 font-mono">🔐 Session aktif • Hash: {desktopEditOriginalHash?.slice(0, 12)}...</p>
                                )}
                              </div>
                            </div>

                            {/* Drag & Drop File Picker */}
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Upload File Hasil Edit</p>
                              <input type="file" accept=".xlsx,.xls,.xlsm,.docx,.doc" onChange={(e) => { const f = e.target.files?.[0]; if (f) setDesktopSyncFile(f) }} className="hidden" id="desktop-sync-file" />
                              <label htmlFor="desktop-sync-file" className="group cursor-pointer block">
                                <div className="rounded-2xl p-6 text-center transition-all duration-200" style={{ border: desktopSyncFile ? '2px solid rgba(34,197,94,0.5)' : '2px dashed rgba(249,115,22,0.3)', background: desktopSyncFile ? 'rgba(34,197,94,0.07)' : 'rgba(249,115,22,0.04)' }}>
                                  {desktopSyncFile ? (
                                    <motion.div className="flex flex-col items-center gap-2" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><CheckCircle className="w-6 h-6 text-white" /></div>
                                      <p className="text-green-300 font-semibold text-sm">{desktopSyncFile.name}</p>
                                      <p className="text-xs text-gray-500">{(desktopSyncFile.size / 1024).toFixed(1)} KB — Klik untuk ganti</p>
                                    </motion.div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-2">
                                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1" style={{ background: 'rgba(249,115,22,0.15)' }}>
                                        <Upload className="w-6 h-6 text-orange-400" />
                                      </div>
                                      <p className="text-sm text-gray-300 font-medium">Klik untuk pilih file</p>
                                      <p className="text-xs text-gray-600">.xlsx · .xls · .xlsm · .docx · .doc</p>
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>

                            {/* Warning */}
                            <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-yellow-200/80"><span className="font-bold text-yellow-300">Catatan:</span> File akan di-checksum. Jika tidak ada perubahan dari file asli, upload akan dibatalkan otomatis.</p>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-1">
                              <Button type="button" onClick={() => setShowDesktopSyncDialog(false)} className="flex-1 h-11 text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                Batal
                              </Button>
                              <Button
                                type="button"
                                onClick={handleDesktopSync}
                                disabled={!desktopSyncFile || desktopSyncing}
                                className="flex-1 h-11 text-sm font-bold relative overflow-hidden"
                                style={{ background: (!desktopSyncFile || desktopSyncing) ? 'rgba(249,115,22,0.25)' : 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: (!desktopSyncFile || desktopSyncing) ? 'none' : '0 4px 20px rgba(249,115,22,0.35)', color: 'white' }}
                              >
                                {!desktopSyncing && desktopSyncFile && (<motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.8 }} />)}
                                <span className="relative flex items-center justify-center gap-2">
                                  {desktopSyncing ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing...</> : <><RefreshCw className="w-4 h-4" /> Sync ke R2</>}
                                </span>
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Conflict Dialog - When file changed during edit session */}
                  <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
                    <DialogContent className="sm:max-w-lg bg-white border-2 border-red-300 shadow-xl" aria-describedby={undefined}>
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
                                <strong>Terakhir diedit oleh:</strong><br />
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
                              <strong>Pilihan Anda:</strong><br />
                              • <strong>Force Overwrite:</strong> Timpa file dengan perubahan Anda (perubahan user lain akan hilang)<br />
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
                    <DialogContent className="sm:max-w-2xl bg-white border-2 border-orange-200 shadow-xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
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
                            <div className={`p - 4 rounded - lg ${diagnosticResult.success
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                              } `}>
                              <div className="flex items-center gap-3">
                                {diagnosticResult.success ? (
                                  <CheckCircle className="w-8 h-8 text-green-500" />
                                ) : (
                                  <XCircle className="w-8 h-8 text-red-500" />
                                )}
                                <div>
                                  <p className={`font - bold ${diagnosticResult.success ? 'text-green-800' : 'text-red-800'} `}>
                                    {diagnosticResult.success ? 'Semua Sistem Berfungsi!' : 'Terdapat Masalah'}
                                  </p>
                                  <p className={`text - sm ${diagnosticResult.success ? 'text-green-600' : 'text-red-600'} `}>
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
                                  className={`p - 3 rounded - lg border ${result.success
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'
                                    } `}
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
                                  <p className={`text - sm mt - 1 ${result.success ? 'text-green-700' : 'text-red-700'} `}>
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
                <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', border: '1px solid rgba(249,115,22,0.25)' }}>
                  {/* Header bar */}
                  <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}><Search className="w-3.5 h-3.5 text-white" /></div>
                      <span className="text-sm font-bold text-white">Filter &amp; Pencarian</span>
                      {(sopFilters.kategori !== 'SEMUA' || sopFilters.jenis !== 'SEMUA' || sopFilters.lingkup !== 'SEMUA' || sopFilters.status !== 'SEMUA' || sopFilters.tahun || searchInput) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white' }}>
                          {[sopFilters.kategori !== 'SEMUA', sopFilters.jenis !== 'SEMUA', sopFilters.lingkup !== 'SEMUA', sopFilters.status !== 'SEMUA', !!sopFilters.tahun, !!searchInput].filter(Boolean).length} aktif
                        </span>
                      )}
                    </div>
                    {(sopFilters.kategori !== 'SEMUA' || sopFilters.jenis !== 'SEMUA' || sopFilters.lingkup !== 'SEMUA' || sopFilters.status !== 'SEMUA' || sopFilters.tahun || searchInput) && (
                      <button onClick={() => { setSearchInput(''); setSopFilters({ kategori: 'SEMUA', jenis: 'SEMUA', lingkup: 'SEMUA', status: 'SEMUA', tahun: '', search: '' }); setSopPagination(p => ({ ...p, page: 1 })) }} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <X className="w-3 h-3" /> Reset Semua
                      </button>
                    )}
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Row 1: Search + Sort */}
                    <div className="flex flex-col md:flex-row gap-3">
                      {/* Search */}
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1.5">Pencarian</p>
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#f97316' }} />
                          <Input
                            placeholder="Cari judul dokumen..."
                            value={searchInput}
                            onChange={(e) => { setSearchInput(e.target.value); setSopPagination(p => ({ ...p, page: 1 })) }}
                            className="pl-10 pr-10 h-11 text-white placeholder:text-gray-500 text-sm font-medium rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.06)', border: searchInput ? '1.5px solid rgba(249,115,22,0.6)' : '1.5px solid rgba(255,255,255,0.1)', boxShadow: searchInput ? '0 0 12px rgba(249,115,22,0.2)' : 'none', outline: 'none' }}
                          />
                          {isSearching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 animate-spin" />}
                          {searchInput && !isSearching && (
                            <button onClick={() => { setSearchInput(''); setSopFilters(prev => ({ ...prev, search: '' })); setSopPagination(p => ({ ...p, page: 1 })) }} className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 hover:text-gray-300 transition-colors"><X className="w-4 h-4" /></button>
                          )}
                        </div>
                      </div>
                      {/* Sort */}
                      <div className="w-full md:w-56">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1.5">Urutkan</p>
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                          <SelectTrigger className="h-11 text-white rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
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

                    {/* Row 2: Filter chips */}
                    <div>
                      <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">Filter</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Kategori', value: sopFilters.kategori, key: 'kategori', options: ['SEMUA', ...KATEGORI_OPTIONS], onChange: (v: string) => setSopFilters({ ...sopFilters, kategori: v }) },
                          { label: 'Lingkup', value: sopFilters.lingkup, key: 'lingkup', options: ['SEMUA', ...LINGKUP_OPTIONS], onChange: (v: string) => setSopFilters({ ...sopFilters, lingkup: v }) },
                          { label: 'Jenis', value: sopFilters.jenis, key: 'jenis', options: ['SEMUA', ...JENIS_OPTIONS], onChange: (v: string) => setSopFilters({ ...sopFilters, jenis: v }) },
                          { label: 'Status', value: sopFilters.status, key: 'status', options: ['SEMUA', ...STATUS_OPTIONS], onChange: (v: string) => setSopFilters({ ...sopFilters, status: v }) },
                        ].map((f) => (
                          <div key={f.key} className="flex-1 min-w-[130px]">
                            <Select value={f.value} onValueChange={(v) => { f.onChange(v); setSopPagination(p => ({ ...p, page: 1 })) }}>
                              <SelectTrigger className="h-9 rounded-xl text-xs font-medium" style={{ background: f.value !== 'SEMUA' ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)', border: f.value !== 'SEMUA' ? '1.5px solid rgba(249,115,22,0.4)' : '1.5px solid rgba(255,255,255,0.08)', color: f.value !== 'SEMUA' ? '#fb923c' : '#9ca3af' }}>
                                <SelectValue placeholder={f.label} />
                              </SelectTrigger>
                              <SelectContent>
                                {f.options.map(o => <SelectItem key={o} value={o}>{o === 'SEMUA' ? `Semua ${f.label}` : o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                        {/* Tahun */}
                        <div className="flex-1 min-w-[110px]">
                          <Select value={sopFilters.tahun || 'SEMUA'} onValueChange={(v) => { setSopFilters({ ...sopFilters, tahun: v === 'SEMUA' ? '' : v }); setSopPagination(p => ({ ...p, page: 1 })) }}>
                            <SelectTrigger className="h-9 rounded-xl text-xs font-medium" style={{ background: sopFilters.tahun ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)', border: sopFilters.tahun ? '1.5px solid rgba(249,115,22,0.4)' : '1.5px solid rgba(255,255,255,0.08)', color: sopFilters.tahun ? '#fb923c' : '#9ca3af' }}>
                              <SelectValue placeholder="Tahun" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SEMUA">Semua Tahun</SelectItem>
                              {stats?.byTahun?.map(t => <SelectItem key={t.tahun} value={t.tahun.toString()}>{t.tahun}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Table */}
                <Card className="bg-white border-2 border-orange-200 shadow-xl overflow-hidden">
                  <CardContent className="p-0 relative">
                    {/* Loading Overlay */}
                    {katalogLoading && (
                      <div className="absolute top-0 inset-x-0 h-1 z-10 overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 animate-sync-progress" />
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-orange-500 to-yellow-500">
                            <TableHead className="font-bold text-white">Judul</TableHead>
                            <TableHead className="font-bold text-white">Tahun</TableHead>
                            <TableHead className="font-bold text-white">Kategori</TableHead>
                            <TableHead className="font-bold text-white">Lingkup</TableHead>
                            <TableHead className="font-bold text-white">Jenis</TableHead>
                            <TableHead className="font-bold text-white">Status</TableHead>
                            <TableHead className="font-bold text-white text-center">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sopFiles.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                Tidak ada data
                              </TableCell>
                            </TableRow>
                          ) : (
                            sopFiles.map((sop) => (
                              <TableRow
                                key={sop.id}
                                className="hover:bg-orange-50 border-b border-gray-200"
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <FileTypeIcon fileName={sop.fileName} className="w-5 h-5 flex-shrink-0" />
                                    <div>
                                      <div className="text-xs text-orange-500 font-medium">No. SOP : {sop.nomorSop || '...'}</div>
                                      <div className="text-gray-800">{sop.judul}</div>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        <span className="text-gray-400">Upload:</span> {new Date(sop.uploadedAt).toLocaleString('id-ID', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                      {sop.updatedAt && new Date(sop.updatedAt).getTime() !== new Date(sop.uploadedAt).getTime() && (
                                        <div className="text-xs text-amber-600 mt-0.5">
                                          <span className="text-amber-500">Terakhir diubah:</span> {new Date(sop.updatedAt).toLocaleString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-600">{sop.tahun}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-orange-500 bg-orange-50 text-orange-700">{sop.kategori}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-700">{sop.lingkup || '-'}</Badge>
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
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => handlePreview(sop.id)} title="Preview" className="hover:bg-cyan-500/20" disabled={previewLoading === sop.id}>
                                      {previewLoading === sop.id ? (
                                        <div className="relative">
                                          <motion.div
                                            className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                          />
                                          <motion.div
                                            className="absolute inset-0 w-4 h-4 border-2 border-yellow-400 border-b-transparent rounded-full"
                                            animate={{ rotate: -360 }}
                                            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                                          />
                                        </div>
                                      ) : (
                                        <Eye className="w-4 h-4 text-cyan-400" />
                                      )}
                                    </Button>
                                    {(user?.role === 'ADMIN' || user?.role === 'DEVELOPER') && (
                                      <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(sop.id)} title="Edit" className="hover:bg-orange-500/20">
                                        <Edit className="w-4 h-4 text-orange-400" />
                                      </Button>
                                    )}
                                    <Button size="icon" variant="ghost" onClick={() => handleDownload(sop.id)} title="Download" className="hover:bg-green-500/20" disabled={downloadLoading === sop.id}>
                                      {downloadLoading === sop.id ? (
                                        <div className="relative">
                                          <motion.div
                                            className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                          />
                                          <motion.div
                                            className="absolute inset-0 w-4 h-4 border-2 border-orange-400 border-b-transparent rounded-full"
                                            animate={{ rotate: -360 }}
                                            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                                          />
                                        </div>
                                      ) : (
                                        <Download className="w-4 h-4 text-green-400" />
                                      )}
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handlePrint(sop.id)} title="Print" className="hover:bg-gray-500/20" disabled={printLoading === sop.id}>
                                      {printLoading === sop.id ? (
                                        <div className="relative">
                                          <motion.div
                                            className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                          />
                                          <motion.div
                                            className="absolute inset-0 w-4 h-4 border-2 border-orange-400 border-b-transparent rounded-full"
                                            animate={{ rotate: -360 }}
                                            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                                          />
                                        </div>
                                      ) : (
                                        <Printer className="w-4 h-4 text-gray-400" />
                                      )}
                                    </Button>
                                    {(user?.role === 'ADMIN' || user?.role === 'DEVELOPER') && ['xlsx', 'xls', 'xlsm', 'docx', 'doc', 'pdf'].includes(sop.fileType || '') && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className={`hover:${sop.fileType === 'pdf' ? 'bg-red-100' : 'bg-green-100'} `}
                                        onClick={() => handleDesktopEdit(sop.id)}
                                        title={sop.fileType === 'pdf' ? 'Edit Desktop (PDF tidak bisa di-edit)' : `Edit di Desktop(${sop.fileType?.toUpperCase() || 'File'})`}
                                      >
                                        {sop.fileType === 'pdf' ? (
                                          <FileIcon className="w-4 h-4 text-red-500" />
                                        ) : ['docx', 'doc'].includes(sop.fileType || '') ? (
                                          <FileText className="w-4 h-4 text-blue-600" />
                                        ) : (
                                          <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                        )}
                                      </Button>
                                    )}
                                    {(user?.role === 'ADMIN' || user?.role === 'DEVELOPER') && desktopEditSessionToken && (
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
                                    {(user?.role === 'ADMIN' || user?.role === 'DEVELOPER') && (
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
                      disabled={sopPagination.page <= 1 || katalogLoading}
                      onClick={() => setSopPagination(p => ({ ...p, page: p.page - 1 }))}
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-400">Halaman {sopPagination.page} dari {sopPagination.totalPages || 1}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sopPagination.page >= sopPagination.totalPages || katalogLoading}
                      onClick={() => setSopPagination(p => ({ ...p, page: p.page + 1 }))}
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Other pages - Verifikasi, Arsip, Logs, Users */}
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
                </div>

                {/* Search and Filter Bar */}
                <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', border: '1px solid rgba(249,115,22,0.25)' }}>
                  <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}><Search className="w-3.5 h-3.5 text-white" /></div>
                      <span className="text-sm font-bold text-white">Filter &amp; Pencarian</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap items-end gap-3">
                      {/* Search */}
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1.5">Cari</p>
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#f97316' }} />
                          <Input
                            placeholder="Cari judul, nama, email..."
                            value={verificationSearch}
                            onChange={(e) => setVerificationSearch(e.target.value)}
                            className="pl-10 h-10 text-white placeholder:text-gray-500 text-sm rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.06)', border: verificationSearch ? '1.5px solid rgba(249,115,22,0.6)' : '1.5px solid rgba(255,255,255,0.1)', boxShadow: verificationSearch ? '0 0 10px rgba(249,115,22,0.2)' : 'none' }}
                          />
                        </div>
                      </div>
                      {/* Status */}
                      <div className="min-w-[140px]">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1.5">Status</p>
                        <Select value={verificationFilter} onValueChange={(v) => setVerificationFilter(v)}>
                          <SelectTrigger className="h-10 rounded-xl text-sm" style={{ background: verificationFilter !== 'SEMUA' ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)', border: verificationFilter !== 'SEMUA' ? '1.5px solid rgba(249,115,22,0.4)' : '1.5px solid rgba(255,255,255,0.1)', color: verificationFilter !== 'SEMUA' ? '#fb923c' : '#9ca3af' }}>
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
                      {/* Lingkup */}
                      <div className="min-w-[140px]">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1.5">Lingkup</p>
                        <Select value={verificationLingkupFilter} onValueChange={(v) => setVerificationLingkupFilter(v)}>
                          <SelectTrigger className="h-10 rounded-xl text-sm" style={{ background: verificationLingkupFilter !== 'SEMUA' ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)', border: verificationLingkupFilter !== 'SEMUA' ? '1.5px solid rgba(249,115,22,0.4)' : '1.5px solid rgba(255,255,255,0.1)', color: verificationLingkupFilter !== 'SEMUA' ? '#fb923c' : '#9ca3af' }}>
                            <SelectValue placeholder="Filter Lingkup" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SEMUA">Semua Lingkup</SelectItem>
                            {LINGKUP_OPTIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Sort */}
                      <div className="min-w-[140px]">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1.5">Urutkan</p>
                        <Select value={verificationSortBy} onValueChange={(v) => setVerificationSortBy(v as 'uploadedAt-desc' | 'uploadedAt-asc')}>
                          <SelectTrigger className="h-10 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="uploadedAt-desc">Terbaru</SelectItem>
                            <SelectItem value="uploadedAt-asc">Terlama</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard title="Total SOP Aktif" value={stats?.totalAktif || 0} icon={CheckCircle} color="orange" delay={0} />
                  <StatCard
                    title="Menunggu Verifikasi"
                    value={stats?.totalPublikMenunggu || 0}
                    icon={Clock}
                    color="yellow"
                    delay={0.1}
                    action={user?.role === 'DEVELOPER' ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-yellow-600 hover:bg-yellow-100 rounded-full"
                        onClick={() => handleResetStats('MENUNGGU')}
                        title="Reset Stats (Hapus Semua Menunggu)"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    ) : undefined}
                  />
                  <StatCard
                    title="Total Ditolak"
                    value={stats?.totalPublikDitolak || 0}
                    icon={XCircle}
                    color="red"
                    delay={0.2}
                    action={user?.role === 'DEVELOPER' ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-red-600 hover:bg-red-100 rounded-full"
                        onClick={() => handleResetStats('DITOLAK')}
                        title="Reset Stats (Hapus Semua Arsip)"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    ) : undefined}
                  />
                </div>

                {/* Verification Table */}
                <Card className="bg-white border-2 border-orange-200 shadow-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
                    <CardTitle className="text-lg">Daftar Pengajuan Publik</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 relative">
                    {/* Loading Overlay */}
                    {verifikasiLoading && (
                      <div className="absolute top-0 inset-x-0 h-1 z-10 overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 animate-sync-progress" />
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-orange-400 to-yellow-400">
                            <TableHead className="font-bold text-white">Pengirim</TableHead>
                            <TableHead className="font-bold text-white">Judul</TableHead>
                            <TableHead className="font-bold text-white">Jenis</TableHead>
                            <TableHead className="font-bold text-white">Kategori</TableHead>
                            <TableHead className="font-bold text-white">Lingkup</TableHead>
                            <TableHead className="font-bold text-white">Status</TableHead>
                            <TableHead className="font-bold text-white">Keterangan</TableHead>
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
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <FileTypeIcon fileName={sop.fileName} className="w-5 h-5 flex-shrink-0" />
                                    <div>
                                      <span className="font-semibold text-blue-900">{sop.judul}</span>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        <span className="text-gray-400">Upload:</span> {new Date(sop.uploadedAt).toLocaleString('id-ID', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                      {sop.verifiedAt && (
                                        <div className={`text - xs mt - 0.5 ${sop.verificationStatus === 'DISETUJUI' ? 'text-green-600' : 'text-red-600'
                                          } `}>
                                          <span className={sop.verificationStatus === 'DISETUJUI' ? 'text-green-500' : 'text-red-500'}>
                                            {sop.verificationStatus === 'DISETUJUI' ? 'Disetujui:' : 'Ditolak:'}
                                          </span> {new Date(sop.verifiedAt).toLocaleString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={sop.jenis === 'SOP' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'}>
                                    {sop.jenis}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-orange-500 bg-orange-50 text-orange-700">{sop.kategori}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-700">{sop.lingkup || '-'}</Badge>
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
                                <TableCell className="text-gray-600 text-sm max-w-[200px]">
                                  {sop.keterangan && (
                                    <span className="text-gray-700 block">Catatan: {sop.keterangan}</span>
                                  )}
                                  {sop.rejectionReason && (
                                    <span className="text-red-600 block">Alasan: {sop.rejectionReason}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => handleVerifikasiPreview(sop.id)} title="Preview" className="hover:bg-cyan-100" disabled={previewLoading === sop.id}>
                                      {previewLoading === sop.id ? (
                                        <div className="relative">
                                          <motion.div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                                          <motion.div className="absolute inset-0 w-4 h-4 border-2 border-blue-400 border-b-transparent rounded-full" animate={{ rotate: -360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
                                        </div>
                                      ) : (
                                        <Eye className="w-4 h-4 text-cyan-600" />
                                      )}
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleVerifikasiDownload(sop.id)} title="Download" className="hover:bg-green-100" disabled={downloadLoading === sop.id}>
                                      {downloadLoading === sop.id ? (
                                        <div className="relative">
                                          <motion.div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                                          <motion.div className="absolute inset-0 w-4 h-4 border-2 border-emerald-400 border-b-transparent rounded-full" animate={{ rotate: -360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
                                        </div>
                                      ) : (
                                        <Download className="w-4 h-4 text-green-600" />
                                      )}
                                    </Button>
                                    {sop.verificationStatus === 'MENUNGGU' && (
                                      <>
                                        <Button size="icon" variant="ghost" onClick={() => handleVerification(sop.id, 'DISETUJUI')} title="Setujui" className="hover:bg-green-100">
                                          <Check className="w-4 h-4 text-green-600" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleOpenRejectDialog(sop.id)} title="Tolak" className="hover:bg-red-100">
                                          <X className="w-4 h-4 text-red-600" />
                                        </Button>
                                        {/* Rejection Dialog - Moved inside Verifikasi page */}
                                        <Dialog open={showRejectDialog && rejectTargetId === sop.id} onOpenChange={(open) => {
                                          if (!open) {
                                            setShowRejectDialog(false)
                                            setRejectTargetId(null)
                                            setRejectReason('')
                                          }
                                        }}>
                                          <DialogContent className="sm:max-w-md bg-gradient-to-b from-slate-900 to-slate-800 border-2 border-orange-500 shadow-2xl" aria-describedby={undefined}>
                                            <DialogHeader>
                                              <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                                                  <XCircle className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                  <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                                                    Tolak Pengajuan
                                                  </span>
                                                  <p className="text-xs text-gray-400 font-normal mt-0.5">BCC - SOP Katalog</p>
                                                </div>
                                              </DialogTitle>
                                              <DialogDescription className="text-gray-300 pt-2">
                                                Masukkan alasan penolakan untuk pengajuan ini. Alasan akan ditampilkan kepada pengaju.
                                              </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4">
                                              <Label className="font-medium text-orange-400 mb-2 block flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Alasan Penolakan
                                              </Label>
                                              <Textarea
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                placeholder="Contoh: Dokumen tidak lengkap, format tidak sesuai, dll..."
                                                rows={4}
                                                className="border-2 border-orange-500/30 bg-slate-800/50 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg"
                                              />
                                            </div>
                                            <DialogFooter className="gap-2">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                  setShowRejectDialog(false)
                                                  setRejectTargetId(null)
                                                  setRejectReason('')
                                                }}
                                                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                                              >
                                                Batal
                                              </Button>
                                              <Button
                                                type="button"
                                                onClick={handleConfirmReject}
                                                disabled={!rejectReason.trim()}
                                                className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 hover:from-orange-600 hover:via-red-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                                              >
                                                <X className="w-4 h-4 mr-2" />
                                                Tolak Pengajuan
                                              </Button>
                                            </DialogFooter>
                                          </DialogContent>
                                        </Dialog>
                                      </>
                                    )}
                                    {user?.role === 'DEVELOPER' && (
                                      <Button size="icon" variant="ghost" onClick={() => handleDeleteSop(sop.id, sop.judul)} title="Hapus Permanen (Dev)" className="hover:bg-red-100">
                                        <Trash2 className="w-4 h-4 text-red-600" />
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
                <div className="flex items-center justify-between mt-4 bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
                  <p className="text-sm text-blue-900 font-medium">
                    Menampilkan <span className="text-orange-600 font-bold">{verificationList.length}</span> dari <span className="text-orange-600 font-bold">{verificationPagination.total}</span> pengajuan
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={verificationPagination.page === 1 || verifikasiLoading}
                      onClick={() => setVerificationPagination(p => ({ ...p, page: p.page - 1 }))}
                      className="border-orange-300 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                    </Button>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-orange-200">
                      <span className="text-sm font-bold text-orange-600">{verificationPagination.page}</span>
                      <span className="text-xs text-gray-400">/</span>
                      <span className="text-sm font-medium text-gray-600">{verificationPagination.totalPages || 1}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={verificationPagination.page >= verificationPagination.totalPages || verifikasiLoading}
                      onClick={() => setVerificationPagination(p => ({ ...p, page: p.page + 1 }))}
                      className="border-orange-300 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </motion.div >
            )
            }

            {/* Arsip Page */}
            {
              currentPage === 'arsip' && (
                <motion.div
                  key="arsip"
                  variants={fadeInUp}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <ShimmerTitle subtitle="File yang ditolak dari pengajuan publik">Arsip File Ditolak</ShimmerTitle>
                  </div>

                  {/* Search Bar */}
                  <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #1e1015 50%, #1a0a0a 100%)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <div className="flex items-center gap-2 px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}><Search className="w-3.5 h-3.5 text-white" /></div>
                      <span className="text-sm font-bold text-white">Filter &amp; Pencarian</span>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap items-end gap-3">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5">Cari</p>
                          <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#f87171' }} />
                            <Input
                              placeholder="Cari judul, nama, email..."
                              value={arsipSearch}
                              onChange={(e) => setArsipSearch(e.target.value)}
                              className="pl-10 h-10 text-white placeholder:text-gray-500 text-sm rounded-xl"
                              style={{ background: 'rgba(255,255,255,0.06)', border: arsipSearch ? '1.5px solid rgba(239,68,68,0.6)' : '1.5px solid rgba(255,255,255,0.1)', boxShadow: arsipSearch ? '0 0 10px rgba(239,68,68,0.2)' : 'none' }}
                            />
                          </div>
                        </div>
                        {/* Lingkup */}
                        <div className="min-w-[140px]">
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5">Lingkup</p>
                          <Select value={arsipLingkupFilter} onValueChange={(v) => setArsipLingkupFilter(v)}>
                            <SelectTrigger className="h-10 rounded-xl text-sm" style={{ background: arsipLingkupFilter !== 'SEMUA' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', border: arsipLingkupFilter !== 'SEMUA' ? '1.5px solid rgba(239,68,68,0.4)' : '1.5px solid rgba(255,255,255,0.1)', color: arsipLingkupFilter !== 'SEMUA' ? '#fca5a5' : '#9ca3af' }}>
                              <SelectValue placeholder="Filter Lingkup" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SEMUA">Semua Lingkup</SelectItem>
                              {LINGKUP_OPTIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Sort */}
                        <div className="min-w-[140px]">
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5">Urutkan</p>
                          <Select value={arsipSortBy} onValueChange={(v) => setArsipSortBy(v as 'uploadedAt-desc' | 'uploadedAt-asc')}>
                            <SelectTrigger className="h-10 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="uploadedAt-desc">Terbaru</SelectItem>
                              <SelectItem value="uploadedAt-asc">Terlama</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  < div className="grid grid-cols-1 md:grid-cols-2 gap-4" >
                    <StatCard
                      title="Total File Ditolak"
                      value={arsipList.length}
                      icon={XCircle}
                      color="red"
                      delay={0}
                      action={user?.role === 'DEVELOPER' ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-600 hover:bg-red-100 rounded-full"
                          onClick={() => handleResetStats('DITOLAK')}
                          title="Reset Stats (Hapus Semua Arsip)"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      ) : undefined}
                    />
                    <StatCard title="Folder Arsip" value="Publik-Ditolak" icon={FolderOpen} color="orange" delay={0.1} />
                  </div >

                  {/* Arsip Table */}
                  < Card className="bg-white border-2 border-orange-200 shadow-xl overflow-hidden" >
                    <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
                      <CardTitle className="text-lg">Daftar File Ditolak</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 relative">
                      {/* Loading Overlay */}
                      {arsipLoading && (
                        <div className="absolute top-0 inset-x-0 h-1 z-10 overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-r from-red-400 via-orange-400 to-red-400 animate-sync-progress" />
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-to-r from-red-400 to-orange-400">
                              <TableHead className="font-bold text-white">Pengirim</TableHead>
                              <TableHead className="font-bold text-white">Judul</TableHead>
                              <TableHead className="font-bold text-white">Jenis</TableHead>
                              <TableHead className="font-bold text-white">Kategori</TableHead>
                              <TableHead className="font-bold text-white">Lingkup</TableHead>
                              <TableHead className="font-bold text-white">Alasan Penolakan</TableHead>
                              <TableHead className="font-bold text-white text-center">Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {arsipList.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                                  <div className="flex flex-col items-center gap-2">
                                    <FolderOpen className="w-12 h-12 text-gray-400" />
                                    <p>Tidak ada file di arsip</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              arsipList.map((sop) => (
                                <TableRow key={sop.id} className="hover:bg-red-50 border-b border-gray-200">
                                  <TableCell>
                                    <div>
                                      <p className="font-semibold text-blue-900">{sop.submitterName}</p>
                                      <p className="text-sm text-gray-600">{sop.submitterEmail}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <FileTypeIcon fileName={sop.fileName} className="w-5 h-5 flex-shrink-0" />
                                      <div>
                                        <span className="font-semibold text-blue-900">{sop.judul}</span>
                                        {sop.verifiedAt && (
                                          <div className="text-xs text-red-600 mt-0.5">
                                            <span className="text-red-500">Ditolak:</span> {new Date(sop.verifiedAt).toLocaleString('id-ID', {
                                              day: 'numeric',
                                              month: 'short',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={sop.jenis === 'SOP' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'}>
                                      {sop.jenis}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="border-orange-500 bg-orange-50 text-orange-700">{sop.kategori}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-700">{sop.lingkup || '-'}</Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-600 text-sm max-w-[200px]">
                                    {sop.keterangan && (
                                      <span className="text-gray-700 block">Catatan: {sop.keterangan}</span>
                                    )}
                                    <span className="text-red-600 block">Alasan: {sop.rejectionReason || 'Tidak ada alasan'}</span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-center gap-1">
                                      <Button size="icon" variant="ghost" onClick={() => handleVerifikasiPreview(sop.id)} title="Preview" className="hover:bg-cyan-100" disabled={previewLoading === sop.id}>
                                        {previewLoading === sop.id ? (
                                          <div className="relative">
                                            <motion.div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                                            <motion.div className="absolute inset-0 w-4 h-4 border-2 border-blue-400 border-b-transparent rounded-full" animate={{ rotate: -360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
                                          </div>
                                        ) : (
                                          <Eye className="w-4 h-4 text-cyan-600" />
                                        )}
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={() => handleVerifikasiDownload(sop.id)} title="Download" className="hover:bg-green-100" disabled={downloadLoading === sop.id}>
                                        {downloadLoading === sop.id ? (
                                          <div className="relative">
                                            <motion.div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                                            <motion.div className="absolute inset-0 w-4 h-4 border-2 border-emerald-400 border-b-transparent rounded-full" animate={{ rotate: -360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
                                          </div>
                                        ) : (
                                          <Download className="w-4 h-4 text-green-600" />
                                        )}
                                      </Button>
                                      {user?.role === 'DEVELOPER' && (
                                        <Button size="icon" variant="ghost" onClick={() => handleDeleteSop(sop.id, sop.judul)} title="Hapus Permanen (Dev)" className="hover:bg-red-100">
                                          <Trash2 className="w-4 h-4 text-red-600" />
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
                  </Card >

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
                    <p className="text-sm text-blue-900 font-medium">
                      Menampilkan <span className="text-red-600 font-bold">{arsipList.length}</span> dari <span className="text-red-600 font-bold">{arsipPagination.total}</span> file ditolak
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={arsipPagination.page === 1 || arsipLoading}
                        onClick={() => setArsipPagination(p => ({ ...p, page: p.page - 1 }))}
                        className="border-red-300 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                      </Button>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-red-200">
                        <span className="text-sm font-bold text-red-600">{arsipPagination.page}</span>
                        <span className="text-xs text-gray-400">/</span>
                        <span className="text-sm font-medium text-gray-600">{arsipPagination.totalPages || 1}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={arsipPagination.page >= arsipPagination.totalPages || arsipLoading}
                        onClick={() => setArsipPagination(p => ({ ...p, page: p.page + 1 }))}
                        className="border-red-300 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </motion.div >
              )
            }

            {
              currentPage === 'logs' && (
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
                                      <span className="text-sm text-orange-600 font-medium truncate max-w-[200px] block">{log.sopFile.judul}</span>
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
              )
            }

            {
              currentPage === 'users' && (user?.role === 'DEVELOPER' || user?.role === 'ADMIN') && (
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
                      <DialogContent className="sm:max-w-md bg-white border-2 border-orange-200 shadow-xl p-0 overflow-hidden" aria-describedby={undefined}>
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
                              autoComplete="new-password"
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
                                <SelectItem value="DEVELOPER">Developer</SelectItem>
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
                      <DialogContent className="sm:max-w-md bg-white border-2 border-orange-200 shadow-xl" aria-describedby={undefined}>
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
                                {['docx', 'doc'].includes(excelEditData.fileType || '') ? (
                                  <FileText className="w-10 h-10 text-blue-600 mt-1" />
                                ) : (
                                  <FileSpreadsheet className="w-10 h-10 text-green-600 mt-1" />
                                )}
                                <div>
                                  <p className="font-bold text-gray-900">{excelEditData.fileName}</p>
                                  <p className="text-sm text-gray-600">{excelEditData.judul}</p>
                                </div>
                              </div>
                            </div>

                            {/* Session Info */}
                            {desktopEditSessionToken && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-800">
                                  <strong>Session aktif:</strong> Tanpa batas waktu
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
                                  accept=".xlsx,.xls,.xlsm,.docx,.doc"
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
                                        Format: .xlsx, .xls, .xlsm, .docx, .doc
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
                      <DialogContent className="sm:max-w-2xl bg-white border-2 border-orange-200 shadow-xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
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
                              <div className={`p - 4 rounded - lg ${diagnosticResult.success
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                                } `}>
                                <div className="flex items-center gap-3">
                                  {diagnosticResult.success ? (
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                  ) : (
                                    <XCircle className="w-8 h-8 text-red-500" />
                                  )}
                                  <div>
                                    <p className={`font - bold ${diagnosticResult.success ? 'text-green-800' : 'text-red-800'} `}>
                                      {diagnosticResult.success ? 'Semua Sistem Berfungsi!' : 'Terdapat Masalah'}
                                    </p>
                                    <p className={`text - sm ${diagnosticResult.success ? 'text-green-600' : 'text-red-600'} `}>
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
                                    className={`p - 3 rounded - lg border ${result.success
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-red-50 border-red-200'
                                      } `}
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
                                    <p className={`text - sm mt - 1 ${result.success ? 'text-green-700' : 'text-red-700'} `}>
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
                            {usersIncludePassword && (
                              <TableHead className="font-bold text-white">Password</TableHead>
                            )}
                            <TableHead className="font-bold text-white">Role</TableHead>
                            <TableHead className="font-bold text-white">Terakhir Login</TableHead>
                            <TableHead className="font-bold text-white">Aktivitas</TableHead>
                            <TableHead className="font-bold text-white text-center">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={usersIncludePassword ? 7 : 6} className="text-center text-gray-500 py-8">
                                Tidak ada user
                              </TableCell>
                            </TableRow>
                          ) : (
                            users.map((u) => {
                              const userWithExtra = u as User & { lastLoginAt?: string; _count?: { logs: number }; password?: string }
                              // Only DEVELOPER can delete ADMIN and DEVELOPER users
                              const canDelete = user?.role === 'DEVELOPER' || (user?.role === 'ADMIN' && u.role === 'STAF')
                              return (
                                <TableRow key={u.id} className="hover:bg-orange-50 border-b border-gray-200">
                                  <TableCell className="font-semibold text-blue-900">{u.name}</TableCell>
                                  <TableCell className="text-gray-700">{u.email}</TableCell>
                                  {usersIncludePassword && (
                                    <TableCell className="text-gray-600 font-mono text-sm bg-gray-50">
                                      {userWithExtra.password || '-'}
                                    </TableCell>
                                  )}
                                  <TableCell>
                                    <Badge className={u.role === 'ADMIN' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : u.role === 'DEVELOPER' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white'}>
                                      {u.role}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {userWithExtra.lastLoginAt ? new Date(userWithExtra.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah login'}
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {userWithExtra._count?.logs || 0} aktivitas
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditUserData(userWithExtra)
                                          setEditUserForm({ name: u.name, email: u.email, role: u.role || 'STAF' })
                                          setShowEditUserDialog(true)
                                        }}
                                        className="hover:bg-orange-100"
                                        title="Edit User"
                                      >
                                        <Edit className="w-4 h-4 text-orange-500" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={async () => {
                                          setSelectedUserForActivity(u)
                                          try {
                                            const res = await fetch(`/ api / logs ? userId = ${u.id} `)
                                            const data = await res.json()
                                            setUserActivityLogs(data.data || [])
                                            setShowUserActivityDialog(true)
                                          } catch (error) {
                                            console.error('Error fetching user activity:', error)
                                          }
                                        }}
                                        className="hover:bg-cyan-100"
                                        title="Lihat Riwayat"
                                      >
                                        <History className="w-4 h-4 text-cyan-500" />
                                      </Button>
                                      {canDelete && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => handleDeleteUser(u.id)}
                                          className="hover:bg-red-100"
                                          title="Hapus User"
                                        >
                                          <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            }
          </AnimatePresence >
        </main >
      </div >

      {/* Edit User Dialog */}
      < Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog} >
        <DialogContent className="sm:max-w-md bg-white border-2 border-orange-200 shadow-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Edit className="w-5 h-5 text-orange-600" />
              Edit User
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Perbarui informasi user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-medium text-gray-700">Nama</Label>
              <Input
                value={editUserForm.name}
                onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                className="border-gray-300 bg-white text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medium text-gray-700">Email</Label>
              <Input
                value={editUserForm.email}
                onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                className="border-gray-300 bg-white text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medium text-gray-700">Role</Label>
              <Select value={editUserForm.role} onValueChange={(v) => setEditUserForm({ ...editUserForm, role: v })}>
                <SelectTrigger className="border-gray-300 bg-white text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="STAF">Staf</SelectItem>
                  <SelectItem value="DEVELOPER">Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditUserDialog(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!editUserData) return
                try {
                  const res = await fetch('/api/users', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: editUserData.id,
                      name: editUserForm.name,
                      email: editUserForm.email,
                      role: editUserForm.role
                    })
                  })
                  const data = await res.json()
                  if (data.error) {
                    toast({ title: 'Error', description: data.error, variant: 'destructive' })
                  } else {
                    toast({ title: '✅ Berhasil', description: 'User berhasil diperbarui!' })
                    setShowEditUserDialog(false)
                    fetchUsers()
                  }
                } catch (error) {
                  toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
                }
              }}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Password Change Dialog */}
      < Dialog open={showPasswordChangeDialog} onOpenChange={setShowPasswordChangeDialog} >
        <DialogContent className="sm:max-w-md bg-white border-2 border-orange-200 shadow-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              Ganti Password
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Ubah password akun Anda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-medium text-gray-700">Password Lama</Label>
              <Input
                type="password"
                value={passwordChangeForm.currentPassword}
                onChange={(e) => setPasswordChangeForm({ ...passwordChangeForm, currentPassword: e.target.value })}
                className="border-gray-300 bg-white text-gray-900"
                placeholder="Masukkan password lama"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medium text-gray-700">Password Baru</Label>
              <Input
                type="password"
                value={passwordChangeForm.newPassword}
                onChange={(e) => setPasswordChangeForm({ ...passwordChangeForm, newPassword: e.target.value })}
                className="border-gray-300 bg-white text-gray-900"
                placeholder="Masukkan password baru (min. 4 karakter)"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medium text-gray-700">Konfirmasi Password Baru</Label>
              <Input
                type="password"
                value={passwordChangeForm.confirmPassword}
                onChange={(e) => setPasswordChangeForm({ ...passwordChangeForm, confirmPassword: e.target.value })}
                className="border-gray-300 bg-white text-gray-900"
                placeholder="Konfirmasi password baru"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPasswordChangeDialog(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={passwordChangeLoading}
              onClick={async () => {
                // Validation
                if (!passwordChangeForm.currentPassword || !passwordChangeForm.newPassword || !passwordChangeForm.confirmPassword) {
                  toast({ title: 'Error', description: 'Semua field harus diisi', variant: 'destructive' })
                  return
                }
                if (passwordChangeForm.newPassword.length < 4) {
                  toast({ title: 'Error', description: 'Password baru minimal 4 karakter', variant: 'destructive' })
                  return
                }
                if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) {
                  toast({ title: 'Error', description: 'Konfirmasi password tidak cocok', variant: 'destructive' })
                  return
                }

                setPasswordChangeLoading(true)
                try {
                  const res = await fetch('/api/users/password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      currentPassword: passwordChangeForm.currentPassword,
                      newPassword: passwordChangeForm.newPassword
                    })
                  })
                  const data = await res.json()
                  if (data.error) {
                    toast({ title: 'Error', description: data.error, variant: 'destructive' })
                  } else {
                    toast({ title: '✅ Berhasil', description: 'Password berhasil diubah!' })
                    setShowPasswordChangeDialog(false)
                  }
                } catch (error) {
                  toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
                } finally {
                  setPasswordChangeLoading(false)
                }
              }}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
            >
              {passwordChangeLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
              ) : (
                'Simpan Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* User Activity Dialog */}
      < Dialog open={showUserActivityDialog} onOpenChange={setShowUserActivityDialog} >
        <DialogContent className="sm:max-w-2xl bg-white border-2 border-cyan-200 shadow-xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-600" />
              Riwayat Aktivitas: {selectedUserForActivity?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {selectedUserForActivity?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {userActivityLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p>Belum ada aktivitas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userActivityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-cyan-50 rounded-lg">
                    <div className="w-2 h-2 mt-2 rounded-full bg-cyan-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
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
                        <span className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{log.deskripsi}</p>
                      {log.sopFile && (
                        <p className="text-xs text-orange-600 mt-1">{log.sopFile.judul}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUserActivityDialog(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Glowing Footer - Bottom Left - Visible on all pages */}
      < motion.div
        className="fixed bottom-4 left-4 z-50"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="relative cursor-pointer" onClick={() => setShowCopyrightPopup(true)}>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-lg blur-md opacity-60 animate-pulse" />

          {/* Shimmer container */}
          <div className="relative px-4 py-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-lg border border-orange-500/30 overflow-hidden hover:border-orange-500/60 transition-colors">
            {/* Animated shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent animate-shimmer" />

            {/* Text with glow */}
            <p className="text-sm font-medium relative z-10">
              <span className="text-gray-400">© </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-400 animate-pulse font-bold hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 transition-all">
                FOE - 2026
              </span>
            </p>
          </div>
        </div>
      </motion.div >

      {/* PDF Edit Warning Dialog - Aesthetic Design */}
      < Dialog open={showPdfWarningDialog} onOpenChange={setShowPdfWarningDialog} >
        <DialogContent className="sm:max-w-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-red-500/50 shadow-2xl overflow-hidden" aria-describedby={undefined}>
          {/* Animated background effects */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Radar sweep */}
            <motion.div
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(239, 68, 68, 0.15) 30deg, transparent 60deg)'
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />

            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-red-400/50"
                style={{
                  left: `${10 + i * 15}% `,
                  top: `${20 + (i % 3) * 25}% `,
                }}
                animate={{
                  y: [-10, 10, -10],
                  opacity: [0.3, 0.7, 0.3]
                }}
                transition={{
                  duration: 2 + i * 0.3,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>

          <div className="relative z-10">
            <DialogHeader className="text-center pb-4">
              {/* Animated warning icon */}
              <motion.div
                className="mx-auto mb-4"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <div className="relative">
                  {/* Glow ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-500/30 blur-xl"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity
                    }}
                  />

                  {/* Icon container */}
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/50">
                    <FileIcon className="w-10 h-10 text-white" />
                  </div>

                  {/* X mark overlay */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="w-24 h-24 rounded-full border-4 border-red-400 flex items-center justify-center">
                      <XCircle className="w-12 h-12 text-red-400" />
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <DialogTitle className="text-2xl font-bold">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-300 to-red-400">
                  PDF Tidak Bisa Di-edit
                </span>
              </DialogTitle>

              <DialogDescription className="text-gray-400 text-sm mt-2">
                File PDF tidak mendukung fitur edit langsung
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Main message */}
              <motion.div
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-gray-300 text-sm leading-relaxed">
                  Format <span className="text-red-400 font-semibold">PDF (Portable Document Format)</span> didesain untuk distribusi dokumen yang sudah final, bukan untuk editing. Berbeda dengan file Excel atau Word, PDF tidak dapat dimodifikasi secara langsung.
                </p>
              </motion.div>

              {/* Solution cards */}
              <motion.div
                className="grid grid-cols-2 gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-xs font-semibold">EXCEL</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Upload ulang dalam format <span className="text-green-400">.xlsx</span> atau <span className="text-green-400">.xls</span>
                  </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 text-xs font-semibold">WORD</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Upload ulang dalam format <span className="text-blue-400">.docx</span> atau <span className="text-blue-400">.doc</span>
                  </p>
                </div>
              </motion.div>

              {/* Tip section */}
              <motion.div
                className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-amber-400 text-xs font-semibold mb-1">TIP</p>
                    <p className="text-gray-400 text-xs">
                      Jika Anda memiliki file asli sebelum dikonversi ke PDF, upload file tersebut untuk mengaktifkan fitur edit.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            <DialogFooter className="pt-4">
              <motion.div
                className="w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="button"
                  onClick={() => setShowPdfWarningDialog(false)}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-red-500/25"
                >
                  <X className="w-4 h-4 mr-2" />
                  Tutup
                </Button>
              </motion.div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog >


      {/* Copyright Popup */}
      < CopyrightPopup show={showCopyrightPopup} onClose={() => setShowCopyrightPopup(false)} />

      {/* Print Loading Dialog */}
      <PrintLoadingDialog
        open={showPrintDialog}
        onClose={handlePrintDialogClose}
        fileId={printDialogFileId}
        fileName={printDialogFileName}
        fileType={printDialogFileType}
        onComplete={handlePrintComplete}
      />
    </div >
  )
}
