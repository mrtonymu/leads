import React, { useState } from 'react';
import { useCRMStore } from '../store';
import { format } from 'date-fns';
import { Plus, MapPin, Calendar, Trash2 } from 'lucide-react';

export function EventList() {
  const { events, addEvent, deleteEvent } = useCRMStore();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addEvent(name, location, date);
    setName('');
    setLocation('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex justify-between items-center sticky top-0 bg-slate-50/90 backdrop-blur-xl pt-4 pb-3 z-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">活动展会</h2>
          <p className="text-slate-500 text-sm mt-0.5">管理你的获客来源</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 text-sm font-semibold shadow-md hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> 新建
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">活动名称 (必填)</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 2026 KLCC 房展 Day 1"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">地点</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如: KLCC Hall 1"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">日期</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
            >
              保存
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3.5">
        {events.length === 0 && !isAdding && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium">还没有创建任何活动</p>
            <p className="text-xs mt-1">建议按每天的展会创建活动，方便归类 Leads</p>
          </div>
        )}
        {events.map((event) => (
          <div key={event.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80 flex justify-between items-start hover:shadow-md transition-shadow">
            <div>
              <h3 className="font-bold text-lg text-slate-900">{event.name}</h3>
              <div className="flex items-center gap-3 mt-2.5 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> {event.date}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {event.location}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('确定要删除这个活动吗？(该活动下的 Leads 不会被删除，但会失去活动标签)')) {
                  deleteEvent(event.id);
                }
              }}
              className="text-red-500 hover:bg-red-50 hover:text-red-600 p-2.5 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
