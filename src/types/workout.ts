export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  weightKg?: number
}

export interface Workout {
  id: string
  name: string
  date: string
  exercises: Exercise[]
}
