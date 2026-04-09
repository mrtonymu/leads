import React, { useState, useRef } from 'react';
import { useCRMStore } from '../store';
import { ArrowLeft, Plus, Edit2, Save, Trash2, X, ImagePlus, Loader2 } from 'lucide-react';
import { DayType, DAY_TYPE_LABELS, DAY_TYPE_COLORS } from '../types';
import { uploadProjectImage } from '../lib/db';

const DAY_TYPES: DayType[] = ['day0', 'day1', 'day3', 'day7'];

interface Props {
  projectId: string;
  onBack: () => void;
}

export function ProjectDetail({ projectId, onBack }: Props) {
  const { projects, templates, updateProject, addTemplate, updateTemplate, deleteTemplate } = useCRMStore();
  const project = projects.find((p) => p.id === projectId);

  const [editingSellingPoints, setEditingSellingPoints] = useState(false);
  const [sellingPointsText, setSellingPointsText] = useState('');

  // Template editing
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Adding new template
  const [addingDayType, setAddingDayType] = useState<DayType | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!project) return null;

  const projectTemplates = templates.filter((t) => t.projectId === projectId);

  const handleSaveSellingPoints = async () => {
    const points = sellingPointsText.split('\n').map((s) => s.trim()).filter(Boolean);
    await updateProject(projectId, { sellingPoints: points });
    setEditingSellingPoints(false);
  };

  const handleEditTemplate = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId);
    if (!t) return;
    setEditingTemplateId(templateId);
    setEditTitle(t.title);
    setEditContent(t.content);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplateId) return;
    await updateTemplate(editingTemplateId, { title: editTitle, content: editContent });
    setEditingTemplateId(null);
  };

  const handleAddTemplate = async (dayType: DayType) => {
    if (!newTitle.trim() || !newContent.trim()) return;
    await addTemplate({
      projectId,
      dayType,
      title: newTitle,
      content: newContent,
    });
    setAddingDayType(null);
    setNewTitle('');
    setNewContent('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files) as File[]) {
        const url = await uploadProjectImage(projectId, file);
        newUrls.push(url);
      }
      await updateProject(projectId, { images: [...project.images, ...newUrls] });
    } catch (err) {
      console.error('Upload failed:', err);
      alert('图片上传失败，请确保 Supabase Storage 已创建 project-images bucket');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    const newImages = project.images.filter((img) => img !== imageUrl);
    await updateProject(projectId, { images: newImages });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto pb-24 animate-in slide-in-from-right-full duration-300">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3 flex items-center gap-3 z-20 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-lg text-slate-900 tracking-tight">{project.name}</h2>
          {project.description && <p className="text-xs text-slate-500">{project.description}</p>}
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-md mx-auto mt-2">
        {/* Project Images */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 text-lg">项目图片 ({project.images.length})</h3>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-sm text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              {isUploading ? '上传中...' : '上传'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              title="选择项目图片"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {project.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {project.images.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-100">
                  <img src={url} alt={`项目图片 ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    title="删除图片"
                    onClick={() => handleRemoveImage(url)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-8 border border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-2"
            >
              <ImagePlus className="w-8 h-8" />
              <span>点击上传项目图片</span>
              <span className="text-xs">地图、效果图、户型图等</span>
            </button>
          )}
        </div>

        {/* Selling Points */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 text-lg">卖点</h3>
            {!editingSellingPoints ? (
              <button
                onClick={() => {
                  setSellingPointsText(project.sellingPoints.join('\n'));
                  setEditingSellingPoints(true);
                }}
                className="text-sm text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> 编辑
              </button>
            ) : (
              <button
                onClick={handleSaveSellingPoints}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" /> 保存
              </button>
            )}
          </div>

          {editingSellingPoints ? (
            <textarea
              value={sellingPointsText}
              onChange={(e) => setSellingPointsText(e.target.value)}
              rows={6}
              placeholder="每行一个卖点，例如：&#10;Freehold & Low Density&#10;Ready to Move In&#10;970-1400 sqf"
              className="w-full p-4 bg-slate-50 border border-slate-200/80 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none text-sm text-slate-700 transition-all"
            />
          ) : project.sellingPoints.length > 0 ? (
            <ul className="space-y-2">
              {project.sellingPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">暂无卖点，点击编辑添加</p>
          )}
        </div>

        {/* Templates by Day */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100/80 overflow-hidden">
          <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100/50">
            <h3 className="font-bold text-blue-900 text-lg">消息模板</h3>
            <p className="text-xs text-blue-700/80 mt-1 font-medium">
              变量: <code className="bg-blue-100/50 text-blue-800 px-1.5 py-0.5 rounded-md">{'{{name}}'}</code>
              <code className="bg-blue-100/50 text-blue-800 px-1.5 py-0.5 rounded-md ml-1">{'{{project}}'}</code>
              <code className="bg-blue-100/50 text-blue-800 px-1.5 py-0.5 rounded-md ml-1">{'{{event}}'}</code>
            </p>
          </div>

          <div className="divide-y divide-slate-100/80">
            {DAY_TYPES.map((dayType) => {
              const dayTemplate = projectTemplates.find((t) => t.dayType === dayType);
              const isEditing = editingTemplateId === dayTemplate?.id;
              const isAddingThis = addingDayType === dayType;

              return (
                <div key={dayType} className="p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${DAY_TYPE_COLORS[dayType]}`}>
                      {DAY_TYPE_LABELS[dayType]}
                    </span>
                    {dayTemplate && !isEditing && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditTemplate(dayTemplate.id)}
                          className="text-sm text-blue-600 font-semibold hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('确定删除此模板？')) deleteTemplate(dayTemplate.id);
                          }}
                          className="text-sm text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Existing template */}
                  {dayTemplate && !isEditing && (
                    <div>
                      <p className="font-semibold text-sm text-slate-800 mb-1">{dayTemplate.title}</p>
                      <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-600 whitespace-pre-wrap border border-slate-100/50 leading-relaxed">
                        {dayTemplate.content}
                      </div>
                    </div>
                  )}

                  {/* Editing existing template */}
                  {isEditing && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                        placeholder="模板标题"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none transition-all"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingTemplateId(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                        <button onClick={handleSaveTemplate} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md active:scale-95 transition-all">
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* No template yet — add button */}
                  {!dayTemplate && !isAddingThis && (
                    <button
                      onClick={() => {
                        setAddingDayType(dayType);
                        setNewTitle(DAY_TYPE_LABELS[dayType]);
                        setNewContent('');
                      }}
                      className="w-full py-3 border border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> 添加模板
                    </button>
                  )}

                  {/* Adding new template */}
                  {isAddingThis && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                        placeholder="模板标题"
                      />
                      <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        rows={4}
                        placeholder="模板内容... 可使用 {{name}} {{project}} {{event}} 变量"
                        className="w-full p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none transition-all"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setAddingDayType(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                          取消
                        </button>
                        <button onClick={() => handleAddTemplate(dayType)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md active:scale-95 transition-all">
                          保存
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
