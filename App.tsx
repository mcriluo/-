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
  Minus,
  Share2,
  ExternalLink,
  Download,
  Info,
  Smartphone,
  AlertCircle
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
  notification: { msg: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
  hideNotification: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<HierarchyData>(() => storage.get(STORAGE_KEYS.DATA, INITIAL_DATA));
  const [history, setHistory] = useState<HistoryRecord[]>(() => storage.get(STORAGE_KEYS.HISTORY, []));
  const [stats, setStats] = useState<DailyStats>(() => storage.get(STORAGE_KEYS.STATS, {}));
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

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
      newStats[date][carModelId][issueId] = Math.max(0, current + delta);
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

  const showNotification = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const hideNotification = useCallback(() => setNotification(null), []);

  const contextValue = useMemo(() => ({
    data, setData, history, addHistory, deleteHistory, clearHistory,
    stats, updateStats, clearStatsForDate,
    notification, showNotification, hideNotification
  }), [data, history, stats, notification, addHistory, deleteHistory, clearHistory, updateStats, clearStatsForDate, showNotification, hideNotification]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

// --- UI Components ---
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ className = '', variant = 'primary', ...props }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white active:bg-indigo-700 disabled:bg-slate-300',
    secondary: 'bg-white text-slate-700 border border-slate-300 active:bg-slate-50',
    danger: 'bg-red-50 text-red-600 border border-red-200 active:bg-red-100',
    ghost: 'bg-transparent text-slate-600 active:bg-slate-100'
  };
  return <button className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${variants[variant]} ${className}`} {...props} />;
};

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; required?: boolean }> = ({ label, required, className = '', ...props }) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-sm font-medium text-slate-700">{label} {required && <span className="text-red-500">*</span>}</label>
    <div className="relative">
      <select className={`w-full appearance-none bg-white border border-slate-200 text-slate-900 text-base rounded-lg focus:ring-2 focus:ring-indigo-500 block p-3 pr-8 shadow-sm ${className}`} {...props}>
        {props.children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"><ChevronLeft className="h-5 w-5 -rotate-90" /></div>
    </div>
  </div>
);

const NotificationToast = () => {
  const { notification, hideNotification } = useAppContext();
  if (!notification) return null;
  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-indigo-600'
  };
  return (
    <div className={`fixed top-4 mt-safe left-4 right-4 z-[200] p-4 rounded-xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 fade-in duration-300 ${colors[notification.type]} text-white`}>
      <div className="flex items-center gap-3">
        {notification.type === 'success' ? <Check size={20} /> : notification.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
        <span className="font-medium text-sm leading-tight">{notification.msg}</span>
      </div>
      <button onClick={hideNotification} className="p-1 rounded-full hover:bg-white/20"><X size={18} /></button>
    </div>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-20 duration-300 max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-slate-100 sticky top-0 bg-white z-20">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- Navigation ---
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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-bottom pb-safe flex justify-around items-center h-16 z-50 shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <button key={item.path} onClick={() => navigate(item.path)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// --- Views ---

// 1. HomeView
const HomeView = () => {
  const { stats, updateStats, clearStatsForDate, data, showNotification } = useAppContext();
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [activeCarModel, setActiveCarModel] = useState<string>(data.carModels[0]?.id || '');
  const chartData = useMemo(() => {
    const dailyData = stats[selectedDate] || {};
    return data.carModels.map(model => ({
      name: model.name, id: model.id,
      count: (Object.values(dailyData[model.id] || {}) as number[]).reduce((a, b) => a + b, 0)
    })).filter(d => d.count > 0);
  }, [stats, selectedDate, data.carModels]);
  const handleInc = (id: string) => selectedDate === getTodayStr() ? updateStats(selectedDate, activeCarModel, id, 1) : showNotification("只能编辑今日", "error");
  const handleDec = (id: string) => selectedDate === getTodayStr() ? updateStats(selectedDate, activeCarModel, id, -1) : showNotification("只能编辑今日", "error");
  const getModelTotal = (id: string) => (Object.values(stats[selectedDate]?.[id] || {}) as number[]).reduce((a, b) => a + b, 0);
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto no-scrollbar pb-24 p-4 space-y-6">
      <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-lg font-bold text-slate-800">统计看板</h1>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-50 border-none text-sm font-bold text-slate-600 p-1 rounded" />
      </header>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 h-64">
        <h2 className="text-xs font-semibold text-slate-400 mb-4">每日车型异常统计</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} /><YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} width={25} /><Tooltip /><Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>{chartData.map((e, i) => <Cell key={i} fill={e.id === activeCarModel ? '#6366f1' : '#a5b4fc'} />)}</Bar></BarChart>
          </ResponsiveContainer>
        ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">暂无数据</div>}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
        {data.carModels.map(m => (
          <button key={m.id} onClick={() => setActiveCarModel(m.id)} className={`flex-shrink-0 w-24 h-14 rounded-xl flex flex-col items-center justify-center border-2 transition-all ${activeCarModel === m.id ? 'bg-indigo-50 border-indigo-500 text-indigo-900' : 'bg-white border-slate-100 text-slate-600'}`}>
            <span className="text-xs font-bold truncate px-2">{m.name}</span>
            {getModelTotal(m.id) > 0 && <span className="text-[10px] bg-indigo-500 text-white px-1.5 rounded-full mt-1">{getModelTotal(m.id)}</span>}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-5 space-y-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800">快速异常录入</h3>
        <div className="grid grid-cols-3 gap-2">
          {data.issues.map(i => (
            <button key={i.id} onClick={() => handleInc(i.id)} className="py-3 bg-slate-50 rounded-xl text-xs font-medium text-slate-600 border border-slate-100 active:bg-indigo-50 active:text-indigo-600 active:border-indigo-200 transition-all">
              {i.name}
              {stats[selectedDate]?.[activeCarModel]?.[i.id] > 0 && <span className="ml-1 text-indigo-500 font-bold">({stats[selectedDate]?.[activeCarModel]?.[i.id]})</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// 2. FeedbackView
const FeedbackView = () => {
  const { data, addHistory, showNotification } = useAppContext();
  const [form, setForm] = useState<FeedbackForm>(DEFAULT_FORM);
  const findName = (list: BaseEntity[], id: string) => list.find(x => x.id === id)?.name || '未知';
  const findCode = (id: string) => data.productCodes.find(x => x.id === id)?.code || '未知';
  
  const filtered = {
    processes: data.processes.filter(p => p.departmentId === form.departmentId),
    products: data.productNames.filter(p => p.processId === form.processId),
    models: data.carModels.filter(m => m.productNameId === form.productNameId),
    codes: data.productCodes.filter(c => c.carModelId === form.carModelId)
  };

  useEffect(() => {
    const firstDept = data.departments[0]?.id || '';
    setForm(f => ({ ...f, departmentId: f.departmentId || firstDept, issueId: f.issueId || data.issues[0]?.id || '', reporterId: f.reporterId || data.reporters[0]?.id || '' }));
  }, [data]);

  useEffect(() => { setForm(f => ({ ...f, processId: filtered.processes[0]?.id || '', productNameId: '', carModelId: '', productCodeId: '' })); }, [form.departmentId]);
  useEffect(() => { setForm(f => ({ ...f, productNameId: filtered.products[0]?.id || '', carModelId: '', productCodeId: '' })); }, [form.processId]);
  useEffect(() => { setForm(f => ({ ...f, carModelId: filtered.models[0]?.id || '', productCodeId: '' })); }, [form.productNameId]);
  useEffect(() => { setForm(f => ({ ...f, productCodeId: filtered.codes[0]?.id || '' })); }, [form.carModelId]);

  const handleSubmit = async () => {
    if (!form.issueId || !form.processId) return showNotification("必填项未选", "error");
    const now = new Date();
    const content = `质量异常反馈：\n发现工序：${findName(data.processes, form.processId)}\n时间：${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}\n车型：${findName(data.carModels, form.carModelId)}\n失效：${findName(data.issues, form.issueId)}\n处置：${form.measureIds.map(id => findName(data.measures, id)).join('、')}`;
    addHistory({ timestamp: Date.now(), dateStr: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`, timeStr: `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`, content, formData: form });
    try { await navigator.clipboard.writeText(content); showNotification("已生成并复制"); } catch { showNotification("已生成(请手动复制)", "info"); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 pb-32 overflow-y-auto no-scrollbar space-y-4">
      <h1 className="text-xl font-bold text-slate-900">质量反馈生成</h1>
      <div className="grid grid-cols-2 gap-4">
        <Select label="责任部门" value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})}>{data.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        <Select label="发现工序" value={form.processId} onChange={e => setForm({...form, processId: e.target.value})}>{filtered.processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
      </div>
      <Select label="产品名称" value={form.productNameId} onChange={e => setForm({...form, productNameId: e.target.value})}>{filtered.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
      <div className="grid grid-cols-2 gap-4">
        <Select label="车型" value={form.carModelId} onChange={e => setForm({...form, carModelId: e.target.value})}>{filtered.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
        <Select label="产品编码" value={form.productCodeId} onChange={e => setForm({...form, productCodeId: e.target.value})}>{filtered.codes.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}</Select>
      </div>
      <Select label="失效问题" value={form.issueId} onChange={e => setForm({...form, issueId: e.target.value})}>{data.issues.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</Select>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">处置措施</label>
        <div className="flex flex-wrap gap-2">
          {data.measures.map(m => (
            <button key={m.id} onClick={() => setForm(f => ({ ...f, measureIds: f.measureIds.includes(m.id) ? f.measureIds.filter(x => x !== m.id) : [...f.measureIds, m.id] }))} className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${form.measureIds.includes(m.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>{m.name}</button>
          ))}
        </div>
      </div>
      <div className="fixed bottom-20 left-4 right-4"><Button onClick={handleSubmit} className="w-full h-14 text-lg shadow-xl bg-gradient-to-r from-indigo-500 to-indigo-700">生成记录并复制</Button></div>
    </div>
  );
};

// 3. HistoryView (Export Optimized)
const HistoryView = () => {
  const { history, deleteHistory, data, showNotification } = useAppContext();
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'json' | null>(null);
  const isRestricted = useMemo(() => { const ua = navigator.userAgent.toLowerCase(); return ua.includes('micromessenger') || ua.includes('dingtalk'); }, []);

  const getExportBlob = (type: 'excel' | 'json') => {
    if (type === 'json') {
      return new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    } else {
      const find = (list: BaseEntity[], id: string) => list.find(x => x.id === id)?.name || '未知';
      const rows = history.map(h => ({
        "日期": h.dateStr, "时间": h.timeStr, "工序": find(data.processes, h.formData.processId),
        "车型": find(data.carModels, h.formData.carModelId), "问题": find(data.issues, h.formData.issueId),
        "措施": h.formData.measureIds.map(id => find(data.measures, id)).join(',')
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Records");
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
  };

  const handleDownload = (blob: Blob, ext: string) => {
    const filename = `quality_report_${Date.now()}.${ext}`;
    
    // 方案一：Web Share API (如果支持)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: blob.type })] })) {
      navigator.share({ files: [new File([blob], filename, { type: blob.type })], title: '质量报告' }).catch(() => {});
    }

    // 方案二：Blob URL (传统下载)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    
    showNotification("已尝试触发下载，请在“文件”或“下载”中查看", "info");
    setExportModalOpen(false);
  };

  const handleBase64Download = () => {
    if (!exportType) return;
    const blob = getExportBlob(exportType);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const a = document.createElement('a');
      a.href = base64.replace(/^data:.*?;/, 'data:application/octet-stream;'); // 强制修改 MIME 为二进制流
      a.download = `report_${Date.now()}.${exportType === 'excel' ? 'xlsx' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    reader.readAsDataURL(blob);
    showNotification("已执行兼容模式下载协议", "info");
    setExportModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 pb-24 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-900">历史记录</h1>
        <div className="flex gap-2">
          <button onClick={() => { setExportType('excel'); setExportModalOpen(true); }} className="p-2.5 bg-white border border-slate-200 rounded-full shadow-sm active:bg-slate-50"><FileSpreadsheet size={20} className="text-emerald-600" /></button>
          <button onClick={() => { setExportType('json'); setExportModalOpen(true); }} className="p-2.5 bg-white border border-slate-200 rounded-full shadow-sm active:bg-slate-50"><FileJson size={20} className="text-orange-500" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
        {history.length === 0 ? <div className="text-center text-slate-400 mt-20">暂无历史记录</div> : 
          history.map(h => (
            <div key={h.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group">
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider"><span>{h.dateStr} {h.timeStr}</span><button onClick={() => deleteHistory(h.id)}><Trash2 size={14} className="text-slate-200 hover:text-red-400" /></button></div>
              <p className="text-sm text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">{h.content}</p>
              <button onClick={() => navigator.clipboard.writeText(h.content).then(() => showNotification("已复制"))} className="mt-3 w-full py-2 bg-slate-50 rounded-lg text-xs font-bold text-indigo-600 active:bg-indigo-50 flex items-center justify-center gap-1"><Copy size={12} /> 再次复制</button>
            </div>
          ))
        }
      </div>

      <Modal isOpen={isExportModalOpen} onClose={() => setExportModalOpen(false)} title={`导出 ${exportType === 'excel' ? 'Excel 表格' : 'JSON 源码'}`}>
        {isRestricted && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={20} />
            <p className="text-xs text-amber-800 leading-normal">
              <span className="font-bold">注意：</span>微信/钉钉内置浏览器通常无法直接保存文件。推荐点击右上角“<span className="font-bold">···</span>”选择“<span className="font-bold text-indigo-600">在浏览器打开</span>”后再进行导出。
            </p>
          </div>
        )}
        <div className="space-y-4">
          <button onClick={() => handleDownload(getExportBlob(exportType!), exportType === 'excel' ? 'xlsx' : 'json')} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-left active:scale-[0.98] transition-all">
            <div className="p-3 bg-indigo-500 text-white rounded-xl"><Share2 size={24} /></div>
            <div><div className="font-bold text-slate-800 text-sm">正式导出 / 发送</div><div className="text-[10px] text-slate-500">通过系统原生面板保存或分享文件</div></div>
          </button>
          <button onClick={handleBase64Download} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-left active:scale-[0.98] transition-all">
            <div className="p-3 bg-emerald-500 text-white rounded-xl"><Download size={24} /></div>
            <div><div className="font-bold text-slate-800 text-sm">二进制流强制下载</div><div className="text-[10px] text-slate-500">如果第一种方式失效，请尝试此协议</div></div>
          </button>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-2 text-slate-600"><Smartphone size={16} /><span className="text-xs font-bold">文件去哪了？</span></div>
            <ul className="text-[10px] text-slate-500 list-disc pl-4 space-y-1">
              <li>安卓：请检查“文件管理/Download”或浏览器默认下载路径。</li>
              <li>苹果：点击导出后选择“存储到文件”，然后在桌面“文件”App中找。</li>
              <li>若导出无反应：请务必按照顶部黄色区域提示切换到系统浏览器操作。</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// 4. Management Screen
interface EditorProps<T extends BaseEntity> {
  title: string;
  items: T[];
  onAdd: (name: string, pid?: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  parentList?: BaseEntity[];
  parentIdKey?: string;
}
function Editor<T extends BaseEntity>({ title, items, onAdd, onDelete, onBack, parentList, parentIdKey }: EditorProps<T>) {
  const [name, setName] = useState('');
  const [pid, setPid] = useState('');
  useEffect(() => { if (parentList?.length && !pid) setPid(parentList[0].id); }, [parentList]);
  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 space-y-4">
      <div className="flex items-center gap-2"><button onClick={onBack} className="p-2 -ml-2"><ChevronLeft /></button><h1 className="text-xl font-bold">{title}</h1></div>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        {parentList && <Select label="上级分类" value={pid} onChange={e => setPid(e.target.value)}>{parentList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}
        <div className="flex gap-2"><input value={name} onChange={e => setName(e.target.value)} className="flex-1 bg-slate-50 p-3 rounded-xl border-none outline-none text-sm" placeholder="输入名称..." /><Button onClick={() => { if (name.trim()) { onAdd(name.trim(), pid); setName(''); } }} className="w-12 h-12 p-0 rounded-xl"><Plus /></Button></div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
        {items.filter(i => !parentIdKey || (i as any)[parentIdKey] === pid).map(i => (
          <div key={i.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm border border-slate-50"><span className="text-sm font-medium">{i.name || (i as any).code}</span><button onClick={() => onDelete(i.id)} className="p-2 text-slate-200 hover:text-red-400 transition-colors"><Trash2 size={18} /></button></div>
        ))}
      </div>
    </div>
  );
}

const ManagementScreen = () => {
  const { data, setData } = useAppContext();
  const [view, setView] = useState<ManagementViewType>('menu');
  const genId = () => Math.random().toString(36).substr(2, 9);
  const menus: { id: ManagementViewType, label: string }[] = [
    { id: 'departments', label: '部门' }, { id: 'processes', label: '工序' }, { id: 'products', label: '产品' }, { id: 'models', label: '车型' }, { id: 'codes', label: '编码' }, { id: 'issues', label: '失效' }, { id: 'reporters', label: '反馈人' }, { id: 'measures', label: '措施' }
  ];
  if (view === 'menu') return (
    <div className="p-4 bg-slate-50 h-full overflow-y-auto no-scrollbar pb-24"><h1 className="text-xl font-bold mb-6">字典管理</h1><div className="grid grid-cols-2 gap-3">{menus.map(m => <button key={m.id} onClick={() => setView(m.id)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-left active:scale-95 transition-all"><span className="font-bold text-slate-700">{m.label}管理</span></button>)}</div></div>
  );
  const back = () => setView('menu');
  switch (view) {
    case 'departments': return <Editor onBack={back} title="部门" items={data.departments} onAdd={n => setData(d => ({...d, departments: [...d.departments, {id: genId(), name: n}]}))} onDelete={id => setData(d => ({...d, departments: d.departments.filter(x => x.id !== id)}))} />;
    case 'processes': return <Editor onBack={back} title="工序" items={data.processes} parentIdKey="departmentId" parentList={data.departments} onAdd={(n, p) => setData(d => ({...d, processes: [...d.processes, {id: genId(), name: n, departmentId: p!}]}))} onDelete={id => setData(d => ({...d, processes: d.processes.filter(x => x.id !== id)}))} />;
    case 'products': return <Editor onBack={back} title="产品" items={data.productNames} parentIdKey="processId" parentList={data.processes} onAdd={(n, p) => setData(d => ({...d, productNames: [...d.productNames, {id: genId(), name: n, processId: p!}]}))} onDelete={id => setData(d => ({...d, productNames: d.productNames.filter(x => x.id !== id)}))} />;
    case 'models': return <Editor onBack={back} title="车型" items={data.carModels} parentIdKey="productNameId" parentList={data.productNames} onAdd={(n, p) => setData(d => ({...d, carModels: [...d.carModels, {id: genId(), name: n, productNameId: p!}]}))} onDelete={id => setData(d => ({...d, carModels: d.carModels.filter(x => x.id !== id)}))} />;
    case 'codes': return <Editor onBack={back} title="编码" items={data.productCodes.map(c => ({...c, name: c.code}))} parentIdKey="carModelId" parentList={data.carModels} onAdd={(n, p) => setData(d => ({...d, productCodes: [...d.productCodes, {id: genId(), code: n, carModelId: p!}]}))} onDelete={id => setData(d => ({...d, productCodes: d.productCodes.filter(x => x.id !== id)}))} />;
    case 'issues': return <Editor onBack={back} title="失效" items={data.issues} onAdd={n => setData(d => ({...d, issues: [...d.issues, {id: genId(), name: n}]}))} onDelete={id => setData(d => ({...d, issues: d.issues.filter(x => x.id !== id)}))} />;
    case 'reporters': return <Editor onBack={back} title="反馈人" items={data.reporters} onAdd={n => setData(d => ({...d, reporters: [...d.reporters, {id: genId(), name: n}]}))} onDelete={id => setData(d => ({...d, reporters: d.reporters.filter(x => x.id !== id)}))} />;
    case 'measures': return <Editor onBack={back} title="措施" items={data.measures} onAdd={n => setData(d => ({...d, measures: [...d.measures, {id: genId(), name: n}]}))} onDelete={id => setData(d => ({...d, measures: d.measures.filter(x => x.id !== id)}))} />;
    default: return null;
  }
};

// --- App Root ---
const AppContent = () => (
  <div className="h-full w-full relative">
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/feedback" element={<FeedbackView />} />
      <Route path="/history" element={<HistoryView />} />
      <Route path="/management" element={<ManagementScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <BottomNav />
    <NotificationToast />
  </div>
);

export default function App() { return <HashRouter><AppProvider><AppContent /></AppProvider></HashRouter>; }