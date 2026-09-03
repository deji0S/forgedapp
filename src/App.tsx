import { Route, Routes } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import { RequireOnboarding } from './components/RouteGuards'
import AuthPage from './pages/auth/AuthPage'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Progress from './pages/Progress'
import ProfilePage from './pages/ProfilePage'
import Settings from './pages/Settings'
import Premium from './pages/Premium'
import Coach from './pages/Coach'
import Workouts from './pages/Workouts'
import WorkoutDetail from './pages/WorkoutDetail'
import Connect from './pages/Connect'
import PublicProfile from './pages/PublicProfile'
import FollowList from './pages/FollowList'
import Messages from './pages/Messages'
import Conversation from './pages/Conversation'

function AppShell() {
  return (
    <div className="flex-1 pb-20">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/workouts/:id" element={<WorkoutDetail />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/connect/:id" element={<PublicProfile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Conversation />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/followers" element={<FollowList kind="followers" />} />
        <Route path="/profile/following" element={<FollowList kind="following" />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

function App() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-black">
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
