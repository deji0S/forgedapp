import type { PublicProfile } from './profile'
import type { PlanExercise } from './tracking'

export interface FollowState {
  isFollowing: boolean
  isFollowedBy: boolean
}

export type MessageMediaType = 'image' | 'video'

export interface SharedWorkout {
  name: string
  exercises: PlanExercise[]
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  body: string | null
  media_path: string | null
  media_type: MessageMediaType | null
  media_mime: string | null
  shared_workout: SharedWorkout | null
  read_at: string | null
  created_at: string
}

export interface ConversationPreview {
  profile: PublicProfile
  lastMessage: Message
}

export interface ChatStreak {
  current_streak: number
  longest_streak: number
  last_joint_date: string | null
}

export type ReportReason = 'abuse' | 'harassment' | 'illegal_content' | 'other'

export interface BlockedUser {
  blockedId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
}
