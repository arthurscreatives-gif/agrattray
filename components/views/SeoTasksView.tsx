'use client';

import React, { useState } from 'react';
import { Website, SeoTask, TaskStatus } from '@/types/seo';
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SeoTasksViewProps {
  activeWebsite: Website;
  tasks: SeoTask[];
  onSaveTask: (task: SeoTask) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export default function SeoTasksView({
  activeWebsite,
  tasks,
  onSaveTask,
  onDeleteTask,
}: SeoTasksViewProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SeoTask | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pageUrl, setPageUrl] = useState(activeWebsite.url);
  const [category, setCategory] = useState('Metadata Optimization');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [status, setStatus] = useState<TaskStatus>('ready');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [beforeValue, setBeforeValue] = useState('');
  const [proposedValue, setProposedValue] = useState('');
  const [finalAppliedValue, setFinalAppliedValue] = useState('');
  const [verificationResult, setVerificationResult] = useState('');

  const websiteTasks = tasks.filter((t) => t.websiteId === activeWebsite?.id);

  // Focused 2-Task discipline
  const activeFocusTasks = websiteTasks.filter((t) => t.status === 'in_progress' || t.status === 'ready').slice(0, 2);

  const statuses: { id: TaskStatus; label: string; count: number }[] = [
    { id: 'backlog', label: 'Backlog', count: websiteTasks.filter((t) => t.status === 'backlog').length },
    { id: 'ready', label: 'Ready', count: websiteTasks.filter((t) => t.status === 'ready').length },
    { id: 'in_progress', label: 'In Progress', count: websiteTasks.filter((t) => t.status === 'in_progress').length },
    { id: 'applied', label: 'Applied', count: websiteTasks.filter((t) => t.status === 'applied').length },
    { id: 'needs_verification', label: 'Needs Verification', count: websiteTasks.filter((t) => t.status === 'needs_verification').length },
    { id: 'completed', label: 'Completed', count: websiteTasks.filter((t) => t.status === 'completed').length },
    { id: 'ignored', label: 'Ignored', count: websiteTasks.filter((t) => t.status === 'ignored').length },
  ];

  const filteredTasks = websiteTasks.filter((t) => {
    if (selectedStatus === 'all') return true;
    return t.status === selectedStatus;
  });

  const handleOpenAdd = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPageUrl(activeWebsite.url);
    setCategory('Metadata Optimization');
    setPriority('high');
    setStatus('ready');
    setDueDate('');
    setNotes('');
    setBeforeValue('');
    setProposedValue('');
    setFinalAppliedValue('');
    setVerificationResult('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: SeoTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setPageUrl(task.pageUrl);
    setCategory(task.category);
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.dueDate || '');
    setNotes(task.notes || '');
    setBeforeValue(task.beforeValue || '');
    setProposedValue(task.proposedValue || '');
    setFinalAppliedValue(task.finalAppliedValue || '');
    setVerificationResult(task.verificationResult || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const taskPayload: SeoTask = {
      id: editingTask ? editingTask.id : `task_${Date.now()}`,
      websiteId: activeWebsite.id,
      userId: '',
      title,
      description,
      pageUrl,
      category,
      priority,
      status,
      dueDate,
      notes,
      beforeValue,
      proposedValue,
      finalAppliedValue,
      verificationResult,
      completionDate: status === 'completed' ? new Date().toISOString() : undefined,
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
    };

    await onSaveTask(taskPayload);
    setIsModalOpen(false);
  };

  const handleQuickStatusChange = async (task: SeoTask, newStatus: TaskStatus) => {
    await onSaveTask({
      ...task,
      status: newStatus,
      completionDate: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">SEO Task Board & Execution Center</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
              {activeWebsite.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Focus-disciplined pipeline: Limit active execution to 2 high-leverage items at a time to prevent burnout.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create SEO Task</span>
        </button>
      </div>

      {/* Focus Box: Current 2 Priorities */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Current Active Focus (Max 2 Tasks Rule)</h3>
          </div>
          <span className="text-xs text-slate-400">
            {activeFocusTasks.length} / 2 active slots
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeFocusTasks.map((t) => (
            <div key={t.id} className="bg-slate-800/90 border border-slate-700 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {t.priority} priority
                  </span>
                  <span className="text-xs font-semibold text-slate-300 capitalize">{t.status.replace('_', ' ')}</span>
                </div>
                <h4 className="font-bold text-white text-sm mt-2">{t.title}</h4>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{t.description}</p>
                <div className="text-[11px] text-slate-400 mt-2 font-mono truncate">{t.pageUrl}</div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                <button
                  onClick={() => handleQuickStatusChange(t, 'applied')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                >
                  Mark Applied
                </button>
                <button
                  onClick={() => handleOpenEdit(t)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Edit Details
                </button>
              </div>
            </div>
          ))}

          {activeFocusTasks.length === 0 && (
            <div className="col-span-2 text-center py-6 text-slate-400 text-xs">
              No tasks currently marked &ldquo;Ready&rdquo; or &ldquo;In Progress&rdquo;. Select up to two from your backlog below.
            </div>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            selectedStatus === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Tasks ({websiteTasks.length})
        </button>
        {statuses.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStatus(s.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              selectedStatus === s.id
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s.label} ({s.count})
          </button>
        ))}
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{task.title}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      task.priority === 'high'
                        ? 'bg-rose-100 text-rose-800'
                        : task.priority === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {task.priority}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">{task.category}</span>
                </div>

                <p className="text-xs text-slate-600">{task.description}</p>
                <div className="text-[11px] text-slate-400 font-mono truncate">{task.pageUrl}</div>

                {task.proposedValue && (
                  <div className="mt-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-slate-700">
                    <span className="text-slate-400 block font-sans uppercase font-bold text-[9px] mb-0.5">
                      Proposed Value:
                    </span>
                    {task.proposedValue}
                  </div>
                )}
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <select
                  value={task.status}
                  onChange={(e) => handleQuickStatusChange(task, e.target.value as TaskStatus)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="backlog">Backlog</option>
                  <option value="ready">Ready</option>
                  <option value="in_progress">In Progress</option>
                  <option value="applied">Applied</option>
                  <option value="needs_verification">Needs Verification</option>
                  <option value="completed">Completed</option>
                  <option value="ignored">Ignored</option>
                </select>

                <button
                  onClick={() => handleOpenEdit(task)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  title="Edit task"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No tasks found in this view.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingTask ? 'Edit SEO Task' : 'Create New SEO Task'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Update Homepage H1 to include Los Angeles..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Page URL
                </label>
                <input
                  type="url"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  placeholder="https://arthurscreatives.com/services"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Pipeline Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="ready">Ready</option>
                    <option value="in_progress">In Progress</option>
                    <option value="applied">Applied</option>
                    <option value="needs_verification">Needs Verification</option>
                    <option value="completed">Completed</option>
                    <option value="ignored">Ignored</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description & Context
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why this change is necessary..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Before Value
                  </label>
                  <textarea
                    rows={2}
                    value={beforeValue}
                    onChange={(e) => setBeforeValue(e.target.value)}
                    placeholder="Existing code/copy..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Proposed Value
                  </label>
                  <textarea
                    rows={2}
                    value={proposedValue}
                    onChange={(e) => setProposedValue(e.target.value)}
                    placeholder="New proposed code/copy..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                >
                  {editingTask ? 'Update Task' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
