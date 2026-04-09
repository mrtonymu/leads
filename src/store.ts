import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Event, Lead, LeadStatus, TimelineEntry, Template, TimelineType, Project, DayType, FollowUpDone } from './types';
import { isSupabaseConfigured } from './lib/supabase';
import * as db from './lib/db';

interface CRMState {
  // Data
  events: Event[];
  leads: Lead[];
  timeline: TimelineEntry[];
  templates: Template[];
  projects: Project[];

  // Loading
  isLoading: boolean;
  isInitialized: boolean;

  // Init
  initialize: () => Promise<void>;

  // Events
  addEvent: (name: string, location: string, date: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // Leads
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'tags' | 'followUpDone'>) => Promise<void>;
  updateLeadStatus: (id: string, status: LeadStatus) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addLeadTag: (id: string, tag: string) => Promise<void>;
  removeLeadTag: (id: string, tag: string) => Promise<void>;
  markFollowUpDone: (id: string, dayType: 'day0' | 'day1' | 'day3' | 'day7') => Promise<void>;

  // Timeline
  addTimelineEntry: (leadId: string, type: TimelineType, content: string) => Promise<void>;

  // Projects
  addProject: (project: { name: string; description: string; sellingPoints: string[] }) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Templates
  addTemplate: (template: { projectId: string; dayType: DayType; title: string; content: string; imageUrl?: string }) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<Template>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

const DEFAULT_TEMPLATES: Template[] = [
  { id: 't1', projectId: null, dayType: 'day0', title: '展会初次打招呼', content: 'Hi {{name}} 你好！我是昨天在 {{event}} 跟你聊过 {{project}} 的地产经纪。这是我的电子名片，想跟你跟进一下你的需求...', imageUrl: '', sortOrder: 0, createdAt: new Date().toISOString() },
  { id: 't2', projectId: null, dayType: 'day1', title: '发送资料', content: 'Hi {{name}}，这是你感兴趣的 {{project}} 的 E-brochure 和户型图，请查收。如果有任何问题随时找我！', imageUrl: '', sortOrder: 1, createdAt: new Date().toISOString() },
  { id: 't3', projectId: null, dayType: 'day3', title: '邀约看房', content: 'Hi {{name}}，周末好！{{project}} 的 Showroom 已经开放了，这周末你有空过来看看吗？我可以帮你安排 VIP 参观。', imageUrl: '', sortOrder: 2, createdAt: new Date().toISOString() },
];

export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      events: [],
      leads: [],
      timeline: [],
      templates: DEFAULT_TEMPLATES,
      projects: [],
      isLoading: false,
      isInitialized: false,

      initialize: async () => {
        if (!isSupabaseConfigured()) {
          set({ isInitialized: true });
          return;
        }
        // Always fetch fresh data from Supabase on each page load
        if (get().isInitialized) return;

        set({ isLoading: true });
        try {
          const [events, leads, timeline, templates, projects] = await Promise.all([
            db.fetchEvents(),
            db.fetchLeads(),
            db.fetchTimeline(),
            db.fetchTemplates(),
            db.fetchProjects(),
          ]);
          set({
            events,
            leads,
            timeline,
            templates: templates.length > 0 ? templates : DEFAULT_TEMPLATES,
            projects,
            isInitialized: true,
            isLoading: false,
          });
        } catch (err) {
          console.error('Failed to initialize from Supabase:', err);
          set({ isInitialized: true, isLoading: false });
        }
      },

      // ─── Events ───

      addEvent: async (name, location, date) => {
        if (isSupabaseConfigured()) {
          try {
            const event = await db.createEvent(name, location, date);
            set((s) => ({ events: [event, ...s.events] }));
            return;
          } catch (err) { console.error(err); }
        }
        set((s) => ({
          events: [{ id: uuidv4(), name, location, date, createdAt: new Date().toISOString() }, ...s.events],
        }));
      },

      deleteEvent: async (id) => {
        if (isSupabaseConfigured()) {
          try { await db.deleteEventById(id); } catch (err) { console.error(err); }
        }
        set((s) => ({
          events: s.events.filter((e) => e.id !== id),
          leads: s.leads.map((l) => (l.eventId === id ? { ...l, eventId: null } : l)),
        }));
      },

      // ─── Leads ───

