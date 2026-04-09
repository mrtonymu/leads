import { useState } from 'react';
import { useCRMStore } from '../store';
import { Save, MessageSquare, Edit2, Download } from 'lucide-react';

export function Settings() {
  const { templates, updateTemplate } = useCRMStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    const { events, leads, timeline, templates } = useCRMStore.getState();
    const exportData = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: 'leads-v1',
      data: { events, leads, timeline, templates },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const handleEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleSave = (id: string) => {
    updateTemplate(id, editContent);
    setEditingId(null);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="sticky top-0 bg-slate-50/90 backdrop-blur-xl pt-4 pb-3 z-10">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">系统设置</h2>
        <p className="text-slate-500 text-sm mt-0.5">定制你的专属跟进话术</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100/80 overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 border-b border-emerald-100/50">
          <h3 className="font-bold text-emerald-900 flex items-center gap-2 text-lg">
            <Download className="w-5 h-5 text-emerald-600" />
            数据导出
          </h3>
          <p className="text-xs text-emerald-700/80 mt-2 font-medium">
            导出所有数据到 JSON 文件，用于迁移到新版本
          </p>
        </div>
        <div className="p-5">
          <button
            onClick={handleExport}
            className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-semibold hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exported ? '已下载!' : '导出全部数据'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100/80 overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100/50">
          <h3 className="font-bold text-blue-900 flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            WhatsApp 话术模板库
          </h3>
          <p className="text-xs text-blue-700/80 mt-2 font-medium">
            支持变量：<code className="bg-blue-100/50 text-blue-800 px-1.5 py-0.5 rounded-md border border-blue-200/50">{'{{name}}'}</code> 客户名, <code className="bg-blue-100/50 text-blue-800 px-1.5 py-0.5 rounded-md border border-blue-200/50">{'{{event}}'}</code> 展会名, <code className="bg-blue-100/50 text-blue-800 px-1.5 py-0.5 rounded-md border border-blue-200/50">{'{{project}}'}</code> 意向项目
          </p>
        </div>

        <div className="divide-y divide-slate-100/80">
          {templates.map((template) => (
            <div key={template.id} className="p-5 space-y-3 hover:bg-slate-50/50 transition-colors">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800">{template.title}</h4>
                {editingId !== template.id ? (
                  <button
                    onClick={() => handleEdit(template.id, template.content)}
                    className="text-sm text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> 编辑
                  </button>
                ) : (
                  <button
                    onClick={() => handleSave(template.id)}
                    className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    <Save className="w-4 h-4" /> 保存
                  </button>
                )}
              </div>

              {editingId === template.id ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-white border border-blue-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none text-sm text-slate-700 shadow-sm transition-all"
                />
              ) : (
                <div className="bg-slate-50 p-4 rounded-2xl text-sm text-slate-600 whitespace-pre-wrap border border-slate-100/50 leading-relaxed">
                  {template.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
