import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  Building2, 
  Activity,
  Layers
} from 'lucide-react';

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

export default function AnalyticsDashboard({ stats, authorities }) {
  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-500 text-xs">
        Loading analytics...
      </div>
    );
  }

  // Format data for severity pie chart
  const severityData = Object.entries(stats.severity_distribution || {}).map(([key, value]) => ({
    name: key,
    value: value,
    color: SEVERITY_COLORS[key] || '#94a3b8',
  }));

  // Format data for status bar chart
  const statusData = Object.entries(stats.status_distribution || {}).map(([key, value]) => ({
    status: key,
    count: value,
  }));

  // Format data for authority performance
  const authorityData = (stats.authorities_breakdown || []).map((a) => ({
    name: a.code,
    fullName: a.name,
    total: a.total,
    resolved: a.resolved,
    pending: a.pending,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-sky-400" />
          <span>Road Safety & Civic Performance Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-time metrics tracking road defect density, high-risk accident hotspots, and municipal resolution turnaround.
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Detected */}
        <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Hazards</span>
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-white font-mono">{stats.total_potholes || 0}</div>
          <p className="text-[11px] text-slate-500">Captured by Dashcams & Mobile Feeds</p>
        </div>

        {/* Critical Hazards */}
        <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Critical Defects</span>
            <span className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-red-400 font-mono">
            {stats.severity_distribution?.CRITICAL || 0}
          </div>
          <p className="text-[11px] text-slate-500">Requires Urgent Asphalt Resurfacing</p>
        </div>

        {/* Resolution Rate */}
        <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Resolution Rate</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {stats.resolution_rate_percent || 0}%
          </div>
          <p className="text-[11px] text-slate-500">Repaired & Verified by Inspectors</p>
        </div>

        {/* Average SLA Target */}
        <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Average SLA</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">36h</div>
          <p className="text-[11px] text-slate-500">Standard Municipal Turnaround</p>
        </div>

      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Authority Breakdown Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>Potholes Handled by Civic Body</span>
            </h3>
            <span className="text-[11px] text-slate-400">Total vs Resolved</span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={authorityData} barGap={4}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Bar dataKey="total" name="Total Reported" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Severity Distribution Donut Chart (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-400" />
              <span>Severity Breakdown</span>
            </h3>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
            {severityData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-400">{item.name}:</span>
                <span className="font-bold text-white font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