      addLead: async (leadData) => {
        if (isSupabaseConfigured()) {
          try {
            const lead = await db.createLead(leadData);
            await db.createTimelineEntry(lead.id, 'system', '录入新客户');
            const entry = { id: uuidv4(), leadId: lead.id, type: 'system' as TimelineType, content: '录入新客户', createdAt: new Date().toISOString() };
            set((s) => ({ leads: [lead, ...s.leads], timeline: [entry, ...s.timeline] }));
            return;
          } catch (err) { console.error(err); }
        }
        const newLeadId = uuidv4();
        set((s) => ({
          leads: [
            { ...leadData, id: newLeadId, tags: [], followUpDone: { day0: false, day1: false, day3: false, day7: false }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            ...s.leads,
          ],
          timeline: [
            { id: uuidv4(), leadId: newLeadId, type: 'system', content: '录入新客户', createdAt: new Date().toISOString() },
            ...s.timeline,
          ],
        }));
      },

      updateLeadStatus: async (id, status) => {
        const lead = get().leads.find((l) => l.id === id);
        if (!lead || lead.status === status) return;

        if (isSupabaseConfigured()) {
          try {
            await db.updateLeadById(id, { status });
            await db.createTimelineEntry(id, 'status_change', `状态更新为: ${status}`);
          } catch (err) { console.error(err); }
        }
        set((s) => ({
          leads: s.leads.map((l) => l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l),
          timeline: [
            { id: uuidv4(), leadId: id, type: 'status_change', content: `状态更新为: ${status}`, createdAt: new Date().toISOString() },
            ...s.timeline,
          ],
        }));
      },

      updateLead: async (id, updates) => {
        if (isSupabaseConfigured()) {
          try { await db.updateLeadById(id, updates); } catch (err) { console.error(err); }
        }
        set((s) => ({
          leads: s.leads.map((l) => l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l),
        }));
      },

      deleteLead: async (id) => {
        if (isSupabaseConfigured()) {
          try { await db.deleteLeadById(id); } catch (err) { console.error(err); }
        }
        set((s) => ({
          leads: s.leads.filter((l) => l.id !== id),
          timeline: s.timeline.filter((t) => t.leadId !== id),
        }));
      },

      addLeadTag: async (id, tag) => {
        const lead = get().leads.find((l) => l.id === id);
        if (!lead || lead.tags.includes(tag)) return;
        const newTags = [...lead.tags, tag];
        if (isSupabaseConfigured()) {
          try { await db.updateLeadById(id, { tags: newTags }); } catch (err) { console.error(err); }
        }
        set((s) => ({
          leads: s.leads.map((l) => l.id === id ? { ...l, tags: newTags } : l),
        }));
      },

      removeLeadTag: async (id, tag) => {
        const lead = get().leads.find((l) => l.id === id);
        if (!lead) return;
        const newTags = lead.tags.filter((t) => t !== tag);
        if (isSupabaseConfigured()) {
          try { await db.updateLeadById(id, { tags: newTags }); } catch (err) { console.error(err); }
        }
        set((s) => ({
          leads: s.leads.map((l) => l.id === id ? { ...l, tags: newTags } : l),
        }));
      },

      markFollowUpDone: async (id, dayType) => {
        const lead = get().leads.find((l) => l.id === id);
        if (!lead) return;
        const newFollowUp = { ...lead.followUpDone, [dayType]: true };
        if (isSupabaseConfigured()) {
          try { await db.updateLeadById(id, { followUpDone: newFollowUp }); } catch (err) { console.error(err); }
        }
        set((s) => ({
          leads: s.leads.map((l) => l.id === id ? { ...l, followUpDone: newFollowUp } : l),
        }));
      },

      // ─── Timeline ───

      addTimelineEntry: async (leadId, type, content) => {
        if (isSupabaseConfigured()) {
          try {
            const entry = await db.createTimelineEntry(leadId, type, content);
            set((s) => ({ timeline: [entry, ...s.timeline] }));
            return;
          } catch (err) { console.error(err); }
        }
        set((s) => ({
          timeline: [{ id: uuidv4(), leadId, type, content, createdAt: new Date().toISOString() }, ...s.timeline],
        }));
      },

      // ─── Projects ───

      addProject: async (project) => {
        if (isSupabaseConfigured()) {
          try {
            const p = await db.createProject(project);
            set((s) => ({ projects: [p, ...s.projects] }));
            return;
          } catch (err) { console.error(err); }
        }
        set((s) => ({
          projects: [{ id: uuidv4(), ...project, images: [], createdAt: new Date().toISOString() }, ...s.projects],
        }));
      },

      updateProject: async (id, updates) => {
        if (isSupabaseConfigured()) {
          try { await db.updateProjectById(id, updates); } catch (err) { console.error(err); }
        }
        set((s) => ({
          projects: s.projects.map((p) => p.id === id ? { ...p, ...updates } : p),
        }));
      },

      deleteProject: async (id) => {
        if (isSupabaseConfigured()) {
          try { await db.deleteProjectById(id); } catch (err) { console.error(err); }
        }
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          templates: s.templates.filter((t) => t.projectId !== id),
        }));
      },

      // ─── Templates ───

      addTemplate: async (template) => {
        if (isSupabaseConfigured()) {
          try {
            const t = await db.createTemplate(template);
            set((s) => ({ templates: [...s.templates, t] }));
            return;
          } catch (err) { console.error(err); }
        }
        set((s) => ({
          templates: [...s.templates, { id: uuidv4(), ...template, projectId: template.projectId, imageUrl: template.imageUrl || '', sortOrder: s.templates.length, createdAt: new Date().toISOString() }],
        }));
      },

      updateTemplate: async (id, updates) => {
        if (isSupabaseConfigured()) {
          try { await db.updateTemplateById(id, updates); } catch (err) { console.error(err); }
        }
        set((s) => ({
          templates: s.templates.map((t) => t.id === id ? { ...t, ...updates } : t),
        }));
      },

      deleteTemplate: async (id) => {
        if (isSupabaseConfigured()) {
          try { await db.deleteTemplateById(id); } catch (err) { console.error(err); }
        }
        set((s) => ({
          templates: s.templates.filter((t) => t.id !== id),
        }));
      },
    }),
    {
      name: 'real-estate-crm-storage-v3',
      // When Supabase is configured, don't cache data to localStorage
      // This ensures the frontend always reflects the database state
      partialize: (state) => {
        if (isSupabaseConfigured()) {
          // Only persist non-data fields; data comes from Supabase on each load
          return {};
        }
        // Offline / no Supabase: persist everything as before
        return {
          events: state.events,
          leads: state.leads,
          timeline: state.timeline,
          templates: state.templates,
          projects: state.projects,
        };
      },
    }
  )
);
