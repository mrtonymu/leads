import React, { useState } from 'react';
import { useCRMStore } from '../store';
import { X } from 'lucide-react';

interface AddLeadModalProps {
  onClose: () => void;
}

export function AddLeadModal({ onClose }: AddLeadModalProps) {
  const { events, projects, addLead } = useCRMStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventId, setEventId] = useState(events.length > 0 ? events[0].id : '');
  const [projectId, setProjectId] = useState(projects.length > 0 ? projects[0].id : '');
  const [projectInterest, setProjectInterest] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const selectedProject = projects.find((p) => p.id === projectId);

    await addLead({
      name,
      phone,
      eventId: eventId || null,
      projectId: projectId || null,
      projectInterest: selectedProject?.name || projectInterest,
      notes,
      status: 'new',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-5 border-b border-slate-100/80">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">极速录入 Lead</h3>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">客户姓名 *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如: Jason"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">手机号码 *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0123456789"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">来源活动 (Booth)</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm appearance-none"
            >
              <option value="">-- 不指定活动 --</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.date})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">意向项目</label>
            {projects.length > 0 ? (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm appearance-none"
              >
                <option value="">-- 不指定项目 --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={projectInterest}
                onChange={(e) => setProjectInterest(e.target.value)}
                placeholder="例如: KLCC 3房 / 投资"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">防撞名特征 / 备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如: 穿红衣服，带小孩，预算1M"
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all resize-none text-sm"
            />
          </div>

          <div className="pt-3 pb-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] transition-all"
            >
              保存 Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
