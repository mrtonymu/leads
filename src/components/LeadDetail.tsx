import React, { useState, useEffect } from 'react';
import { useCRMStore } from '../store';
import { Lead, LeadStatus, DayType, DAY_TYPE_LABELS, DAY_TYPE_COLORS, getLeadDayType } from '../types';
import { ArrowLeft, Phone, MessageCircle, Tag, Plus, Clock, FileText, CheckCircle2, Info, Check, Copy, Trash2, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import { isAIConfigured, generateReplySuggestions, generateMessage, suggestTags, type ReplySuggestion } from '../lib/ai';

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
  dead: 'bg-slate-100 text-slate-600 border-slate-200/60',
};

const PRESET_TAGS = ['投资客', '自住', '高预算', '急买', '外州客', '犹豫中'];
const DAY_TYPES_LIST: ('day0' | 'day1' | 'day3' | 'day7')[] = ['day0', 'day1', 'day3', 'day7'];

interface LeadDetailProps {
  leadId: string;
  onBack: () => void;
}

export function LeadDetail({ leadId, onBack }: LeadDetailProps) {
  const { leads, events, projects, timeline, templates, updateLeadStatus, addLeadTag, removeLeadTag, addTimelineEntry, markFollowUpDone, deleteLead } = useCRMStore();
  const lead = leads.find((l) => l.id === leadId);
  const event = events.find((e) => e.id === lead?.eventId);
  const project = lead?.projectId ? projects.find((p) => p.id === lead.projectId) : null;
  const leadTimeline = timeline.filter((t) => t.leadId === leadId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [newNote, setNewNote] = useState('');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedDayType, setSelectedDayType] = useState<DayType>('day0');
  const [copiedImage, setCopiedImage] = useState(false);

  // AI states
  const [customerReply, setCustomerReply] = useState('');
  const [replySuggestions, setReplySuggestions] = useState<ReplySuggestion[]>([]);
  const [aiReplyLoading, setAiReplyLoading] = useState(false);
  const [aiMessageLoading, setAiMessageLoading] = useState(false);
  const [aiTagsLoading, setAiTagsLoading] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Calculate recommended day type
  const recommendedDay = lead ? getLeadDayType(lead.createdAt) : null;

  // Find matching template
  const getTemplate = (dayType: DayType) => {
    const projectId = lead?.projectId;
    let template = projectId
      ? templates.find((t) => t.projectId === projectId && t.dayType === dayType)
      : null;
    if (!template) {
      template = templates.find((t) => t.projectId === null && t.dayType === dayType);
    }
    return template;
  };

  useEffect(() => {
    if (!lead) return;
    const day = recommendedDay && recommendedDay !== 'custom' ? recommendedDay : 'day0';
    setSelectedDayType(day);
  }, [leadId]);

  useEffect(() => {
    if (!lead) return;
    const template = getTemplate(selectedDayType);
    if (template) {
      let msg = template.content
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{event\}\}/g, event?.name || '展会')
        .replace(/\{\{project\}\}/g, project?.name || lead.projectInterest || '房产项目');
      setCustomMessage(msg);
    }
  }, [selectedDayType, leadId]);

  if (!lead) return null;

  const currentTemplate = getTemplate(selectedDayType);
  const aiAvailable = isAIConfigured();

  // ─── Handlers ───

  const handleWhatsApp = () => {
    if (!customMessage.trim()) return;
    let cleanPhone = lead.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '6' + cleanPhone;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customMessage)}`;
    window.open(url, '_blank');
    addTimelineEntry(lead.id, 'whatsapp', `发送了 ${DAY_TYPE_LABELS[selectedDayType]} WhatsApp`);
    if (lead.status === 'new') updateLeadStatus(lead.id, 'contacted');
  };

  const handleCall = () => {
    window.open(`tel:${lead.phone}`, '_self');
    addTimelineEntry(lead.id, 'call', '拨打了电话');
    if (lead.status === 'new') updateLeadStatus(lead.id, 'contacted');
  };

  const handleCopyImage = async () => {
    if (!currentTemplate?.imageUrl) return;
    try {
      const response = await fetch(currentTemplate.imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch {
      window.open(currentTemplate.imageUrl, '_blank');
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addTimelineEntry(lead.id, 'note', newNote);
    setNewNote('');
  };

  const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTag.trim()) {
      addLeadTag(lead.id, customTag.trim());
      setCustomTag('');
      setShowTagMenu(false);
    }
  };

  // ─── AI Handlers ───

  const handleAIReply = async () => {
    if (!customerReply.trim()) return;
    setAiReplyLoading(true);
    setReplySuggestions([]);
    try {
      const suggestions = await generateReplySuggestions(customerReply, lead, leadTimeline, event, project);
      setReplySuggestions(suggestions);
    } catch (err) {
      console.error(err);
    } finally {
      setAiReplyLoading(false);
    }
  };

  const handleSelectReply = (message: string) => {
    setCustomMessage(message);
    setReplySuggestions([]);
    setCustomerReply('');
  };

  const handleAIGenerate = async () => {
    setAiMessageLoading(true);
    try {
      const msg = await generateMessage(lead, selectedDayType, leadTimeline, event, project);
      setCustomMessage(msg);
    } catch (err) {
      console.error(err);
    } finally {
      setAiMessageLoading(false);
    }
  };

  const handleAITags = async () => {
    setAiTagsLoading(true);
    setSuggestedTags([]);
    try {
      const tags = await suggestTags(lead, leadTimeline, event, project);
      setSuggestedTags(tags);
    } catch (err) {
      console.error(err);
    } finally {
      setAiTagsLoading(false);
    }
  };

  const handleAcceptTag = (tag: string) => {
    addLeadTag(lead.id, tag);
    setSuggestedTags((prev) => prev.filter((t) => t !== tag));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto pb-24 animate-in slide-in-from-right-full duration-300">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3 flex items-center gap-3 z-20 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-lg text-slate-900 tracking-tight">{lead.name}</h2>
          <p className="text-xs text-slate-500 font-mono font-medium">{lead.phone}</p>
        </div>
        <button
          type="button"
          title="删除客户"
          onClick={() => {
            if (window.confirm(`确定删除「${lead.name}」？此操作不可撤销。`)) {
              deleteLead(lead.id);
              onBack();
            }
          }}
          className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
        <div className="relative">
          <select
            value={lead.status}
            onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
            className={`text-xs font-bold px-4 py-2 rounded-full outline-none appearance-none text-center border shadow-sm cursor-pointer hover:opacity-90 transition-opacity ${STATUS_COLORS[lead.status]}`}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-md mx-auto mt-2">
        {/* Follow-up Progress */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100/80">
          <h4 className="text-xs font-semibold text-slate-500 mb-3">跟进进度</h4>
          <div className="flex gap-2">
            {DAY_TYPES_LIST.map((day) => {
              const done = lead.followUpDone[day];
              const isCurrent = recommendedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => !done && markFollowUpDone(lead.id, day)}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold text-center border transition-all ${
                    done
                      ? 'bg-green-50 text-green-600 border-green-200'
                      : isCurrent
                        ? 'bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-200'
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}
                >
                  {done ? '✓ ' : ''}{day.replace('day', 'D')}
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Reply Suggestions */}
        {aiAvailable && (
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-purple-100/80 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-purple-500" /> AI 回复建议
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={customerReply}
                onChange={(e) => setCustomerReply(e.target.value)}
                placeholder="粘贴客户回复的内容..."
                className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-sm focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleAIReply()}
              />
              <button
                type="button"
                onClick={handleAIReply}
                disabled={aiReplyLoading || !customerReply.trim()}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {aiReplyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI
              </button>
            </div>

            {replySuggestions.length > 0 && (
              <div className="space-y-2">
                {replySuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectReply(s.message)}
                    className="w-full text-left bg-purple-50/50 hover:bg-purple-50 border border-purple-100/80 rounded-xl p-3 transition-colors"
                  >
                    <span className="text-[10px] font-bold text-purple-600 block mb-1">{s.style}</span>
                    <span className="text-sm text-slate-700 leading-relaxed">{s.message}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Template + WhatsApp */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-500">选择模板</label>
              {recommendedDay && recommendedDay !== 'custom' && recommendedDay === selectedDayType && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  推荐
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={selectedDayType}
                onChange={(e) => setSelectedDayType(e.target.value as DayType)}
                className="flex-1 text-sm font-medium bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
              >
                {DAY_TYPES_LIST.map((d) => (
                  <option key={d} value={d}>
                    {DAY_TYPE_LABELS[d]}
                    {d === recommendedDay ? ' (推荐)' : ''}
                  </option>
                ))}
                <option value="custom">自定义内容...</option>
              </select>
              <button
                onClick={handleCall}
                className="px-5 h-[42px] bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl flex items-center gap-1.5 font-semibold transition-colors active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm">拨打</span>
              </button>
            </div>
          </div>

          {currentTemplate?.imageUrl && (
            <div className="relative">
              <img src={currentTemplate.imageUrl} alt="模板图片" className="w-full rounded-xl border border-slate-100 object-cover max-h-48" />
              <button
                onClick={handleCopyImage}
                className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md hover:bg-white active:scale-95 transition-all border border-slate-200/80"
              >
                {copiedImage ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedImage ? '已复制' : '复制图片'}
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="输入要发送的 WhatsApp 消息..."
              rows={5}
              className="w-full text-sm bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all resize-none leading-relaxed text-slate-700"
            />
            <div className="flex gap-2">
              {aiAvailable && (
                <button
                  type="button"
                  onClick={handleAIGenerate}
                  disabled={aiMessageLoading}
                  className="px-4 py-3.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl flex items-center gap-1.5 font-semibold transition-colors active:scale-95 disabled:opacity-50 text-sm"
                >
                  {aiMessageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  AI 写
                </button>
              )}
              <button
                onClick={handleWhatsApp}
                className="flex-1 bg-gradient-to-r from-[#25D366] to-[#1da851] hover:from-[#20bd5a] hover:to-[#199446] text-white py-3.5 rounded-xl flex justify-center items-center gap-2 font-bold shadow-md shadow-green-500/20 active:scale-95 transition-all"
              >
                <MessageCircle className="w-5 h-5" /> 发送 WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Info & Tags */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
            <Info className="w-5 h-5 text-blue-500" /> 客户资料
          </h3>

          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between border-b border-slate-100/80 pb-3">
              <span className="text-slate-500 font-medium">来源活动</span>
              <span className="font-semibold text-slate-900">{event?.name || '无'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100/80 pb-3">
              <span className="text-slate-500 font-medium">意向项目</span>
              <span className="font-semibold text-slate-900">{project?.name || lead.projectInterest || '-'}</span>
            </div>
            {lead.notes && (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100/80 mt-2">
                <span className="text-xs font-bold text-amber-800 block mb-1.5">初始备注:</span>
                <span className="text-slate-700 leading-relaxed">{lead.notes}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="pt-3">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">标签</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lead.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
                  {tag}
                  <button onClick={() => removeLeadTag(lead.id, tag)} className="hover:text-blue-900 hover:bg-blue-200/50 rounded-full p-0.5 transition-colors">&times;</button>
                </span>
              ))}

              {/* AI suggested tags */}
              {suggestedTags.map((tag) => (
                <button
                  key={`ai-${tag}`}
                  type="button"
                  onClick={() => handleAcceptTag(tag)}
                  className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 border-dashed px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-colors"
                >
                  <Sparkles className="w-3 h-3" /> {tag}
                </button>
              ))}

              <div className="relative">
                <button
                  onClick={() => setShowTagMenu(!showTagMenu)}
                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200/60 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> 添加
                </button>
                {showTagMenu && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-slate-200/80 shadow-xl rounded-2xl p-3 z-20 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <input
                      type="text"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={handleAddCustomTag}
                      placeholder="输入自定义标签并回车..."
                      className="w-full text-xs bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      autoFocus
                    />
                    <div className="h-px bg-slate-100 my-1" />
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_TAGS.filter((t) => !lead.tags.includes(t)).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => { addLeadTag(lead.id, tag); setShowTagMenu(false); }}
                          className="text-xs font-medium bg-slate-50 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Tags button */}
              {aiAvailable && (
                <button
                  type="button"
                  onClick={handleAITags}
                  disabled={aiTagsLoading}
                  className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 border border-purple-200/60 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  {aiTagsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI 建议
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-5 text-lg">
            <Clock className="w-5 h-5 text-indigo-500" /> 互动时间线
          </h3>

          <div className="flex gap-2.5 mb-8">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="添加跟进记录..."
              className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <button
              onClick={handleAddNote}
              className="bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800 shadow-md active:scale-95 transition-all"
            >
              记录
            </button>
          </div>

          <div className="space-y-5 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
            {leadTimeline.map((entry) => (
              <div key={entry.id} className="relative flex items-start gap-4 group">
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm transition-transform group-hover:scale-110
                  ${entry.type === 'note' ? 'bg-amber-100 text-amber-600' :
                    entry.type === 'whatsapp' ? 'bg-green-100 text-green-600' :
                    entry.type === 'call' ? 'bg-blue-100 text-blue-600' :
                    entry.type === 'status_change' ? 'bg-purple-100 text-purple-600' :
                    'bg-slate-100 text-slate-500'}`}
                >
                  {entry.type === 'note' && <FileText className="w-4 h-4" />}
                  {entry.type === 'whatsapp' && <MessageCircle className="w-4 h-4" />}
                  {entry.type === 'call' && <Phone className="w-4 h-4" />}
                  {entry.type === 'status_change' && <CheckCircle2 className="w-4 h-4" />}
                  {entry.type === 'system' && <Info className="w-4 h-4" />}
                </div>
                <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100/80 group-hover:border-slate-200 group-hover:shadow-sm transition-all">
                  <p className="text-sm text-slate-800 font-medium leading-relaxed">{entry.content}</p>
                  <p className="text-[11px] text-slate-400 mt-2 font-mono font-medium">
                    {format(new Date(entry.createdAt), 'MM-dd HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
