import type { PublicProfile } from './profile'

export interface FollowState {
  isFollowing: boolean
  isFollowedBy: boolean
}

export type MessageMediaType = 'image' | 'video'

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  body: string | null
  media_path: string | null
  media_type: MessageMediaType | null
  media_mime: string | null
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
