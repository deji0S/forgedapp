const WORKOUTS = ['Push Day', 'Pull Day', 'Leg Day', 'Full Body']

function Workouts() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Workouts</h1>
      <ul className="space-y-3">
        {WORKOUTS.map((name) => (
          <li
            key={name}
            className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <p className="font-medium text-neutral-900 dark:text-white">{name}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Workouts
