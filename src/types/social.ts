export interface FollowState {
  isFollowing: boolean
  isFollowedBy: boolean
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  created_at: string
}
