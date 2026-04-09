import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Event, Lead, LeadStatus, TimelineEntry, Template, TimelineType } from './types';

interface CRMState {
  events: Event[];
  leads: Lead[];
  timeline: TimelineEntry[];
  templates: Template[];
  
  addEvent: (name: string, location: string, date: string) => void;
  deleteEvent: (id: string) => void;
  
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'tags'>) => void;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  addLeadTag: (id: string, tag: string) => void;
  removeLeadTag: (id: string, tag: string) => void;
  
  addTimelineEntry: (leadId: string, type: TimelineType, content: string) => void;
  
  updateTemplate: (id: string, content: string) => void;
}

const DEFAULT_TEMPLATES: Template[] = [
  { id: 't1', title: '展会初次打招呼', content: 'Hi {{name}} 你好！我是昨天在 {{event}} 跟你聊过 {{project}} 的地产经纪。这是我的电子名片，想跟你跟进一下你的需求...' },
  { id: 't2', title: '发送资料', content: 'Hi {{name}}，这是你感兴趣的 {{project}} 的 E-brochure 和户型图，请查收。如果有任何问题随时找我！' },
  { id: 't3', title: '邀约看房', content: 'Hi {{name}}，周末好！{{project}} 的 Showroom 已经开放了，这周末你有空过来看看吗？我可以帮你安排 VIP 参观。' },
];

export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      events: [],
      leads: [],
      timeline: [],
      templates: DEFAULT_TEMPLATES,
      
      addEvent: (name, location, date) =>
        set((state) => ({
          events: [...state.events, { id: uuidv4(), name, location, date, createdAt: new Date().toISOString() }],
        })),
        
      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
          leads: state.leads.map((l) => (l.eventId === id ? { ...l, eventId: null } : l)),
        })),
        
      addLead: (leadData) => {
        const newLeadId = uuidv4();
        set((state) => ({
          leads: [
            { ...leadData, id: newLeadId, tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            ...state.leads,
          ],
          timeline: [
            { id: uuidv4(), leadId: newLeadId, type: 'system', content: '录入新客户', createdAt: new Date().toISOString() },
            ...state.timeline
          ]
        }));
      },
      
      updateLeadStatus: (id, status) => {
        const lead = get().leads.find(l => l.id === id);
        if (lead && lead.status !== status) {
          set((state) => ({
            leads: state.leads.map((l) => l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l),
            timeline: [
              { id: uuidv4(), leadId: id, type: 'status_change', content: `状态更新为: ${status}`, createdAt: new Date().toISOString() },
              ...state.timeline
            ]
          }));
        }
      },
      
      updateLead: (id, updates) =>
        set((state) => ({
          leads: state.leads.map((l) => l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l),
        })),
        
      deleteLead: (id) =>
        set((state) => ({
          leads: state.leads.filter((l) => l.id !== id),
          timeline: state.timeline.filter((t) => t.leadId !== id),
        })),
        
      addLeadTag: (id, tag) =>
        set((state) => ({
          leads: state.leads.map((l) => l.id === id && !l.tags.includes(tag) ? { ...l, tags: [...l.tags, tag] } : l),
        })),
        
      removeLeadTag: (id, tag) =>
        set((state) => ({
          leads: state.leads.map((l) => l.id === id ? { ...l, tags: l.tags.filter(t => t !== tag) } : l),
        })),
        
      addTimelineEntry: (leadId, type, content) =>
        set((state) => ({
          timeline: [{ id: uuidv4(), leadId, type, content, createdAt: new Date().toISOString() }, ...state.timeline],
        })),
        
      updateTemplate: (id, content) =>
        set((state) => ({
          templates: state.templates.map((t) => t.id === id ? { ...t, content } : t),
        })),
    }),
    { name: 'real-estate-crm-storage-v2' }
  )
);
