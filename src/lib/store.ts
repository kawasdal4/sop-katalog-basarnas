import { create } from 'zustand'

export type UserRole = 'ADMIN' | 'STAF' | null
export type PageView = 'dashboard' | 'katalog' | 'upload' | 'verifikasi' | 'logs' | 'users' | 'submit-publik'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AppState {
  // Auth
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
  
  // Navigation
  currentPage: PageView
  setCurrentPage: (page: PageView) => void
  
  // UI
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false, currentPage: 'dashboard' }),
  
  // Navigation
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  
  // UI
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
