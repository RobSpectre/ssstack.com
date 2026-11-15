export interface StackLink {
  id: number
  link: string
  title: string
  excerpt: string
  note: string
  cover: string
  domain: string
  /** Raindrop's type: link | article | image | video | document | audio */
  type: string
  tags: string[]
  /** ISO timestamp the link was saved (or back-dated to, for the Keep import) */
  created: string
}

export interface StackData {
  syncedAt: string
  links: StackLink[]
}

export interface StackWeek {
  /** YYYY-MM-DD of the Sunday this week's links were shared on */
  sunday: string
  links: StackLink[]
}
