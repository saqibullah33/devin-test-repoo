export type EventStatus = 'draft' | 'published' | 'completed' | 'cancelled';
export type EventRoleKind = 'judge' | 'volunteer' | 'speaker';
export type CertType =
  | 'participation'
  | 'winner'
  | 'runner_up'
  | 'volunteer'
  | 'speaker'
  | 'judge';
export type RegistrationStatus = 'registered' | 'waitlisted' | 'cancelled';
export type JoinRequestStatus = 'pending' | 'accepted' | 'declined';

export interface Profile {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string;
  headline: string;
  avatar_url: string | null;
  skills: string[];
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  slug: string;
  name: string;
  description: string;
  venue: string;
  starts_at: string | null;
  ends_at: string | null;
  capacity: number | null;
  status: EventStatus;
  organizer_id: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  event_id: string;
  body: string;
  created_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  status: RegistrationStatus;
  ticket_code: string;
  form_data: Record<string, string>;
  created_at: string;
}

export interface Checkin {
  event_id: string;
  user_id: string;
  checked_in_at: string;
  checked_in_by: string | null;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  description: string;
  looking_for: string[];
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  event_id: string;
  user_id: string;
  role_in_team: string;
  joined_at: string;
}

export interface JoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  message: string;
  status: JoinRequestStatus;
  created_at: string;
}

export interface Project {
  id: string;
  event_id: string;
  team_id: string;
  name: string;
  description: string;
  repo_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  image_url: string | null;
  technologies: string[];
  submitted_by: string;
  submitted_at: string;
}

export interface EventRole {
  event_id: string;
  user_id: string;
  role: EventRoleKind;
}

export interface Score {
  judge_id: string;
  project_id: string;
  innovation: number;
  ux: number;
  technical: number;
  impact: number;
  updated_at: string;
}

export interface Vote {
  event_id: string;
  project_id: string;
  voter_id: string;
  created_at: string;
}

export interface Certificate {
  id: string;
  event_id: string;
  user_id: string;
  type: CertType;
  cert_code: string;
  issued_at: string;
}
