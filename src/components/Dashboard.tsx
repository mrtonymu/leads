import { useCRMStore } from '../store';
import { Users, CalendarCheck, PhoneOutgoing, CheckCircle } from 'lucide-react';

export function Dashboard() {
  const { leads, events } = useCRMStore();

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'new').length;
  const contactedLeads = leads.filter((l) => l.status === 'contacted' || l.status === 'viewing').length;
  const closedLeads = leads.filter((l) => l.status === 'closed').length;

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">概览</h2>
        <p className="text-slate-500 text-sm mt-1">随时掌握你的获客进度</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-blue-600 mb-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-slate-600">总 Leads</span>
          </div>
          <p className="text-4xl font-black text-slate-800 tracking-tight">{totalLeads}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-orange-500 mb-3">
            <div className="p-2.5 bg-orange-50 rounded-xl">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-slate-600">未联系</span>
          </div>
          <p className="text-4xl font-black text-slate-800 tracking-tight">{newLeads}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-purple-600 mb-3">
            <div className="p-2.5 bg-purple-50 rounded-xl">
              <PhoneOutgoing className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-slate-600">跟进中</span>
          </div>
          <p className="text-4xl font-black text-slate-800 tracking-tight">{contactedLeads}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-green-600 mb-3">
            <div className="p-2.5 bg-green-50 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-slate-600">已成交</span>
          </div>
          <p className="text-4xl font-black text-slate-800 tracking-tight">{closedLeads}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100/80 p-6">
        <h3 className="font-bold text-slate-900 mb-5 text-lg">近期活动表现</h3>
        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">暂无活动数据</p>
          ) : (
            events.slice(0, 5).map((event) => {
              const eventLeads = leads.filter((l) => l.eventId === event.id).length;
              return (
                <div key={event.id} className="flex justify-between items-center group">
                  <div>
                    <p className="font-semibold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">{event.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{event.date}</p>
                  </div>
                  <div className="bg-slate-50 text-slate-700 font-bold px-3.5 py-1.5 rounded-full text-sm border border-slate-100">
                    {eventLeads} 人
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
