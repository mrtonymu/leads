import { supabase, isSupabaseConfigured } from './supabase';
import type { Event, Lead, LeadStatus, TimelineEntry, Project, Template, DayType, FollowUpDone } from '../types';

// ─── Helpers: snake_case ↔ camelCase mapping ───

function toEvent(row: Record<string, unknown>): Event {
  return {
    id: row.id as string,
    name: row.name as string,
    date: row.date as string || '',
    location: row.location as string || '',
    createdAt: row.created_at as string,
  };
}

function toLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    eventId: row.event_id as string | null,
    projectId: row.project_id as string | null,
    name: row.name as string,
    phone: row.phone as string,
    projectInterest: row.project_interest as string || '',
    notes: row.notes as string || '',
    tags: (row.tags as string[]) || [],
    status: row.status as LeadStatus,
    followUpDone: (row.follow_up_done as FollowUpDone) || { day0: false, day1: false, day3: false, day7: false },
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toTimeline(row: Record<string, unknown>): TimelineEntry {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    type: row.type as TimelineEntry['type'],
    content: row.content as string || '',
    createdAt: row.created_at as string,
  };
}

function toProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string || '',
    sellingPoints: (row.selling_points as string[]) || [],
    images: (row.images as string[]) || [],
    createdAt: row.created_at as string,
  };
}

function toTemplate(row: Record<string, unknown>): Template {
  return {
    id: row.id as string,
    projectId: row.project_id as string | null,
    dayType: row.day_type as DayType,
    title: row.title as string,
    content: row.content as string,
    imageUrl: row.image_url as string || '',
    sortOrder: row.sort_order as number || 0,
    createdAt: row.created_at as string,
  };
}

// ─── Events ───

export async function fetchEvents(): Promise<Event[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toEvent);
}

export async function createEvent(name: string, location: string, date: string): Promise<Event> {
  const { data, error } = await supabase.from('events').insert({ name, location, date: date || null }).select().single();
  if (error) throw error;
  return toEvent(data);
}

export async function deleteEventById(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

// ─── Leads ───

export async function fetchLeads(): Promise<Lead[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toLead);
}

export async function createLead(lead: {
  name: string;
  phone: string;
  eventId: string | null;
  projectId?: string | null;
  projectInterest: string;
  notes: string;
  status: LeadStatus;
}): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      name: lead.name,
      phone: lead.phone,
      event_id: lead.eventId || null,
      project_id: lead.projectId || null,
      project_interest: lead.projectInterest,
      notes: lead.notes,
      status: lead.status,
      tags: [],
      follow_up_done: { day0: false, day1: false, day3: false, day7: false },
    })
    .select()
    .single();
  if (error) throw error;
  return toLead(data);
}

export async function updateLeadById(id: string, updates: Partial<{
  name: string;
  phone: string;
  eventId: string | null;
  projectId: string | null;
  projectInterest: string;
  notes: string;
  status: LeadStatus;
  tags: string[];
  followUpDone: FollowUpDone;
}>): Promise<Lead> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.eventId !== undefined) dbUpdates.event_id = updates.eventId;
  if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
  if (updates.projectInterest !== undefined) dbUpdates.project_interest = updates.projectInterest;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  if (updates.followUpDone !== undefined) dbUpdates.follow_up_done = updates.followUpDone;

  const { data, error } = await supabase.from('leads').update(dbUpdates).eq('id', id).select().single();
  if (error) throw error;
  return toLead(data);
}

export async function deleteLeadById(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

// ─── Timeline ───

export async function fetchTimeline(): Promise<TimelineEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('timeline').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toTimeline);
}

export async function createTimelineEntry(leadId: string, type: string, content: string): Promise<TimelineEntry> {
  const { data, error } = await supabase
    .from('timeline')
    .insert({ lead_id: leadId, type, content })
    .select()
    .single();
  if (error) throw error;
  return toTimeline(data);
}

// ─── Projects ───

export async function fetchProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toProject);
}

export async function createProject(project: { name: string; description: string; sellingPoints: string[] }): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name: project.name, description: project.description, selling_points: project.sellingPoints, images: [] })
    .select()
    .single();
  if (error) throw error;
  return toProject(data);
}

export async function updateProjectById(id: string, updates: Partial<{
  name: string;
  description: string;
  sellingPoints: string[];
  images: string[];
}>): Promise<Project> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.sellingPoints !== undefined) dbUpdates.selling_points = updates.sellingPoints;
  if (updates.images !== undefined) dbUpdates.images = updates.images;

  const { data, error } = await supabase.from('projects').update(dbUpdates).eq('id', id).select().single();
  if (error) throw error;
  return toProject(data);
}

