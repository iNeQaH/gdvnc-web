'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { 
  Server, Activity, Users, FileStack, HardDrive, Database, Monitor, ArrowLeft, Clock, 
  Calendar, Check, ChevronDown, Cpu, Zap 
} from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);
  
  const defaultEnd = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Temp date states for single popover modal
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Mode for DB & Compute charts: 'range' (by date) or 'live' (3s interval)
  const [dbComputeViewMode, setDbComputeViewMode] = useState<'range' | 'live'>('range');
  
  // Live charting states (for live polling mode)
  const [computeHistory, setComputeHistory] = useState<any[]>([]);
  const [dbHistory, setDbHistory] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/admin/analytics-data?start=${startDate}&end=${endDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        
        // Append to live charts history
        const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        setComputeHistory(prev => {
          const next = [...prev, { time: now, cpu: json.compute.cpu.loadavg, ram: (json.compute.memory.rss / 1024 / 1024) }];
          return next.slice(-20);
        });
        
        setDbHistory(prev => {
          const next = [...prev, { time: now, active: json.database.connections, hitRate: json.database.cacheHitRate }];
          return next.slice(-20);
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [startDate, endDate]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchData();
    }, 3000);
    return () => clearInterval(timer);
  }, [startDate, endDate]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyDateRange = () => {
    if (tempStart && tempEnd) {
      setStartDate(tempStart);
      setEndDate(tempEnd);
      setIsDatePickerOpen(false);
    }
  };

  const handleQuickPreset = (days: number) => {
    const end = new Date().toISOString().split('T')[0];
    const startObj = new Date();
    startObj.setDate(startObj.getDate() - days);
    const start = startObj.toISOString().split('T')[0];
    setTempStart(start);
    setTempEnd(end);
  };

  if (loading && !data) return <div className="p-8 text-center text-[var(--text-dim)]">Loading metrics...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load analytics data</div>;

  const { traffic, database, compute, onlineUsers } = data;

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-ui)] pb-6">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-dim)] hover:text-[var(--text-title)] mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 ui-title">
            <Activity className="w-6 h-6 text-[var(--accent)]" />
            System Analytics & Metrics
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-[var(--bg-card)] px-4 py-2 border border-[var(--border-ui)] rounded-md shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold text-[var(--text-title)]">{onlineUsers}</span>
          <span className="text-sm font-medium text-[var(--text-dim)]">Online Users (5m)</span>
        </div>
      </div>

      {/* WEB ANALYTICS SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 ui-title">
            <Users className="w-5 h-5 text-emerald-500" /> Web Analytics
          </h2>
          
          {/* SINGLE BUTTON DATE PICKER WITH POPOVER MODAL */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => {
                setTempStart(startDate);
                setTempEnd(endDate);
                setIsDatePickerOpen(!isDatePickerOpen);
              }}
              className="flex items-center gap-2 bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-[var(--text-title)] border border-[var(--border-ui)] px-3 py-1.5 rounded-lg shadow-sm text-xs font-semibold transition-colors"
            >
              <Calendar className="w-4 h-4 text-[var(--accent)]" />
              <span>{startDate} — {endDate}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-dim)]" />
            </button>

            {/* POPOVER MODAL */}
            {isDatePickerOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-ui)] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-title)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" /> Chọn khoảng thời gian
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(0)}
                    className="flex-1 py-1 text-[11px] font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border-ui)] rounded transition-colors text-[var(--text-title)]"
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(7)}
                    className="flex-1 py-1 text-[11px] font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border-ui)] rounded transition-colors text-[var(--text-title)]"
                  >
                    7 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(30)}
                    className="flex-1 py-1 text-[11px] font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border-ui)] rounded transition-colors text-[var(--text-title)]"
                  >
                    30 ngày
                  </button>
                </div>

                {/* Date Inputs */}
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[var(--text-dim)] font-medium mb-1">Từ ngày (Start Date):</label>
                    <input
                      type="date"
                      value={tempStart}
                      onChange={e => setTempStart(e.target.value)}
                      className="w-full bg-[var(--bg-subtle)] text-[var(--text-title)] border border-[var(--border-ui)] px-3 py-1.5 rounded-md focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--text-dim)] font-medium mb-1">Đến ngày (End Date):</label>
                    <input
                      type="date"
                      value={tempEnd}
                      onChange={e => setTempEnd(e.target.value)}
                      className="w-full bg-[var(--bg-subtle)] text-[var(--text-title)] border border-[var(--border-ui)] px-3 py-1.5 rounded-md focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                {/* Confirm Action Button */}
                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-ui)]">
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text-title)] transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyDateRange}
                    className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold bg-[var(--accent)] text-white rounded-md shadow hover:opacity-90 transition-opacity"
                  >
                    <Check className="w-3.5 h-3.5" /> Xác nhận
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* STAT CARDS (VISITORS, PAGE VIEWS, QUERIES) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-6 flex flex-col justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-emerald-500/5 group-hover:to-emerald-500/10 transition-colors pointer-events-none" />
            <span className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">Total Visitors</span>
            <span className="text-4xl font-bold font-mono tracking-tight text-[var(--text-title)]">{traffic.totalVisitors.toLocaleString()}</span>
          </div>
          
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-6 flex flex-col justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-500/5 group-hover:to-blue-500/10 transition-colors pointer-events-none" />
            <span className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">Page Views</span>
            <span className="text-4xl font-bold font-mono tracking-tight text-[var(--text-title)]">{traffic.totalViews.toLocaleString()}</span>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-6 flex flex-col justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-purple-500/5 group-hover:to-purple-500/10 transition-colors pointer-events-none" />
            <span className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-500" /> Số lượng truy vấn (Queries)
            </span>
            <span className="text-4xl font-bold font-mono tracking-tight text-purple-500">{traffic.totalQueries?.toLocaleString() || 0}</span>
          </div>
        </div>

        {/* CHARTS GRID (TRAFFIC OVER TIME & QUERY COUNT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Traffic Chart */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-6 h-[360px] shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold mb-4 ui-title">Traffic Over Time</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={traffic.chart} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-ui)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} dy={10} minTickGap={20} />
                  <YAxis stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="views" name="Page Views" stroke="var(--accent)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorViews)" />
                  <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVisitors)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Query Count Chart (BIỂU ĐỒ SỐ LƯỢNG TRUY VẤN) */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-6 h-[360px] shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold mb-4 flex items-center justify-between ui-title">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-500" /> Biểu đồ số lượng truy vấn (Queries)
              </span>
              <span className="text-[10px] font-mono text-[var(--text-dim)]">Total: {traffic.totalQueries?.toLocaleString()}</span>
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={traffic.chart} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-ui)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} dy={10} minTickGap={20} />
                  <YAxis stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="queries" name="Queries" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorQueries)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Traffic Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-4 border-b border-[var(--border-ui)] pb-2 flex items-center gap-2 ui-title">
              <FileStack className="w-4 h-4" /> Top Pages
            </h3>
            <div className="space-y-3">
              {traffic.topPages.map((p: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="truncate pr-4 font-mono text-[var(--text-dim)]">{p.path}</span>
                  <span className="font-semibold ui-title">{p.count}</span>
                </div>
              ))}
              {traffic.topPages.length === 0 && <span className="text-sm text-[var(--text-dim)]">No data yet</span>}
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-4 border-b border-[var(--border-ui)] pb-2 flex items-center gap-2 ui-title">
              <Monitor className="w-4 h-4" /> Devices
            </h3>
            <div className="space-y-3">
              {traffic.deviceStats.map((p: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-[var(--text-dim)]">{p.name}</span>
                  <span className="font-semibold ui-title">{p.count}</span>
                </div>
              ))}
              {traffic.deviceStats.length === 0 && <span className="text-sm text-[var(--text-dim)]">No data yet</span>}
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-4 border-b border-[var(--border-ui)] pb-2 flex items-center gap-2 ui-title">
              <Server className="w-4 h-4" /> Operating Systems
            </h3>
            <div className="space-y-3">
              {traffic.osStats.map((p: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-[var(--text-dim)]">{p.name}</span>
                  <span className="font-semibold ui-title">{p.count}</span>
                </div>
              ))}
              {traffic.osStats.length === 0 && <span className="text-sm text-[var(--text-dim)]">No data yet</span>}
            </div>
          </div>
        </div>
      </div>

      {/* DATABASE & COMPUTE SECTION (VIEWABLE BY DATE RANGE OR LIVE) */}
      <div className="space-y-4 pt-6 mt-6 border-t border-[var(--border-ui)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 ui-title">
            <Database className="w-5 h-5 text-amber-500" /> Database & Compute Metrics
          </h2>
          
          {/* View Mode Switcher: Date Range (Theo ngày) vs Live (Thời gian thực) */}
          <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-lg border border-[var(--border-ui)] text-xs font-semibold">
            <button
              onClick={() => setDbComputeViewMode('range')}
              className={`px-3 py-1 rounded-md transition-colors ${
                dbComputeViewMode === 'range' 
                  ? 'bg-[var(--bg-card)] text-[var(--text-title)] shadow-sm' 
                  : 'text-[var(--text-dim)] hover:text-[var(--text-title)]'
              }`}
            >
              Theo ngày ({startDate} — {endDate})
            </button>
            <button
              onClick={() => setDbComputeViewMode('live')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
                dbComputeViewMode === 'live' 
                  ? 'bg-[var(--bg-card)] text-[var(--text-title)] shadow-sm' 
                  : 'text-[var(--text-dim)] hover:text-[var(--text-title)]'
              }`}
            >
              <Clock className="w-3 h-3 text-emerald-500 animate-pulse" /> Live Polling (3s)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-4 shadow-sm">
            <div className="text-xs text-[var(--text-dim)] font-semibold uppercase mb-1">Database Size</div>
            <div className="text-2xl font-bold font-mono ui-title">{(database.size / 1024 / 1024).toFixed(1)} MB</div>
          </div>
          
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-4 shadow-sm">
            <div className="text-xs text-[var(--text-dim)] font-semibold uppercase mb-1">Cache Hit Rate</div>
            <div className="text-2xl font-bold font-mono text-amber-500">{database.cacheHitRate.toFixed(2)}%</div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-4 shadow-sm">
            <div className="text-xs text-[var(--text-dim)] font-semibold uppercase mb-1">Active Connections</div>
            <div className="text-2xl font-bold font-mono ui-title">{database.connections}</div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-4 shadow-sm">
            <div className="text-xs text-[var(--text-dim)] font-semibold uppercase mb-1">Deadlocks</div>
            <div className="text-2xl font-bold font-mono text-red-500">{database.deadlocks}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Server Compute Chart (Date Range or Live) */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-5 shadow-sm flex flex-col h-[320px]">
            <h3 className="text-sm font-semibold mb-4 border-b border-[var(--border-ui)] pb-2 flex items-center justify-between ui-title">
              <span className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-500" /> Server Compute {dbComputeViewMode === 'range' ? '(Theo ngày)' : '(Live)'}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-dim)]">
                {(compute.memory.rss / 1024 / 1024).toFixed(1)} MB RAM | {compute.cpu.cores} Cores
              </span>
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                {dbComputeViewMode === 'range' ? (
                  <LineChart data={traffic.chart} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-ui)" vertical={false} />
                    <XAxis dataKey="time" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis yAxisId="left" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)', borderRadius: '0.5rem' }} />
                    <Line yAxisId="left" type="monotone" dataKey="ram" name="RAM (MB)" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="cpu" name="CPU Load" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                  </LineChart>
                ) : (
                  <LineChart data={computeHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-ui)" vertical={false} />
                    <XAxis dataKey="time" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)', borderRadius: '0.5rem' }} />
                    <Line yAxisId="left" type="stepAfter" dataKey="ram" name="RAM (MB)" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="cpu" name="CPU Load" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Database Connections & Hit Rate Chart (Date Range or Live) */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-5 shadow-sm flex flex-col h-[320px]">
            <h3 className="text-sm font-semibold mb-4 border-b border-[var(--border-ui)] pb-2 flex items-center justify-between ui-title">
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" /> Database Connections {dbComputeViewMode === 'range' ? '(Theo ngày)' : '(Live)'}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-dim)]">{database.connections} Active Connections</span>
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                {dbComputeViewMode === 'range' ? (
                  <AreaChart data={traffic.chart} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorDbConn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-ui)" vertical={false} />
                    <XAxis dataKey="time" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)', borderRadius: '0.5rem' }} />
                    <Area type="monotone" dataKey="connections" name="Active Connections" stroke="#10b981" fill="url(#colorDbConn)" strokeWidth={2.5} />
                  </AreaChart>
                ) : (
                  <AreaChart data={dbHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-ui)" vertical={false} />
                    <XAxis dataKey="time" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)', borderRadius: '0.5rem' }} />
                    <Area type="stepAfter" dataKey="active" name="Connections" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

        </div>
        
      </div>
      
    </div>
  );
}
