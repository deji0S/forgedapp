import { Route, Routes } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Progress from './pages/Progress'
import ProfilePage from './pages/ProfilePage'
import Workouts from './pages/Workouts'

function App() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-white dark:bg-neutral-950">
      <main className="flex-1 pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default App
