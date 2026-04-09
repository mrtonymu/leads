export type LeadStatus = 'new' | 'contacted' | 'viewing' | 'closed' | 'dead';
export type TimelineType = 'note' | 'status_change' | 'whatsapp' | 'call' | 'system';

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  createdAt: string;
}

export interface TimelineEntry {
  id: string;
  leadId: string;
  type: TimelineType;
  content: string;
  createdAt: string;
}

export interface Template {
  id: string;
  title: string;
  content: string;
}

export interface Lead {
  id: string;
  eventId: string | null;
  name: string;
  phone: string;
  projectInterest: string;
  notes: string;
  tags: string[];
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}
