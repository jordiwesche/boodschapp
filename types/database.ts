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

export type ProductCategory = {
  id: string
  household_id: string
  name: string
  display_order: number
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  household_id: string
  emoji: string
  name: string
  description: string | null
  category_id: string
  is_basic: boolean
  is_popular: boolean
  created_at: string
  updated_at: string
}

export type ShoppingListItem = {
  id: string
  household_id: string
  product_id: string | null
  product_name: string | null
  quantity: string
  category_id: string
  is_checked: boolean
  checked_at: string | null
  added_by: string
  created_at: string
  updated_at: string
}

export type PurchaseHistory = {
  id: string
  household_id: string
  product_id: string
  shopping_list_item_id: string | null
  purchased_at: string
  added_by: string
  created_at: string
}

export type HouseholdInvitation = {
  id: string
  household_id: string
  email: string
  invited_by: string
  created_at: string
  accepted_at: string | null
}
