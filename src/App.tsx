import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { EventList } from './components/EventList';
import { LeadList } from './components/LeadList';
import { AddLeadModal } from './components/AddLeadModal';
import { Settings } from './components/Settings';
import { LayoutDashboard, Users, CalendarDays, Plus, Settings as SettingsIcon } from 'lucide-react';

type Tab = 'dashboard' | 'leads' | 'events' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isAddingLead, setIsAddingLead] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
            R
          </div>
          <h1 className="font-bold text-lg tracking-tight text-slate-800">地产极速获客 CRM</h1>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto p-4">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'events' && <EventList />}
        {activeTab === 'leads' && <LeadList />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Floating Action Button (FAB) for adding leads quickly */}
      <button
        onClick={() => setIsAddingLead(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 z-30"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 pb-safe z-30">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-semibold">概览</span>
          </button>
          
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === 'leads' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className={`w-5 h-5 ${activeTab === 'leads' ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-semibold">客户</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === 'events' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CalendarDays className={`w-5 h-5 ${activeTab === 'events' ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-semibold">展会</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <SettingsIcon className={`w-5 h-5 ${activeTab === 'settings' ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-semibold">设置</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      {isAddingLead && <AddLeadModal onClose={() => setIsAddingLead(false)} />}
    </div>
  );
}
