import { useState, useEffect, useRef } from 'react';
import { useCRMStore } from '../store';
import { Users, CalendarCheck, PhoneOutgoing, CheckCircle, MessageCircle, Phone, Check, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { getLeadDayType, DAY_TYPE_LABELS, DAY_TYPE_COLORS } from '../types';
import type { Lead } from '../types';
import { isAIConfigured, generateDailySummary, suggestFollowUpTopics, type FollowUpSuggestion } from '../lib/ai';

type FollowUpDay = 'day0' | 'day1' | 'day3' | 'day7';

const DAY_ORDER: FollowUpDay[] = ['day0', 'day1', 'day3', 'day7'];

const DAY_ACTIONS: Record<string, { whatsapp: string; call: boolean }> = {
  day0: { whatsapp: '发送自我介绍 + 项目资料', call: false },
  day1: { whatsapp: '发送卖点 + 提问', call: true },
  day3: { whatsapp: '发送 Call to Action', call: true },
  day7: { whatsapp: '发送跟进 + Filter', call: true },
};

export function Dashboard() {
  const { leads, events, projects, timeline, templates, markFollowUpDone, addTimelineEntry, updateLeadStatus } = useCRMStore();

  // AI states
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<FollowUpSuggestion[]>([]);
  const aiLoadedRef = useRef(false);

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'new').length;
  const contactedLeads = leads.filter((l) => l.status === 'contacted' || l.status === 'viewing').length;
  const closedLeads = leads.filter((l) => l.status === 'closed').length;

  // Group leads by their current day type, only showing uncompleted follow-ups
  const todayTasks: Record<string, Lead[]> = { day0: [], day1: [], day3: [], day7: [] };

  leads.forEach((lead) => {
    if (lead.status === 'closed' || lead.status === 'dead') return;
    const dayType = getLeadDayType(lead.createdAt);
    if (!dayType || dayType === 'custom') return;
    if (lead.followUpDone[dayType]) return;
    todayTasks[dayType].push(lead);
  });

  const totalTasks = Object.values(todayTasks).reduce((sum, arr) => sum + arr.length, 0);
  const allTodayLeads = Object.values(todayTasks).flat();

  // Auto-load AI summary + follow-up suggestions
  const loadAI = async () => {
    if (!isAIConfigured() || allTodayLeads.length === 0) return;
    setAiSummaryLoading(true);
    try {
      const [summary, suggestions] = await Promise.all([
        generateDailySummary(allTodayLeads, timeline, projects),
        suggestFollowUpTopics(allTodayLeads, timeline, projects),
      ]);
      setAiSummary(summary);
      setFollowUpSuggestions(suggestions);
    } catch (err) {
      console.error('AI Dashboard error:', err);
    } finally {
      setAiSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (!aiLoadedRef.current && allTodayLeads.length > 0 && isAIConfigured()) {
      aiLoadedRef.current = true;
      loadAI();
    }
  }, [allTodayLeads.length]);

  const getSuggestionForLead = (leadId: string) =>
    followUpSuggestions.find((s) => s.leadId === leadId)?.suggestion;

  const handleWhatsApp = (lead: Lead, dayType: 'day0' | 'day1' | 'day3' | 'day7') => {
    // Find template for this lead's project + day
    const projectId = lead.projectId;
    let template = projectId
      ? templates.find((t) => t.projectId === projectId && t.dayType === dayType)
      : null;
    // Fallback to general template
    if (!template) {
      template = templates.find((t) => t.projectId === null && t.dayType === dayType);
    }

    const event = events.find((e) => e.id === lead.eventId);
    const project = projects.find((p) => p.id === lead.projectId);

    let message = template?.content || `Hi ${lead.name}，你好！`;
    message = message
      .replace(/\{\{name\}\}/g, lead.name)
      .replace(/\{\{event\}\}/g, event?.name || '展会')
      .replace(/\{\{project\}\}/g, project?.name || lead.projectInterest || '房产项目');

    let cleanPhone = lead.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '6' + cleanPhone;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    addTimelineEntry(lead.id, 'whatsapp', `发送了 ${DAY_TYPE_LABELS[dayType]} WhatsApp`);
    if (lead.status === 'new') updateLeadStatus(lead.id, 'contacted');
  };

  const handleCall = (lead: Lead, dayType: 'day0' | 'day1' | 'day3' | 'day7') => {
    window.open(`tel:${lead.phone}`, '_self');
    addTimelineEntry(lead.id, 'call', `${DAY_TYPE_LABELS[dayType]} 拨打了电话`);
    if (lead.status === 'new') updateLeadStatus(lead.id, 'contacted');
  };

  const handleMarkDone = (lead: Lead, dayType: 'day0' | 'day1' | 'day3' | 'day7') => {
    markFollowUpDone(lead.id, dayType);
  };

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">今日待办</h2>
          <p className="text-slate-500 text-sm mt-1">{dateStr} · {totalTasks} 个跟进任务</p>
        </div>
      </div>

      {/* AI Daily Summary */}
      {isAIConfigured() && (aiSummary || aiSummaryLoading) && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-100/80">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-purple-900 flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-purple-500" /> AI 今日总结
            </h4>
            <button
              type="button"
              onClick={loadAI}
              disabled={aiSummaryLoading}
              className="p-1.5 text-purple-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {aiSummaryLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </button>
          </div>
          {aiSummaryLoading ? (
            <p className="text-sm text-purple-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> AI 正在分析...
            </p>
          ) : (
            <p className="text-sm text-purple-900/80 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
          )}
        </div>
      )}

      {/* Today's Tasks by Day */}
      {totalTasks === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
          <CheckCircle className="w-12 h-12 mx-auto text-green-300 mb-3" />
          <p className="font-medium text-green-600">太棒了！今天没有待跟进的客户</p>
          <p className="text-xs mt-1 text-slate-400">新录入的 Lead 会自动出现在这里</p>
        </div>
      ) : (
        <div className="space-y-4">
          {DAY_ORDER.map((dayType) => {
            const dayLeads = todayTasks[dayType];
            if (dayLeads.length === 0) return null;
            const actions = DAY_ACTIONS[dayType];

            return (
              <div key={dayType} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${DAY_TYPE_COLORS[dayType]}`}>
                    {DAY_TYPE_LABELS[dayType]}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">({dayLeads.length})</span>
                </div>

                {dayLeads.map((lead) => {
                  const event = events.find((e) => e.id === lead.eventId);
                  const project = projects.find((p) => p.id === lead.projectId);

                  return (
                    <div key={lead.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/80">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate">{lead.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {project?.name || lead.projectInterest || '未指定项目'}
                            {event && <span className="ml-2 text-slate-400">· {event.name}</span>}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">{actions.whatsapp}</p>
                          {getSuggestionForLead(lead.id) && (
                            <p className="text-[11px] text-purple-600 mt-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 shrink-0" />
                              {getSuggestionForLead(lead.id)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleWhatsApp(lead, dayType)}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 active:scale-90 transition-all"
                            title="发送 WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          {actions.call && (
                            <button
                              onClick={() => handleCall(lead, dayType)}
                              className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-90 transition-all"
                              title="拨打电话"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleMarkDone(lead, dayType)}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-600 active:scale-90 transition-all"
                            title="标记完成"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100/80">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs font-semibold text-slate-500">总 Leads</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{totalLeads}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100/80">
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <CalendarCheck className="w-4 h-4" />
            <span className="text-xs font-semibold text-slate-500">未联系</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{newLeads}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100/80">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <PhoneOutgoing className="w-4 h-4" />
            <span className="text-xs font-semibold text-slate-500">跟进中</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{contactedLeads}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100/80">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-semibold text-slate-500">已成交</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{closedLeads}</p>
        </div>
      </div>
    </div>
  );
}
