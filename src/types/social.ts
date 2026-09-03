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
