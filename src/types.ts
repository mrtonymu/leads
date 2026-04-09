export type LeadStatus = 'new' | 'contacted' | 'viewing' | 'closed' | 'dead';
export type TimelineType = 'note' | 'status_change' | 'whatsapp' | 'call' | 'system';
export type DayType = 'day0' | 'day1' | 'day3' | 'day7' | 'custom';

export interface FollowUpDone {
  day0: boolean;
  day1: boolean;
  day3: boolean;
  day7: boolean;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  sellingPoints: string[];
  images: string[];
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
  projectId: string | null;
  dayType: DayType;
  title: string;
  content: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
}

export interface Lead {
  id: string;
  eventId: string | null;
  projectId: string | null;
  name: string;
  phone: string;
  projectInterest: string;
  notes: string;
  tags: string[];
  status: LeadStatus;
  followUpDone: FollowUpDone;
  createdAt: string;
  updatedAt: string;
}

// Helper: get calendar day difference (local timezone)
export function getCalendarDaysDiff(createdAt: string): number {
  const now = new Date();
  const created = new Date(createdAt);
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const createdLocal = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  return Math.round((todayLocal.getTime() - createdLocal.getTime()) / (1000 * 60 * 60 * 24));
}

// Helper: calculate which day a lead is on (using local calendar days)
export function getLeadDayType(createdAt: string): DayType | null {
  const diffDays = getCalendarDaysDiff(createdAt);

  if (diffDays === 0) return 'day0';
  if (diffDays === 1) return 'day1';
  if (diffDays >= 2 && diffDays <= 3) return 'day3';
  if (diffDays >= 4 && diffDays <= 7) return 'day7';
  return null;
}

// Helper: display calendar day distance in Chinese
export function getCalendarDaysAgoText(createdAt: string): string {
  const diff = getCalendarDaysDiff(createdAt);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  if (diff <= 30) return `${diff}天前`;
  return `${Math.floor(diff / 30)}个月前`;
}

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  day0: 'Day 0 · 自我介绍',
  day1: 'Day 1 · 卖点跟进',
  day3: 'Day 3 · Call to Action',
  day7: 'Day 7 · Filter',
  custom: '自定义',
};

export const DAY_TYPE_COLORS: Record<DayType, string> = {
  day0: 'text-green-600 bg-green-50 border-green-200',
  day1: 'text-blue-600 bg-blue-50 border-blue-200',
  day3: 'text-amber-600 bg-amber-50 border-amber-200',
  day7: 'text-red-600 bg-red-50 border-red-200',
  custom: 'text-slate-600 bg-slate-50 border-slate-200',
};
