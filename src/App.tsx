import { Component, type ErrorInfo, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import i18n from './i18n'
import { LandingPage } from './features/landing/LandingPage'
import { RoomPage } from './features/room/RoomPage'
import { SoloPage } from './features/solo/SoloPage'
import { NoticeBanner } from './components/admin/NoticeBanner'
import { AdminLayout } from './features/admin/AdminLayout'
import { AdminLogin } from './features/admin/AdminLogin'
import { AdminDashboard } from './features/admin/AdminDashboard'
import { AdminRooms } from './features/admin/AdminRooms'
import { AdminNotices } from './features/admin/AdminNotices'
import { AdminSeo } from './features/admin/AdminSeo'
import { AdminSettings } from './features/admin/AdminSettings'
import { ToastViewport } from './components/ui/ToastViewport'

interface BoundaryState {
  failed: boolean
}

class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Paper Cricket crashed', error, info)
    }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center px-5 py-10">
        <div className="paper-card w-full max-w-md rounded-3xl p-6 text-center">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-pencil">Paper Cricket</p>
          <h1 className="font-hand text-3xl font-bold leading-tight text-ink-deep">{i18n.t('errors.boundary')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{i18n.t('errors.generic')}</p>
          <a href="/" className="btn-primary mt-5 w-full">
            {i18n.t('common.back')}
          </a>
          <button type="button" className="btn-ghost mt-2 w-full text-slate-500" onClick={() => this.setState({ failed: false })}>
            {i18n.t('common.retry')}
          </button>
        </div>
      </div>
    )
  }
}

function RootLayout() {
  const location = useLocation()
  return (
    <ErrorBoundary key={location.pathname}>
      <Outlet />
      <NoticeBanner />
      <ToastViewport />
    </ErrorBoundary>
  )
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/room/:code', element: <RoomPage /> },
      { path: '/solo', element: <SoloPage /> },
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'login', element: <AdminLogin /> },
          { path: 'rooms', element: <AdminRooms /> },
          { path: 'notices', element: <AdminNotices /> },
          { path: 'seo', element: <AdminSeo /> },
          { path: 'settings', element: <AdminSettings /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
