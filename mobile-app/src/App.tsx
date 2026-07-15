import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import './index.css'
import AuthGuard from '@/components/AuthGuard'
import BottomNav from '@/components/BottomNav'

const LoginPage      = lazy(() => import('@/pages/LoginPage'))
const RegisterPage   = lazy(() => import('@/pages/RegisterPage'))
const HomePage       = lazy(() => import('@/pages/HomePage'))
const DetailPage     = lazy(() => import('@/pages/DetailPage'))
const AddPage        = lazy(() => import('@/pages/AddPage'))
const MovieAIPage    = lazy(() => import('@/pages/MovieAIPage'))
const ProfilePage    = lazy(() => import('@/pages/ProfilePage'))
const StorePage      = lazy(() => import('@/pages/StorePage'))

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedLayout() {
  return (
    <AuthGuard>
      <div className="flex flex-col h-full max-w-lg mx-auto relative">
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/home"                  element={<HomePage />} />
          <Route path="/recommendations/:id"   element={<DetailPage />} />
          <Route path="/add"                   element={<AddPage />} />
          <Route path="/movie-ai"              element={<MovieAIPage />} />
          <Route path="/profile"               element={<ProfilePage />} />
          <Route path="/store"                 element={<StorePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
