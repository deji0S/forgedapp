import Button from '../components/ui/Button'

function Home() {
  return (
    <div className="space-y-6 p-4">
      <header>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Welcome back</p>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          Let's train
        </h1>
      </header>

      <section className="rounded-2xl bg-brand-500 p-5 text-white shadow-sm">
        <p className="text-sm font-medium text-brand-100">Today's workout</p>
        <h2 className="mt-1 text-xl font-semibold">Upper Body Strength</h2>
        <Button type="button" className="mt-4">
          Start workout
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">This week</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">
            4 workouts
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Streak</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">
            6 days
          </p>
        </div>
      </section>
    </div>
  )
}

export default Home
