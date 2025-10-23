import React, { useEffect, useState } from 'react';
import { dashboardService } from '../services/api';
import { Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = dashboardService.getAnalytics
          ? await dashboardService.getAnalytics()
          : await dashboardService.getStats();
        setAnalytics(data || {});
      } catch (err) {
        console.error('analytics fetch error', err);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="p-6">Loading analytics…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  // normalize shape with safe fallbacks
  const activity = analytics?.monthly_activity || analytics?.activity_over_time || [
    { name: 'Jan', value: 10 }, { name: 'Feb', value: 20 }, { name: 'Mar', value: 15 }
  ];
  const categories = analytics?.category_breakdown || analytics?.categories || [
    { name: 'Technical', value: 40 }, { name: 'Creative', value: 30 }, { name: 'Business', value: 30 }
  ];

  const totalResumes = (analytics?.total_resumes ?? analytics?.total) || 0;
  const totalAnalyses = analytics?.total_analyses ?? 0;
  const avgTimeSaved = analytics?.avg_time_saved ?? '—';
  const successRate = analytics?.success_rate ?? null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-gray-600">Usage, activity and category breakdown</p>
          </div>
          <Activity className="w-6 h-6 text-gray-500" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Activity (last months)</h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <strong>Total:</strong> {totalResumes}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Category Distribution</h2>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {categories.map((c, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {categories.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />
                    <span>{c.name}</span>
                  </div>
                  <span className="font-medium">{c.value}{analytics?.category_percentage ? '%' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {(analytics?.recent_resumes || []).slice(0, 8).map((r, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 border rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.filename || r.title || 'Resume'}</div>
                    <div className="text-xs text-gray-500">
                      {r.uploaded_at ? new Date(r.uploaded_at).toLocaleString() : r.date || '—'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{r.summary || r.meta || ''}</div>
                  </div>
                  <div className="text-xs text-gray-500">{r.category || r.type || ''}</div>
                </div>
              ))}
              {(!(analytics?.recent_resumes) || analytics.recent_resumes.length === 0) && (
                <div className="text-gray-500 text-sm">No recent activity</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Total Resumes</span><span className="font-medium">{totalResumes}</span></div>
              <div className="flex justify-between"><span>Analyses</span><span className="font-medium">{totalAnalyses}</span></div>
              <div className="flex justify-between"><span>Avg. Time Saved</span><span className="font-medium">{avgTimeSaved}</span></div>
              <div className="flex justify-between"><span>Success Rate</span><span className="font-medium">{successRate ? `${successRate}%` : '—'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;