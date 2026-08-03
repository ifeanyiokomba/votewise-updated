export const ORG_CATEGORIES = [
  { value: "UNIVERSITY", label: "University / School" },
  { value: "COMPANY", label: "Company" },
  { value: "COOPERATIVE", label: "Cooperative" },
  { value: "CHURCH", label: "Church / Faith body" },
  { value: "NGO", label: "NGO" },
  { value: "POLITICAL_PARTY", label: "Political party" },
  { value: "ASSOCIATION", label: "Association" },
  { value: "GOVERNMENT", label: "Government" },
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
