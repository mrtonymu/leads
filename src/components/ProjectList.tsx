import React, { useState } from 'react';
import { useCRMStore } from '../store';
import { Plus, Building2, FileText, Trash2, ChevronRight } from 'lucide-react';
import { ProjectDetail } from './ProjectDetail';

export function ProjectList() {
  const { projects, templates, addProject, deleteProject } = useCRMStore();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addProject({ name, description, sellingPoints: [] });
    setName('');
    setDescription('');
    setIsAdding(false);
  };

  if (selectedProjectId) {
    return <ProjectDetail projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />;
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex justify-between items-center sticky top-0 bg-slate-50/90 backdrop-blur-xl pt-4 pb-3 z-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">楼盘项目</h2>
          <p className="text-slate-500 text-sm mt-0.5">管理项目资料和消息模板</p>
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
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">项目名称 *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: IOI Resort City"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">项目简介</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如: Semi-D | Bungalow Concept"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
            />
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
        {projects.length === 0 && !isAdding && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium">还没有创建任何项目</p>
            <p className="text-xs mt-1">创建楼盘项目后，可以为每个项目设置 Day 0-7 模板</p>
          </div>
        )}
        {projects.map((project) => {
          const projectTemplates = templates.filter((t) => t.projectId === project.id);
          const templateCount = projectTemplates.length;
          const hasAllDays = ['day0', 'day1', 'day3', 'day7'].every((d) =>
            projectTemplates.some((t) => t.dayType === d)
          );

          return (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80 cursor-pointer hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                    <h3 className="font-bold text-lg text-slate-900 truncate">{project.name}</h3>
                  </div>
                  {project.description && (
                    <p className="text-sm text-slate-500 ml-7">{project.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 ml-7">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      <FileText className="w-3 h-3" /> 模板: {templateCount}/4
                      {hasAllDays ? (
                        <span className="text-green-600 ml-1">✓</span>
                      ) : (
                        <span className="text-amber-500 ml-1">!</span>
                      )}
                    </span>
                    {project.images.length > 0 && (
                      <span className="text-xs font-medium text-slate-500">
                        {project.images.length} 张图片
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    title="删除项目"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`确定删除「${project.name}」及其所有模板？`)) {
                        deleteProject(project.id);
                      }
                    }}
                    className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
