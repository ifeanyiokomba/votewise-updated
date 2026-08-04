export const ORG_CATEGORIES = [
  { value: "ORGANIZATION", label: "General Organization" },
  { value: "UNIVERSITY", label: "University / School" },
  { value: "COMPANY", label: "Company / Corporation" },
  { value: "COOPERATIVE", label: "Cooperative" },
  { value: "CHURCH", label: "Church / Religious Organization" },
  { value: "NGO", label: "NGO" },
  { value: "POLITICAL_PARTY", label: "Political Party" },
  { value: "ASSOCIATION", label: "Professional / Trade Association" },
  { value: "GOVERNMENT", label: "Government Institution" },
  { value: "CLUB", label: "Club / Society" },
  { value: "UNION", label: "Labour Union" },
  { value: "COMMUNITY", label: "Community Association" },
] as const;

export const ELECTION_STATUSES = {
  DRAFT: { label: "Draft", tone: "muted" },
  SCHEDULED: { label: "Scheduled", tone: "info" },
  LIVE: { label: "Live", tone: "success" },
  PAUSED: { label: "Paused", tone: "warning" },
  CLOSED: { label: "Closed", tone: "muted" },
  CERTIFIED: { label: "Certified", tone: "success" },
  ARCHIVED: { label: "Archived", tone: "muted" },
  CANCELLED: { label: "Cancelled", tone: "destructive" },
} as const;
