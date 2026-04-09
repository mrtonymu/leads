import React, { useState, useEffect } from 'react';
import { useCRMStore } from '../store';
import { Lead, LeadStatus } from '../types';
import { ArrowLeft, Phone, MessageCircle, Tag, Plus, Clock, FileText, CheckCircle2, Info } from 'lucide-react';
import { format } from 'date-fns';

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

interface LeadDetailProps {
  leadId: string;
  onBack: () => void;
}

export function LeadDetail({ leadId, onBack }: LeadDetailProps) {
  const { leads, events, timeline, templates, updateLeadStatus, addLeadTag, removeLeadTag, addTimelineEntry } = useCRMStore();
  const lead = leads.find((l) => l.id === leadId);
  const event = events.find((e) => e.id === lead?.eventId);
  const leadTimeline = timeline.filter((t) => t.leadId === leadId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [newNote, setNewNote] = useState('');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id || 'custom');
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (selectedTemplate === 'custom') return;
    const template = templates.find(t => t.id === selectedTemplate);
    if (template && lead) {
      const msg = template.content
        .replace(/{{name}}/g, lead.name)
        .replace(/{{event}}/g, event ? event.name : '展会')
        .replace(/{{project}}/g, lead.projectInterest || '房产项目');
      setCustomMessage(msg);
    }
  }, [selectedTemplate, lead, event, templates]);

  if (!lead) return null;

  const handleWhatsApp = () => {
    if (!customMessage.trim()) return;

    let cleanPhone = lead.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '6' + cleanPhone;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customMessage)}`;
    window.open(url, '_blank');

    const templateName = selectedTemplate === 'custom' ? '自定义消息' : (templates.find(t => t.id === selectedTemplate)?.title || '模板消息');
    addTimelineEntry(lead.id, 'whatsapp', `发送了 WhatsApp: ${templateName}`);
    if (lead.status === 'new') updateLeadStatus(lead.id, 'contacted');
  };

  const handleCall = () => {
    window.open(`tel:${lead.phone}`, '_self');
    addTimelineEntry(lead.id, 'call', '拨打了电话');
    if (lead.status === 'new') updateLeadStatus(lead.id, 'contacted');
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
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-md mx-auto mt-2">
        {/* Actions */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 ml-1">选择话术模板</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full text-sm font-medium bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                >
                  {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  <option value="custom">✎ 自定义内容...</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <button
                  onClick={handleCall}
                  className="px-6 h-[42px] bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl flex items-center gap-1.5 font-semibold transition-colors active:scale-95"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">拨打</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-2.5 pt-1">
              <textarea
                value={customMessage}
                onChange={(e) => {
                  setCustomMessage(e.target.value);
                  if (selectedTemplate !== 'custom') setSelectedTemplate('custom');
                }}
                placeholder="输入要发送的 WhatsApp 消息..."
                rows={4}
                className="w-full text-sm bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all resize-none leading-relaxed text-slate-700"
              />
              <button
                onClick={handleWhatsApp}
                className="w-full bg-gradient-to-r from-[#25D366] to-[#1da851] hover:from-[#20bd5a] hover:to-[#199446] text-white py-3.5 rounded-xl flex justify-center items-center gap-2 font-bold shadow-md shadow-green-500/20 active:scale-95 transition-all"
              >
                <MessageCircle className="w-5 h-5" /> 发送 WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Info & Tags */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
              <Info className="w-5 h-5 text-blue-500" /> 客户资料
            </h3>
          </div>
          
          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between border-b border-slate-100/80 pb-3">
              <span className="text-slate-500 font-medium">来源活动</span>
              <span className="font-semibold text-slate-900">{event?.name || '无'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100/80 pb-3">
              <span className="text-slate-500 font-medium">意向项目</span>
              <span className="font-semibold text-slate-900">{lead.projectInterest || '-'}</span>
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
              {lead.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
                  {tag}
                  <button onClick={() => removeLeadTag(lead.id, tag)} className="hover:text-blue-900 hover:bg-blue-200/50 rounded-full p-0.5 transition-colors">&times;</button>
                </span>
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
                    <div className="h-px bg-slate-100 my-1"></div>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_TAGS.filter(t => !lead.tags.includes(t)).map(tag => (
                        <button
                          key={tag}
                          onClick={() => { addLeadTag(lead.id, tag); setShowTagMenu(false); }}
                          className="text-xs font-medium bg-slate-50 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1.5 rounded-lg text-left transition-colors border border-transparent hover:border-blue-100"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
