import React, { useState, useRef } from 'react';
import { useCRMStore } from '../store';
import { Save, MessageSquare, Edit2, Download, Upload, Loader2, CheckCircle, AlertCircle, Sparkles, RotateCcw } from 'lucide-react';
import { importFromV1Export } from '../lib/db';
import { isAIConfigured, getAIUsage, resetAIUsage } from '../lib/ai';

type ImportStatus = 'idle' | 'previewing' | 'importing' | 'success' | 'error';

interface ImportPreview {
  events: number;
  leads: number;
  timeline: number;
  templates: number;
}

function validateExport(parsed: unknown): parsed is { exportVersion: number; data: { events: unknown[]; leads: unknown[]; timeline: unknown[]; templates: unknown[] } } {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;
  if (obj.exportVersion !== 1) return false;
  if (!obj.data || typeof obj.data !== 'object') return false;
  const data = obj.data as Record<string, unknown>;
  return Array.isArray(data.events) && Array.isArray(data.leads) && Array.isArray(data.timeline) && Array.isArray(data.templates);
}

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

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportPreview | null>(null);
  const [importRawData, setImportRawData] = useState<unknown>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!validateExport(parsed)) {
          setImportStatus('error');
          setImportError('文件格式不正确，请选择从旧版 CRM 导出的 JSON 文件');
          return;
        }
        setImportRawData(parsed.data);
        setImportPreview({
          events: parsed.data.events.length,
          leads: parsed.data.leads.length,
          timeline: parsed.data.timeline.length,
          templates: parsed.data.templates.length,
        });
        setImportStatus('previewing');
        setImportError(null);
      } catch {
        setImportStatus('error');
        setImportError('无法解析 JSON 文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importRawData) return;
    setImportStatus('importing');
    try {
      const result = await importFromV1Export(importRawData as Parameters<typeof importFromV1Export>[0]);
      setImportResult(result);
      setImportStatus('success');
      useCRMStore.setState({ isInitialized: false });
      await useCRMStore.getState().initialize();
    } catch (err) {
      setImportStatus('error');
      setImportError(err instanceof Error ? err.message : '导入失败');
    }
  };

  const handleCancelImport = () => {
    setImportStatus('idle');
    setImportPreview(null);
    setImportRawData(null);
    setImportError(null);
  };

  const handleEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleSave = (id: string) => {
    updateTemplate(id, { content: editContent });
    setEditingId(null);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="sticky top-0 bg-slate-50/90 backdrop-blur-xl pt-4 pb-3 z-10">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">系统设置</h2>
        <p className="text-slate-500 text-sm mt-0.5">定制你的专属跟进话术</p>
      </div>

      {/* AI Usage */}
      {isAIConfigured() && (() => {
        const usage = getAIUsage();
        return (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100/80 overflow-hidden">
            <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border-b border-purple-100/50">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-purple-900 flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI 用量
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('确定清零用量记录？')) {
                      resetAIUsage();
                      window.location.reload();
                    }
                  }}
                  className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> 清零
                </button>
              </div>
              <p className="text-xs text-purple-700/80 mt-2 font-medium">
                模型: Claude Sonnet 4 · 实际余额请查看 <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener" className="underline">Anthropic 控制台</a>
              </p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-purple-50/50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-purple-900">{usage.totalCalls}</p>
                  <p className="text-[11px] text-purple-600 font-semibold mt-1">总调用次数</p>
                </div>
                <div className="bg-purple-50/50 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-purple-900">${usage.estimatedCostUSD.toFixed(3)}</p>
                  <p className="text-[11px] text-purple-600 font-semibold mt-1">估算花费</p>
                </div>
                <div className="bg-purple-50/50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-bold text-purple-800">{(usage.totalInputTokens / 1000).toFixed(1)}K</p>
                  <p className="text-[11px] text-purple-600 font-semibold mt-1">输入 Tokens</p>
                </div>
                <div className="bg-purple-50/50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-bold text-purple-800">{(usage.totalOutputTokens / 1000).toFixed(1)}K</p>
                  <p className="text-[11px] text-purple-600 font-semibold mt-1">输出 Tokens</p>
                </div>
              </div>

              {usage.history.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">最近 7 天</p>
                  <div className="space-y-1.5">
                    {usage.history.slice(-7).reverse().map((h) => (
                      <div key={h.date} className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-mono">{h.date}</span>
                        <span className="text-slate-700 font-semibold">{h.calls} 次 · {((h.inputTokens + h.outputTokens) / 1000).toFixed(1)}K tokens</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Data Export */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100/80 overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 border-b border-emerald-100/50">
          <h3 className="font-bold text-emerald-900 flex items-center gap-2 text-lg">
            <Download className="w-5 h-5 text-emerald-600" />
            数据导出
          </h3>
          <p className="text-xs text-emerald-700/80 mt-2 font-medium">
            导出所有数据到 JSON 文件，用于备份或迁移
          </p>
        </div>
        <div className="p-5">
          <button
            type="button"
            onClick={handleExport}
            className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-semibold hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exported ? '已下载!' : '导出全部数据'}
          </button>
        </div>
      </div>

      {/* Data Import */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100/80 overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-amber-100/50">
          <h3 className="font-bold text-amber-900 flex items-center gap-2 text-lg">
            <Upload className="w-5 h-5 text-amber-600" />
            数据导入
          </h3>
          <p className="text-xs text-amber-700/80 mt-2 font-medium">
            从导出的 JSON 文件导入数据
          </p>
        </div>
        <div className="p-5 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="选择 JSON 文件"
          />

          {importStatus === 'idle' && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-amber-600 text-white py-3 rounded-2xl font-semibold hover:bg-amber-700 active:scale-95 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              选择 JSON 文件
            </button>
          )}

          {importStatus === 'previewing' && importPreview && (
            <div className="space-y-3">
              <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-900 space-y-1">
                <p className="font-semibold">找到以下数据：</p>
                <p>{importPreview.events} 个展会</p>
                <p>{importPreview.leads} 个客户</p>
                <p>{importPreview.timeline} 条时间线</p>
                <p>{importPreview.templates} 个模板</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelImport}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-semibold hover:bg-slate-200 active:scale-95 transition-all"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="flex-1 bg-amber-600 text-white py-3 rounded-2xl font-semibold hover:bg-amber-700 active:scale-95 transition-all shadow-md shadow-amber-500/20"
                >
                  确认导入
                </button>
              </div>
            </div>
          )}

          {importStatus === 'importing' && (
            <div className="flex items-center justify-center gap-2 py-3 text-amber-700">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-semibold">导入中...</span>
            </div>
          )}

          {importStatus === 'success' && importResult && (
            <div className="bg-emerald-50 rounded-2xl p-4 text-sm text-emerald-900 space-y-1">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                导入成功!
              </p>
              <p>{importResult.events} 个展会, {importResult.leads} 个客户, {importResult.timeline} 条时间线, {importResult.templates} 个模板</p>
            </div>
          )}

          {importStatus === 'error' && importError && (
            <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-900 space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                {importError}
              </p>
              <button
                type="button"
                onClick={handleCancelImport}
                className="text-red-600 font-semibold text-xs underline"
              >
                重试
              </button>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Templates */}
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
                    type="button"
                    onClick={() => handleEdit(template.id, template.content)}
                    className="text-sm text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> 编辑
                  </button>
                ) : (
                  <button
                    type="button"
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
                  placeholder="输入模板内容..."
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
