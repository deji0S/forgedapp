import { Route, Routes } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import { RequireOnboarding } from './components/RouteGuards'
import AuthPage from './pages/auth/AuthPage'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Progress from './pages/Progress'
import ProfilePage from './pages/ProfilePage'
import Workouts from './pages/Workouts'
import WorkoutDetail from './pages/WorkoutDetail'

function AppShell() {
  return (
    <div className="flex-1 pb-20">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/workouts/:id" element={<WorkoutDetail />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

function App() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-neutral-950">
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/*"
          element={
            <RequireOnboarding>
              <AppShell />
            </RequireOnboarding>
          }
        />
      </Routes>
    </div>
  )
}

export default App
