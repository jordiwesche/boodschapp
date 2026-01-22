export type User = {
  id: string
  email: string
  pin_hash: string
  first_name: string
  household_id: string | null
  created_at: string
  updated_at: string
}

export type Household = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export type HouseholdInvitation = {
  id: string
  household_id: string
  email: string
  invited_by: string
  created_at: string
  accepted_at: string | null
}
