import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { EventList } from './components/EventList';
import { LeadList } from './components/LeadList';
import { AddLeadModal } from './components/AddLeadModal';
import { Settings } from './components/Settings';
import { ProjectList } from './components/ProjectList';
import { LayoutDashboard, Users, CalendarDays, Plus, Settings as SettingsIcon, Building2 } from 'lucide-react';
import { useCRMStore } from './store';

type Tab = 'dashboard' | 'leads' | 'events' | 'projects' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isAddingLead, setIsAddingLead] = useState(false);
  const initialize = useCRMStore((s) => s.initialize);
  const isLoading = useCRMStore((s) => s.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
            D
          </div>
          <h1 className="font-bold text-lg tracking-tight text-slate-800">Dignity Leads CRM</h1>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto p-4">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'events' && <EventList />}
        {activeTab === 'leads' && <LeadList />}
        {activeTab === 'projects' && <ProjectList />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsAddingLead(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 z-30"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 pb-safe z-30">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-1">
          {[
            { key: 'dashboard' as Tab, icon: LayoutDashboard, label: '今日' },
            { key: 'leads' as Tab, icon: Users, label: '客户' },
            { key: 'events' as Tab, icon: CalendarDays, label: '展会' },
            { key: 'projects' as Tab, icon: Building2, label: '项目' },
            { key: 'settings' as Tab, icon: SettingsIcon, label: '设置' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                activeTab === key ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${activeTab === key ? 'fill-blue-50' : ''}`} />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      {isAddingLead && <AddLeadModal onClose={() => setIsAddingLead(false)} />}
    </div>
  );
}
