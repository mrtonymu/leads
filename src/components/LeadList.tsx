import { useState, useEffect, useRef } from 'react';
import { useCRMStore } from '../store';
import { LeadStatus } from '../types';
import { MapPin, Search, UserCircle, Tag, Flame, Snowflake, ThermometerSun } from 'lucide-react';
import { getCalendarDaysAgoText } from '../types';
import { LeadDetail } from './LeadDetail';
import { isAIConfigured, analyzeIntent, type IntentResult } from '../lib/ai';

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: '未联系',
  contacted: '已联系',
  viewing: '安排看房',
  closed: '已成交',
  dead: '无效',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-orange-50 text-orange-700 border-orange-200/60',
  contacted: 'bg-blue-50 text-blue-700 border-blue-200/60',
  viewing: 'bg-purple-50 text-purple-700 border-purple-200/60',
  closed: 'bg-green-50 text-green-700 border-green-200/60',
  dead: 'bg-slate-50 text-slate-600 border-slate-200/60',
};

const INTENT_ICONS = {
  hot: { icon: Flame, color: 'text-red-500', label: 'Hot' },
  warm: { icon: ThermometerSun, color: 'text-amber-500', label: 'Warm' },
  cold: { icon: Snowflake, color: 'text-blue-400', label: 'Cold' },
};

export function LeadList() {
  const { leads, events, timeline } = useCRMStore();
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [intents, setIntents] = useState<IntentResult[]>([]);
  const aiLoadedRef = useRef(false);

  useEffect(() => {
    if (!aiLoadedRef.current && isAIConfigured() && leads.length > 0) {
      aiLoadedRef.current = true;
      analyzeIntent(leads, timeline).then(setIntents).catch(console.error);
    }
  }, [leads.length]);

  const getIntent = (leadId: string) => intents.find((i) => i.leadId === leadId);

  const filteredLeads = leads.filter((lead) => {
    const matchesEvent = filterEvent === 'all' || lead.eventId === filterEvent;
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesEvent && matchesSearch;
  });

  if (selectedLeadId) {
    return <LeadDetail leadId={selectedLeadId} onBack={() => setSelectedLeadId(null)} />;
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-col gap-3 sticky top-0 bg-slate-50/90 backdrop-blur-xl pt-4 pb-3 z-10">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">客户列表</h2>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索名字、电话、标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="relative">
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="bg-white border border-slate-200/80 rounded-2xl pl-3 pr-8 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none max-w-[130px] shadow-sm font-medium text-slate-700 appearance-none cursor-pointer"
            >
              <option value="all">所有活动</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <UserCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium">没有找到匹配的客户</p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const event = events.find((e) => e.id === lead.eventId);
            return (
              <div 
                key={lead.id} 
                onClick={() => setSelectedLeadId(lead.id)}
                className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/80 cursor-pointer hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                      {lead.name}
                      <span className="text-xs font-medium text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                        {lead.phone}
                      </span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      {event && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          <MapPin className="w-3 h-3" /> {event.name}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {getCalendarDaysAgoText(lead.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {(() => {
                      const intent = getIntent(lead.id);
                      if (!intent) return null;
                      const cfg = INTENT_ICONS[intent.intent];
                      const Icon = cfg.icon;
                      return (
                        <span className={`${cfg.color}`} title={intent.reason}>
                          <Icon className="w-4 h-4" />
                        </span>
                      );
                    })()}
                    <div className={`text-[11px] font-bold px-3 py-1 rounded-full border ${STATUS_COLORS[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 mt-4">
                  {lead.projectInterest && (
                    <p className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      <span className="font-medium text-slate-500">意向:</span> {lead.projectInterest}
                    </p>
                  )}
                  {lead.tags && lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {lead.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 border border-slate-100 px-2 py-1 rounded-lg text-[10px] font-semibold">
                          <Tag className="w-3 h-3 text-slate-400" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