export async function deleteProjectById(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// ─── Templates ───

export async function fetchTemplates(): Promise<Template[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('templates').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(toTemplate);
}

export async function fetchTemplatesByProject(projectId: string): Promise<Template[]> {
  const { data, error } = await supabase.from('templates').select('*').eq('project_id', projectId).order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(toTemplate);
}

export async function createTemplate(template: {
  projectId: string;
  dayType: DayType;
  title: string;
  content: string;
  imageUrl?: string;
}): Promise<Template> {
  const { data, error } = await supabase
    .from('templates')
    .insert({
      project_id: template.projectId,
      day_type: template.dayType,
      title: template.title,
      content: template.content,
      image_url: template.imageUrl || '',
    })
    .select()
    .single();
  if (error) throw error;
  return toTemplate(data);
}

export async function updateTemplateById(id: string, updates: Partial<{
  title: string;
  content: string;
  imageUrl: string;
  dayType: DayType;
}>): Promise<Template> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.content !== undefined) dbUpdates.content = updates.content;
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
  if (updates.dayType !== undefined) dbUpdates.day_type = updates.dayType;

  const { data, error } = await supabase.from('templates').update(dbUpdates).eq('id', id).select().single();
  if (error) throw error;
  return toTemplate(data);
}

export async function deleteTemplateById(id: string): Promise<void> {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) throw error;
}

// ─── V1 Data Import ───

const isValidUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export async function importFromV1Export(data: {
  events: Array<{ id: string; name: string; date: string; location: string; createdAt: string }>;
  leads: Array<{ id: string; eventId: string | null; name: string; phone: string; projectInterest: string; notes: string; tags: string[]; status: string; createdAt: string; updatedAt: string }>;
  timeline: Array<{ id: string; leadId: string; type: string; content: string; createdAt: string }>;
  templates: Array<{ id: string; title: string; content: string }>;
}): Promise<{ events: number; leads: number; timeline: number; templates: number }> {
  // 1. Events (no FK dependencies)
  const dbEvents = data.events.map(e => ({
    id: e.id,
    name: e.name,
    date: e.date || null,
    location: e.location || '',
    created_at: e.createdAt,
  }));
  if (dbEvents.length > 0) {
    const { error } = await supabase.from('events').upsert(dbEvents, { onConflict: 'id' });
    if (error) throw new Error(`Events import failed: ${error.message}`);
  }

  // 2. Templates (skip non-UUID default templates like 't1', 't2', 't3')
  const dbTemplates = data.templates
    .filter(t => isValidUUID(t.id))
    .map((t, index) => ({
      id: t.id,
      project_id: null,
      day_type: 'custom' as const,
      title: t.title,
      content: t.content,
      image_url: '',
      sort_order: index,
      created_at: new Date().toISOString(),
    }));
  if (dbTemplates.length > 0) {
    const { error } = await supabase.from('templates').upsert(dbTemplates, { onConflict: 'id' });
    if (error) throw new Error(`Templates import failed: ${error.message}`);
  }

  // 3. Leads (FK → events)
  const dbLeads = data.leads.map(l => ({
    id: l.id,
    event_id: l.eventId || null,
    project_id: null,
    name: l.name,
    phone: l.phone,
    project_interest: l.projectInterest || '',
    notes: l.notes || '',
    tags: l.tags || [],
    status: l.status,
    follow_up_done: { day0: false, day1: false, day3: false, day7: false },
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  }));
  if (dbLeads.length > 0) {
    const { error } = await supabase.from('leads').upsert(dbLeads, { onConflict: 'id' });
    if (error) throw new Error(`Leads import failed: ${error.message}`);
  }

  // 4. Timeline (FK → leads)
  const dbTimeline = data.timeline.map(t => ({
    id: t.id,
    lead_id: t.leadId,
    type: t.type,
    content: t.content || '',
    created_at: t.createdAt,
  }));
  if (dbTimeline.length > 0) {
    const { error } = await supabase.from('timeline').upsert(dbTimeline, { onConflict: 'id' });
    if (error) throw new Error(`Timeline import failed: ${error.message}`);
  }

  return {
    events: dbEvents.length,
    leads: dbLeads.length,
    timeline: dbTimeline.length,
    templates: dbTemplates.length,
  };
}

// ─── Image Upload ───

export async function uploadProjectImage(projectId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `projects/${projectId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('project-images').upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from('project-images').getPublicUrl(path);
  return data.publicUrl;
}
