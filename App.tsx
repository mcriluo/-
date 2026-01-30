
import React, { useState, useEffect, useMemo, createContext, useContext, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  Home, 
  ClipboardList, 
  History, 
  Database, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  FileJson, 
  FileSpreadsheet, 
  Calendar as CalendarIcon, 
  Search, 
  X,
  Minus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { 
  HierarchyData, 
  FeedbackForm, 
  HistoryRecord, 
  DailyStats, 
  BaseEntity, 
  ManagementView as ManagementViewType 
} from './types';
import { INITIAL_DATA, STORAGE_KEYS, DEFAULT_FORM, QUANTITY_PRESETS } from './constants';
import { storage } from './services/storageService';

// --- Global State Context ---
interface AppContextType {
  data: HierarchyData;
  setData: React.Dispatch<React.SetStateAction<HierarchyData>>;
  history: HistoryRecord[];
  addHistory: (record: Omit<HistoryRecord, 'id'>) => void;
  deleteHistory: (id: number) => void;
  clearHistory: () => void;
  stats: DailyStats;
  updateStats: (date: string, carModelId: string, issueId: string, delta: number) => void;
  clearStatsForDate: (date: string) => void;
  notification: { msg: string; type: 'success' | 'error' } | null;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  hideNotification: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<HierarchyData>(() => storage.get(STORAGE_KEYS.DATA, INITIAL_DATA));
  const [history, setHistory] = useState<HistoryRecord[]>(() => storage.get(STORAGE_KEYS.HISTORY, []));
  const [stats, setStats] = useState<DailyStats>(() => storage.get(STORAGE_KEYS.STATS, {}));
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => storage.set(STORAGE_KEYS.DATA, data), [data]);
  useEffect(() => storage.set(STORAGE_KEYS.HISTORY, history), [history]);
  useEffect(() => storage.set(STORAGE_KEYS.STATS, stats), [stats]);

  const addHistory = useCallback((record: Omit<HistoryRecord, 'id'>) => {
    const newRecord = { ...record, id: Date.now() };
    setHistory(prev => [newRecord, ...prev]);
  }, []);

  const deleteHistory = useCallback((id: number) => {
    setHistory(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const updateStats = useCallback((date: string, carModelId: string, issueId: string, delta: number) => {
    setStats(prev => {
      const newStats = { ...prev };
      if (!newStats[date]) newStats[date] = {};
      if (!newStats[date][carModelId]) newStats[date][carModelId] = {};
      
      const current = newStats[date][carModelId][issueId] || 0;
      const next = Math.max(0, current + delta);
      
      newStats[date][carModelId][issueId] = next;
      return newStats;
    });
  }, []);

  const clearStatsForDate = useCallback((date: string) => {
    setStats(prev => {
      const newStats = { ...prev };
      delete newStats[date];
      return newStats;
    });
  }, []);

  const showNotification = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const contextValue = useMemo(() => ({
    data, setData,
    history, addHistory, deleteHistory, clearHistory,
    stats, updateStats, clearStatsForDate,
    notification, showNotification, hideNotification
  }), [data, history, stats, notification, addHistory, deleteHistory, clearHistory, updateStats, clearStatsForDate, showNotification, hideNotification]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

// --- Reusable UI Components ---

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ className = '', variant = 'primary', ...props }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white active:bg-indigo-700',
    secondary: 'bg-white text-slate-700 border border-slate-300 active:bg-slate-50',
    danger: 'bg-red-50 text-red-600 border border-red-200 active:bg-red-100',
    ghost: 'bg-transparent text-slate-600 active:bg-slate-100'
  };
  return (
    <button className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${variants[variant]} ${className}`} {...props} />
  );
};

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; required?: boolean }> = ({ label, required, className = '', ...props }) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-sm font-medium text-slate-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <select className={`w-full appearance-none bg-white border border-slate-200 text-slate-900 text-base rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-8 shadow-sm ${className}`} {...props}>
        {props.children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
        <ChevronLeft className="h-5 w-5 -rotate-90" />
      </div>
    </div>
  </div>
);

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/feedback', label: '反馈', icon: ClipboardList },
    { path: '/history', label: '历史', icon: History },
    { path: '/management', label: '管理', icon: Database },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-bottom pb-safe flex justify-around items-center h-16 z-50">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const NotificationToast = () => {
  const { notification, hideNotification } = useAppContext();
  if (!notification) return null;
  return (
    <div className={`fixed top-4 mt-safe left-4 right-4 z-[100] p-4 rounded-lg shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-2 fade-in duration-300 ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      <div className="flex items-center gap-3">
        {notification.type === 'success' ? <Check size={20} /> : <X size={20} />}
        <span className="font-medium text-sm">{notification.msg}</span>
      </div>
      <button 
        onClick={hideNotification}
        className="p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
};

// --- Views ---

// 1. Home View (Stats)
const HomeView = () => {
  const { stats, updateStats, clearStatsForDate, data, showNotification } = useAppContext();
  
  // Helper to get local date string YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [activeCarModel, setActiveCarModel] = useState<string>(data.carModels[0]?.id || '');
  
  const chartData = useMemo(() => {
    const dailyData = stats[selectedDate] || {};
    return data.carModels.map(model => {
      const modelStats = dailyData[model.id] || {};
      // FIX: Cast Object.values to number[] to resolve unknown + unknown error
      const totalIssues = (Object.values(modelStats) as number[]).reduce((a, b) => a + b, 0);
      return {
        name: model.name,
        count: totalIssues,
        id: model.id
      };
    }).filter(d => d.count > 0);
  }, [stats, selectedDate, data.carModels]);

  const checkEditable = () => {
    const todayStr = getTodayStr();
    if (selectedDate !== todayStr) {
       showNotification("只能编辑今日的统计数据", "error");
       return false;
    }
    return true;
  };

  const handleClearStats = () => {
    if (!checkEditable()) return;
    if (window.confirm('确定要清空该日期的所有统计数据吗？此操作不可恢复。')) {
      clearStatsForDate(selectedDate);
      showNotification('数据已清空');
    }
  };

  const handleIncrement = (issueId: string) => {
    if (!activeCarModel) return;
    if (!checkEditable()) return;
    updateStats(selectedDate, activeCarModel, issueId, 1);
  };

  const handleDecrement = (issueId: string) => {
    if (!activeCarModel) return;
    if (!checkEditable()) return;
    updateStats(selectedDate, activeCarModel, issueId, -1);
  };

  const getIssueCount = (issueId: string) => {
    return stats[selectedDate]?.[activeCarModel]?.[issueId] || 0;
  };

  const getModelTotal = (modelId: string) => {
    const modelStats = stats[selectedDate]?.[modelId] || {};
    // FIX: Cast Object.values to number[] to resolve unknown + unknown error
    return (Object.values(modelStats) as number[]).reduce((a, b) => a + b, 0);
  };

  const activeIssues = data.issues
    .map(issue => ({ ...issue, count: getIssueCount(issue.id) }))
    .filter(i => i.count > 0);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6 no-scrollbar">
        <header className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100">
          <h1 className="text-lg font-bold text-slate-800">异常统计看板</h1>
          <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg">
             <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-slate-600 outline-none"
            />
          </div>
        </header>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-64 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-semibold text-slate-400">每日车型异常统计</h2>
            {chartData.length > 0 && (
              <button 
                onClick={handleClearStats}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                title="清空今日统计"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="flex-1 w-full min-h-0">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.id === activeCarModel ? '#6366f1' : '#a5b4fc'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">该日期无数据</div>
          )}
          </div>
        </div>

        {/* Car Model Selector */}
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 select-none snap-x">
          {data.carModels.map(model => {
            const total = getModelTotal(model.id);
            const isActive = activeCarModel === model.id;
            return (
              <button
                key={model.id}
                onClick={() => setActiveCarModel(model.id)}
                className={`
                  relative flex-shrink-0 w-24 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all snap-start
                  ${isActive ? 'bg-indigo-50 border-2 border-indigo-500 shadow-sm' : 'bg-white border border-slate-200'}
                `}
              >
                {total > 0 && (
                  <span className="absolute top-1 right-1 bg-indigo-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                    {total}
                  </span>
                )}
                <span className={`text-sm font-medium text-center px-1 truncate w-full ${isActive ? 'text-indigo-900' : 'text-slate-600'}`}>
                  {model.name}
                </span>
              </button>
            )
          })}
        </div>
        
        <p className="text-xs text-slate-400 text-center">
          选择车型查看和添加异常问题 (每日0点自动初始化)
        </p>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-6">
          <div>
            <h3 className="font-bold text-slate-800 mb-3 text-sm">已添加的问题</h3>
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {activeIssues.length === 0 && (
                <span className="text-xs text-slate-400 py-2">暂无异常问题，请从下方选择添加</span>
              )}
              {activeIssues.map(item => (
                <div key={item.id} className="bg-indigo-500 text-white pl-3 pr-2 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-200">
                  <span>{item.name}</span>
                  {item.count > 1 && <span className="text-indigo-200 text-xs">x{item.count}</span>}
                  <button 
                    onClick={() => handleDecrement(item.id)}
                    className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full"></div>

          <div>
            <h3 className="font-bold text-slate-800 mb-3 text-sm">失效问题库</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {data.issues.map(issue => (
                <button
                  key={issue.id}
                  onClick={() => handleIncrement(issue.id)}
                  className="py-2.5 px-1 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 shadow-sm"
                >
                  {issue.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeedbackView = () => {
  const { data, addHistory, showNotification } = useAppContext();
  const [form, setForm] = useState<FeedbackForm>(DEFAULT_FORM);

  const findName = (list: BaseEntity[], id: string) => list.find(x => x.id === id)?.name || '未知';
  const findCode = (id: string) => data.productCodes.find(x => x.id === id)?.code || '未知';

  const filteredProcesses = useMemo(() => data.processes.filter(p => p.departmentId === form.departmentId), [data.processes, form.departmentId]);
  const filteredProducts = useMemo(() => data.productNames.filter(p => p.processId === form.processId), [data.productNames, form.processId]);
  const filteredModels = useMemo(() => data.carModels.filter(m => m.productNameId === form.productNameId), [data.carModels, form.productNameId]);
  const filteredCodes = useMemo(() => data.productCodes.filter(c => c.carModelId === form.carModelId), [data.productCodes, form.carModelId]);

  useEffect(() => {
    setForm(f => ({
      ...f,
      departmentId: f.departmentId || data.departments[0]?.id || '',
      issueId: f.issueId || data.issues[0]?.id || '',
      reporterId: f.reporterId || data.reporters[0]?.id || ''
    }));
  }, [data.departments, data.issues, data.reporters]);

  useEffect(() => { 
    const first = filteredProcesses[0]?.id || '';
    setForm(f => ({ ...f, processId: first, productNameId: '', carModelId: '', productCodeId: '' }));
  }, [form.departmentId, data.processes]);

  useEffect(() => { 
    const first = filteredProducts[0]?.id || '';
    setForm(f => ({ ...f, productNameId: first, carModelId: '', productCodeId: '' }));
  }, [form.processId, data.productNames]);

  useEffect(() => { 
    const first = filteredModels[0]?.id || '';
    setForm(f => ({ ...f, carModelId: first, productCodeId: '' }));
  }, [form.productNameId, data.carModels]);

  useEffect(() => { 
    const first = filteredCodes[0]?.id || '';
    setForm(f => ({ ...f, productCodeId: first }));
  }, [form.carModelId, data.productCodes]);

  const toggleMeasure = (id: string) => {
    setForm(prev => {
      const exists = prev.measureIds.includes(id);
      return {
        ...prev,
        measureIds: exists ? prev.measureIds.filter(m => m !== id) : [...prev.measureIds, id]
      };
    });
  };

  const generateText = () => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const qtyText = QUANTITY_PRESETS.find(q => q.value === form.quantityPreset)?.text || `${form.quantity} 件`;
    const measuresText = form.measureIds.map(id => findName(data.measures, id)).join('、');

    return `质量异常反馈：
发现工序：${findName(data.processes, form.processId)}
发现时间：${timeStr}
责任部门：${findName(data.departments, form.departmentId)}
车型：${findName(data.carModels, form.carModelId)}
产品名称：${findName(data.productNames, form.productNameId)}
${findCode(form.productCodeId)}
失效问题：${findName(data.issues, form.issueId)}
发现数量：${qtyText}
问题等级：${form.grade}
反馈人：${findName(data.reporters, form.reporterId)}
处置措施：${measuresText}`;
  };

  const handleSubmit = async () => {
    if (!form.departmentId || !form.processId || !form.issueId) {
      showNotification("请填写必填项", "error");
      return;
    }

    const content = generateText();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    addHistory({
      timestamp: Date.now(),
      dateStr: dateStr,
      timeStr: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      content,
      formData: form
    });

    try {
      await navigator.clipboard.writeText(content);
      showNotification("已生成并复制！");
    } catch (e) {
      showNotification("已生成（复制失败）", "error");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 overflow-y-auto p-4 pb-48 space-y-5">
        <h1 className="text-xl font-bold text-slate-900 mb-2">新建质量反馈</h1>
        
        <div className="flex gap-4">
          <Select label="责任部门" required value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})}>
            <option value="">请选择部门</option>
            {data.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select label="发现工序" required value={form.processId} onChange={e => setForm({...form, processId: e.target.value})} disabled={!form.departmentId}>
            <option value="">请选择工序</option>
            {filteredProcesses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>

        <div className="flex gap-4">
          <Select label="产品名称" required value={form.productNameId} onChange={e => setForm({...form, productNameId: e.target.value})} disabled={!form.processId}>
            <option value="">请选择产品</option>
            {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="车型" value={form.carModelId} onChange={e => setForm({...form, carModelId: e.target.value})} disabled={!form.productNameId}>
            <option value="">请选择车型</option>
            {filteredModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </div>

        <Select label="产品编码" value={form.productCodeId} onChange={e => setForm({...form, productCodeId: e.target.value})} disabled={!form.carModelId}>
          <option value="">请选择编码</option>
          {filteredCodes.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
        </Select>

        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <Select label="失效问题" required value={form.issueId} onChange={e => setForm({...form, issueId: e.target.value})} className="text-center">
              <option value="">请选择问题</option>
              {data.issues.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </div>
          <div className="w-[140px] flex-none">
            <label className="text-sm font-medium text-slate-700 block mb-2">问题等级 *</label>
            <div className="flex bg-slate-200 p-1 rounded-lg h-[50px]">
              {['V1', 'V2'].map(g => (
                <button
                  key={g}
                  onClick={() => setForm({...form, grade: g as any})}
                  className={`flex-1 rounded-md text-sm font-bold transition-all ${
                    form.grade === g ? 'bg-white text-indigo-600 shadow-sm scale-95' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
           <label className="text-sm font-medium text-slate-700 block mb-2">发现数量</label>
           <div className="flex flex-wrap gap-3 items-center justify-center">
             {QUANTITY_PRESETS.map(preset => {
               const isCircle = ['1', '2', '3', '5'].includes(preset.value);
               const isActive = form.quantityPreset === preset.value;
               return (
                 <button 
                  key={preset.value} 
                  onClick={() => setForm({...form, quantityPreset: preset.value as any, quantity: preset.value === 'Batch' ? 10 : parseInt(preset.value) || 1})}
                  className={`
                    flex items-center justify-center font-medium transition-all shadow-sm
                    ${isCircle ? 'w-12 h-12 rounded-full' : 'h-12 px-6 rounded-2xl'}
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md transform scale-105' 
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }
                  `}
                 >
                   {preset.value === 'Batch' ? preset.label : preset.value}
                 </button>
               );
             })}
           </div>
        </div>

        <div>
           <label className="text-sm font-medium text-slate-700 block mb-2">处置措施 (可多选)</label>
           <div className="flex flex-wrap gap-3 justify-center">
             {data.measures.map(m => (
               <button 
                key={m.id} 
                onClick={() => toggleMeasure(m.id)}
                className={`
                  px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm
                  ${form.measureIds.includes(m.id) 
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                    : 'bg-white text-slate-600 border border-slate-200'
                  }
                `}
               >
                 {m.name}
               </button>
             ))}
           </div>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-40">
        <Button onClick={handleSubmit} className="w-full h-12 text-lg shadow-lg shadow-indigo-200 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700">
          生成并复制内容
        </Button>
      </div>
    </div>
  );
};

// 3. History View
const HistoryView = () => {
  const { history, deleteHistory, data, showNotification } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = history.filter(h => 
    h.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.dateStr.includes(searchTerm)
  );

  /**
   * Enhanced Export Functionality for Mobile Apps
   */
  const handleExport = async (fileName: string, blob: Blob) => {
    // 1. Try Web Share API (Primary for Mobile)
    if (navigator.share) {
      try {
        const file = new File([blob], fileName, { type: blob.type });
        // Check if environment supports sharing this specific file
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: '导出历史数据',
          });
          showNotification("分享面板已呼出");
          return;
        }
      } catch (err) {
        // AbortError is normal when user cancels
        if ((err as Error).name !== 'AbortError') {
          console.warn('Share API failed, falling back to download...', err);
        } else {
          return;
        }
      }
    }

    // 2. Standard Download Fallback (PC or browser-based mobile)
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      // In some WebViews, a direct click() isn't enough, we need to append to DOM
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);
      
      showNotification("已尝试启动下载，请检查文件系统或浏览器通知栏");
    } catch (e) {
      console.error("Download failed", e);
      // Final fallback: Alert the user with more context
      showNotification("导出由于应用环境限制失效，请尝试使用系统浏览器打开本应用", "error");
    }
  };

  const exportJSON = () => {
    const jsonStr = JSON.stringify(history, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    handleExport(`quality_history_${dateStr}.json`, blob);
  };

  const exportExcel = () => {
    const findName = (list: BaseEntity[], id: string) => list.find(x => x.id === id)?.name || '未知';
    const findCode = (id: string) => data.productCodes.find(x => x.id === id)?.code || '未知';
    
    const rows = history.map(h => {
       const f = h.formData;
       const measures = f.measureIds.map(mid => findName(data.measures, mid)).join(', ');
       const qtyText = QUANTITY_PRESETS.find(q => q.value === f.quantityPreset)?.text || `${f.quantity}`;

       return {
         "记录ID": h.id,
         "发现日期": h.dateStr,
         "发现时间": h.timeStr,
         "工序": findName(data.processes, f.processId),
         "责任部门": findName(data.departments, f.departmentId),
         "车型": findName(data.carModels, f.carModelId),
         "产品名称": findName(data.productNames, f.productNameId),
         "产品编码": findCode(f.productCodeId),
         "失效问题": findName(data.issues, f.issueId),
         "处置措施": measures,
         "发现数量": qtyText,
         "问题等级": f.grade,
         "反馈人": findName(data.reporters, f.reporterId)
       };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "质量反馈记录");
    
    // Create binary array for better blob handling
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    handleExport(`quality_report_${dateStr}.xlsx`, blob);
  };

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-slate-900">历史记录</h1>
        <div className="flex gap-2">
            <Button variant="ghost" onClick={exportJSON} className="p-2 w-10 h-10 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50">
              <FileJson size={20} className="text-orange-500" />
            </Button>
            <Button variant="ghost" onClick={exportExcel} className="p-2 w-10 h-10 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50">
              <FileSpreadsheet size={20} className="text-emerald-600" />
            </Button>
        </div>
      </div>
      
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="搜索历史记录..." 
          className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
        {filtered.length === 0 && <div className="text-center text-slate-400 mt-10">未找到记录</div>}
        {filtered.map(record => (
          <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <CalendarIcon size={12} />
                <span>{record.dateStr}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>{record.timeStr}</span>
              </div>
              <button onClick={() => deleteHistory(record.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-3 rounded-md border border-slate-100">
              {record.content}
            </p>
            <div className="mt-2 flex justify-end">
               <button 
                onClick={() => navigator.clipboard.writeText(record.content)}
                className="text-xs font-medium text-indigo-600 flex items-center gap-1 active:text-indigo-800"
               >
                 <Copy size={12} /> 复制
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. Management View with Extracted Editor Component to Prevent Re-mounts
// FIX: Redefine props to handle optional key and simplify parentIdKey to avoid generic constraint issues.
interface EditorProps<T extends BaseEntity> {
  title: string;
  items: T[];
  onAdd: (name: string, parentId?: string, secondaryParentId?: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  parentIdKey?: string;
  parentList?: BaseEntity[];
  secondaryParentIdKey?: string;
  secondaryParentList?: BaseEntity[];
}

function Editor<T extends BaseEntity>({ 
  title, 
  items, 
  onAdd, 
  onDelete, 
  onBack,
  parentIdKey, 
  parentList, 
  secondaryParentIdKey, 
  secondaryParentList 
}: EditorProps<T>) {
  const { showNotification } = useAppContext();
  const [newName, setNewName] = useState('');
  const [selectedParent, setSelectedParent] = useState('');
  const [filterParent, setFilterParent] = useState('');

  // Handle Secondary Parent (Filter) Selection Logic
  useEffect(() => {
    if (!secondaryParentList) return;
    
    // Check if current filter selection is valid in the new list
    const isValid = filterParent && secondaryParentList.some(p => p.id === filterParent);
    
    if (!isValid) {
        // If invalid or empty, default to first item
        if (secondaryParentList.length > 0) {
            setFilterParent(secondaryParentList[0].id);
        } else {
            setFilterParent('');
        }
    }
  }, [secondaryParentList, filterParent]);

  // Handle Parent Selection Logic
  useEffect(() => {
      if (!parentList) return;
      
      let filtered = parentList;
      // Apply filter if applicable
      if (secondaryParentIdKey && filterParent) {
          filtered = parentList.filter(p => (p as any)[secondaryParentIdKey] === filterParent);
      }
      
      // Check if current parent selection is valid in the filtered list
      const isValid = selectedParent && filtered.some(p => p.id === selectedParent);
      
      if (!isValid) {
          // If invalid or empty, default to first item
          if (filtered.length > 0) {
              setSelectedParent(filtered[0].id);
          } else {
              setSelectedParent('');
          }
      }
  }, [parentList, filterParent, secondaryParentIdKey, selectedParent]);

  const effectiveParentList = useMemo(() => {
    if (secondaryParentIdKey && parentList) {
       return parentList.filter(p => (p as any)[secondaryParentIdKey] === filterParent);
    }
    return parentList;
  }, [parentList, filterParent, secondaryParentIdKey]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    
    // Check duplicates in the current scope
    const trimmedName = newName.trim();
    // FIX: Cast parentIdKey to any to access dynamic property on T
    const siblings = items.filter(i => !parentIdKey || (i as any)[parentIdKey as any] === selectedParent);
    const isDuplicate = siblings.some(i => (i.name || (i as any).code) === trimmedName);

    if (isDuplicate) {
        showNotification("该名称已存在，请勿重复添加", "error");
        return;
    }

    if (parentIdKey && !selectedParent) {
       showNotification("请选择上级分类", "error");
       return;
    }
    onAdd(trimmedName, selectedParent);
    setNewName('');
    showNotification("添加成功");
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification(`已复制: ${text}`);
    } catch (err) {
      showNotification("复制失败", "error");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 space-y-3">
        {secondaryParentList && (
           <Select label="筛选: 所属车型" value={filterParent} onChange={e => setFilterParent(e.target.value)}>
              {secondaryParentList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
           </Select>
        )}

        {parentList && (
           <Select label="上级分类" value={selectedParent} onChange={e => setSelectedParent(e.target.value)}>
              {effectiveParentList && effectiveParentList.length > 0 ? (
                  effectiveParentList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
              ) : (
                  <option value="" disabled>暂无选项 (请先添加上级数据)</option>
              )}
           </Select>
        )}
        
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:border-indigo-500"
            placeholder={'请输入名称/代码...'}
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <Button onClick={handleAdd} className="w-12 h-10 p-0"><Plus size={20} /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
        {items.filter(i => !parentIdKey || (i as any)[parentIdKey as any] === selectedParent).map(item => (
          <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center group">
            <span 
              className="font-medium text-slate-700 flex-1 cursor-pointer active:text-indigo-600 transition-colors"
              onClick={() => handleCopy(item.name || (item as any).code)}
            >
              {item.name || (item as any).code}
            </span>
            <button onClick={() => onDelete(item.id)} className="text-slate-300 hover:text-red-500 p-2">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {items.filter(i => !parentIdKey || (i as any)[parentIdKey as any] === selectedParent).length === 0 && (
          <div className="text-center text-slate-400 text-sm mt-8">暂无数据</div>
        )}
      </div>
    </div>
  );
}

const ManagementScreen = () => {
  const { data, setData } = useAppContext();
  const [currentView, setCurrentView] = useState<ManagementViewType>('menu');

  const genId = () => Math.random().toString(36).substr(2, 9);
  
  const renderContent = () => {
    switch(currentView) {
      case 'menu':
        const menuItems: { id: ManagementViewType, label: string, count: number }[] = [
          { id: 'departments', label: '部门管理', count: data.departments.length },
          { id: 'processes', label: '工序管理', count: data.processes.length },
          { id: 'products', label: '产品名称管理', count: data.productNames.length },
          { id: 'models', label: '车型管理', count: data.carModels.length },
          { id: 'codes', label: '产品编码管理', count: data.productCodes.length },
          { id: 'issues', label: '失效模式管理', count: data.issues.length },
          { id: 'reporters', label: '反馈人管理', count: data.reporters.length },
          { id: 'measures', label: '处置措施管理', count: data.measures.length },
        ];
        return (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-slate-900 mb-6">数据字典管理</h1>
            <div className="grid grid-cols-2 gap-3">
              {menuItems.map(item => (
                <button 
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-start hover:border-indigo-200 hover:shadow-md transition-all active:scale-95 text-left"
                >
                  <span className="font-bold text-slate-700">{item.label}</span>
                  <span className="text-xs text-slate-400 mt-1">{item.count} 项</span>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'departments':
        return <Editor 
          key="departments"
          onBack={() => setCurrentView('menu')}
          title="部门管理" items={data.departments} 
          onAdd={(name) => setData(d => ({ ...d, departments: [...d.departments, { id: genId(), name }] }))}
          onDelete={(id) => setData(d => {
            const procIds = d.processes.filter(p => p.departmentId === id).map(p => p.id);
            const prodIds = d.productNames.filter(p => procIds.includes(p.processId)).map(p => p.id);
            const modelIds = d.carModels.filter(m => prodIds.includes(m.productNameId)).map(m => m.id);
            return {
              ...d,
              departments: d.departments.filter(x => x.id !== id),
              processes: d.processes.filter(p => !procIds.includes(p.id)),
              productNames: d.productNames.filter(p => !prodIds.includes(p.id)),
              carModels: d.carModels.filter(m => !modelIds.includes(m.id)),
              productCodes: d.productCodes.filter(c => !modelIds.includes(c.carModelId))
            };
          })}
        />;
      
      case 'processes':
        return <Editor 
          key="processes"
          onBack={() => setCurrentView('menu')}
          title="工序管理" items={data.processes} parentIdKey="departmentId" parentList={data.departments}
          onAdd={(name, pid) => setData(d => ({ ...d, processes: [...d.processes, { id: genId(), name, departmentId: pid! }] }))}
          onDelete={(id) => setData(d => {
             const prodIds = d.productNames.filter(p => p.processId === id).map(p => p.id);
             const modelIds = d.carModels.filter(m => prodIds.includes(m.productNameId)).map(m => m.id);
             return {
               ...d,
               processes: d.processes.filter(x => x.id !== id),
               productNames: d.productNames.filter(p => !prodIds.includes(p.id)),
               carModels: d.carModels.filter(m => !modelIds.includes(m.id)),
               productCodes: d.productCodes.filter(c => !modelIds.includes(c.carModelId))
             };
          })}
        />;

      case 'products':
        const processesWithFullPath = data.processes.map(p => {
             const dept = data.departments.find(d => d.id === p.departmentId);
             return { ...p, name: dept ? `${dept.name} → ${p.name}` : p.name };
        });
        return <Editor 
          key="products"
          onBack={() => setCurrentView('menu')}
          title="产品名称管理" items={data.productNames} parentIdKey="processId" parentList={processesWithFullPath}
          onAdd={(name, pid) => setData(d => ({ ...d, productNames: [...d.productNames, { id: genId(), name, processId: pid! }] }))}
          onDelete={(id) => setData(d => {
             const modelIds = d.carModels.filter(m => m.productNameId === id).map(m => m.id);
             return {
               ...d,
               productNames: d.productNames.filter(x => x.id !== id),
               carModels: d.carModels.filter(m => !modelIds.includes(m.id)),
               productCodes: d.productCodes.filter(c => !modelIds.includes(c.carModelId))
             };
          })}
        />;

      case 'models':
        const productsWithFullPath = data.productNames.map(pn => {
             const process = data.processes.find(p => p.id === pn.processId);
             const dept = process ? data.departments.find(d => d.id === process.departmentId) : null;
             const fullPath = [dept?.name, process?.name].filter(Boolean).join(' → ');
             return { ...pn, name: fullPath ? `${fullPath} → \n${pn.name}` : pn.name };
        });
        return <Editor 
          key="models"
          onBack={() => setCurrentView('menu')}
          title="车型管理" items={data.carModels} parentIdKey="productNameId" parentList={productsWithFullPath}
          onAdd={(name, pid) => setData(d => ({ ...d, carModels: [...d.carModels, { id: genId(), name, productNameId: pid! }] }))}
          onDelete={(id) => setData(d => ({ ...d, carModels: d.carModels.filter(x => x.id !== id), productCodes: d.productCodes.filter(c => c.carModelId !== id) }))}
        />;

      case 'codes':
         const modelsWithFullPath = data.carModels.map(m => {
            const product = data.productNames.find(p => p.id === m.productNameId);
            const process = product ? data.processes.find(p => p.id === product.processId) : null;
            const dept = process ? data.departments.find(d => d.id === process.departmentId) : null;
            const fullPath = [dept?.name, process?.name, product?.name].filter(Boolean).join(' → ');
            return { ...m, name: fullPath ? `${fullPath} → \n${m.name}` : m.name };
         });
         return <Editor 
          key="codes"
          onBack={() => setCurrentView('menu')}
          title="产品编码管理" items={data.productCodes.map(c => ({...c, name: c.code}))} parentIdKey="carModelId" parentList={modelsWithFullPath}
          onAdd={(code, pid) => setData(d => ({ ...d, productCodes: [...d.productCodes, { id: genId(), code, carModelId: pid! }] }))}
          onDelete={(id) => setData(d => ({ ...d, productCodes: d.productCodes.filter(x => x.id !== id) }))}
        />;

      case 'issues': return <Editor key="issues" onBack={() => setCurrentView('menu')} title="失效模式管理" items={data.issues} onAdd={(name) => setData(d => ({ ...d, issues: [...d.issues, { id: genId(), name }] }))} onDelete={(id) => setData(d => ({ ...d, issues: d.issues.filter(x => x.id !== id) }))} />;
      case 'reporters': return <Editor key="reporters" onBack={() => setCurrentView('menu')} title="反馈人管理" items={data.reporters} onAdd={(name) => setData(d => ({...d, reporters: [...d.reporters, {id:genId(), name}]}))} onDelete={id => setData(d => ({...d, reporters: d.reporters.filter(x => x.id !== id)}))} />;
      case 'measures': return <Editor key="measures" onBack={() => setCurrentView('menu')} title="处置措施管理" items={data.measures} onAdd={(name) => setData(d => ({...d, measures: [...d.measures, {id:genId(), name}]}))} onDelete={id => setData(d => ({...d, measures: d.measures.filter(x => x.id !== id)}))} />;

      default: return null;
    }
  };

  return <div className="p-4 pb-24 h-full">{renderContent()}</div>;
};

// --- Main App Component with Routing ---

const AppContent = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/feedback" element={<FeedbackView />} />
        <Route path="/history" element={<HistoryView />} />
        <Route path="/management" element={<ManagementScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
      <NotificationToast />
    </>
  );
};

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </HashRouter>
  );
}
