'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { Server, Activity, Users, FileStack, HardDrive, Database, Monitor, Search, ArrowLeft, Clock } from 'lucide-react';

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
  
  // Live charting states
  const [computeHistory, setComputeHistory] = useState<any[]>([]);
  const [dbHistory, setDbHistory] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/admin/analytics-data?start=${startDate}&end=${endDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        
        // Append to live charts
        const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        setComputeHistory(prev => {
          const next = [...prev, { time: now, cpu: json.compute.cpu.loadavg, ram: (json.compute.memory.rss / 1024 / 1024) }];
          return next.slice(-20); // Keep last 20 ticks
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
  }, [startDate, endDate]); // Refetch fully on range change

  useEffect(() => {
    // Poll every 3 seconds for live charts
    const timer = setInterval(() => {
      fetchData();
    }, 3000);
    return () => clearInterval(timer);
  }, [startDate, endDate]); // Restart timer on range change

  if (loading && !data) return <div className="p-8 text-center text-[var(--text-dim)]">Loading metrics...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load analytics data</div>;

  const { traffic, database, compute, onlineUsers } = data;
  const memPercent = (compute.memory.rss / compute.memory.total) * 100;

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

      {/* TRAFFIC SECTION (VERCEL STYLE) */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 ui-title">
            <Users className="w-5 h-5 text-emerald-500" /> Web Analytics
          </h2>
          
          <div className="flex items-center gap-2 bg-[var(--bg-subtle)] p-1 rounded-lg border border-[var(--border-ui)] text-xs font-semibold">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="bg-[var(--bg-card)] text-[var(--text-title)] border border-[var(--border-ui)] px-2 py-1 rounded-md"
            />
            <span className="text-[var(--text-dim)]">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="bg-[var(--bg-card)] text-[var(--text-title)] border border-[var(--border-ui)] px-2 py-1 rounded-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-6 flex flex-col justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-emerald-500/5 group-hover:to-emerald-500/10 transition-colors pointer-events-none" />
            <span className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">Total Visitors</span>
            <span className="text-5xl font-bold font-mono tracking-tight text-[var(--text-title)]">{traffic.totalVisitors.toLocaleString()}</span>
          </div>
          
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-6 flex flex-col justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-500/5 group-hover:to-blue-500/10 transition-colors pointer-events-none" />
            <span className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">Page Views</span>
            <span className="text-5xl font-bold font-mono tracking-tight text-[var(--text-title)]">{traffic.totalViews.toLocaleString()}</span>
          </div>
        </div>

        {/* Traffic Chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-6 h-[380px] shadow-sm">
          <h3 className="text-sm font-semibold mb-6 ui-title">Traffic Over Time</h3>
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
              <XAxis dataKey="time" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={11} tickLine={false} axisLine={false} dy={10} minTickGap={20} />
              <YAxis stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="views" name="Page Views" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
              <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitors)" />
            </AreaChart>
          </ResponsiveContainer>
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

      {/* DATABASE & COMPUTE SECTION (NEON STYLE) */}
      <div className="space-y-4 pt-6 mt-6 border-t border-[var(--border-ui)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2 ui-title">
            <Database className="w-5 h-5 text-amber-500" /> Database & Compute (Live)
          </h2>
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--text-dim)] bg-[var(--bg-subtle)] px-2 py-1 rounded border border-[var(--border-ui)]">
            <Clock className="w-3 h-3" /> Live Polling (3s)
          </span>
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
          
          {/* Node.js Compute Live Chart */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-5 shadow-sm flex flex-col h-[300px]">
            <h3 className="text-sm font-semibold mb-4 border-b border-[var(--border-ui)] pb-2 flex items-center justify-between ui-title">
              <span className="flex items-center gap-2"><HardDrive className="w-4 h-4" /> Server Compute</span>
              <span className="text-[10px] font-mono text-[var(--text-dim)]">{(compute.memory.rss / 1024 / 1024).toFixed(1)} MB RAM</span>
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={computeHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-ui)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }} />
                  <Line yAxisId="left" type="stepAfter" dataKey="ram" name="RAM (MB)" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="cpu" name="CPU Load" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DB Connections Live Chart */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-5 shadow-sm flex flex-col h-[300px]">
            <h3 className="text-sm font-semibold mb-4 border-b border-[var(--border-ui)] pb-2 flex items-center justify-between ui-title">
              <span className="flex items-center gap-2"><Database className="w-4 h-4" /> Active Connections</span>
              <span className="text-[10px] font-mono text-[var(--text-dim)]">{database.connections} Active</span>
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dbHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-ui)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)' }} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }} />
                  <Area type="stepAfter" dataKey="active" name="Connections" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
        
      </div>
      
    </div>
  );
}
