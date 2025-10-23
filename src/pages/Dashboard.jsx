import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // <-- 1. IMPORT Link
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/api';
import {
  FileText,
  Briefcase,
  TrendingUp,
  Search, // <-- Added Search for HR action
  Clock,
  Activity,
  Palette, // <-- Added Palette for student action
  Zap, // <-- Added Zap for student action
  BarChart3,
  Loader2 // <-- Added Loader2 for loading state
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true); // Set loading true at start
      try {
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Mock data for charts
  const chartData = [
    { name: 'Jan', value: 20 }, { name: 'Feb', value: 35 }, { name: 'Mar', value: 28 },
    { name: 'Apr', value: 42 }, { name: 'May', value: 38 }, { name: 'Jun', value: 55 },
  ];
  const pieData = [
    { name: 'Technical', value: 35, color: '#3B82F6' }, { name: 'Creative', value: 25, color: '#8B5CF6' },
    { name: 'Business', value: 20, color: '#10B981' }, { name: 'Healthcare', value: 20, color: '#F59E0B' },
  ];

  // Stat Cards Data
  const statCards = [
    { title: 'Total Resumes', value: stats?.total_resumes ?? '...', icon: FileText, color: 'from-blue-500 to-blue-600', change: stats ? '+12%' : '' },
    { title: 'Job Analyses', value: stats?.total_analyses ?? '...', icon: Briefcase, color: 'from-purple-500 to-purple-600', change: stats ? '+8%' : '' },
    { title: 'Success Rate', value: stats ? '94%' : '...', icon: TrendingUp, color: 'from-green-500 to-green-600', change: stats ? '+3%' : '' },
    { title: 'Time Saved', value: stats ? '47h' : '...', icon: Clock, color: 'from-orange-500 to-orange-600', change: stats ? '+15%' : '' }
  ];

  // Quick Actions Data - updated icons and descriptions
  const quickActions = user?.role === 'hr' ? [
    { title: 'Analyze Resumes', description: 'Upload JD & analyze resumes', icon: Search, href: '/analyzer', color: 'from-blue-500 to-blue-600' },
    { title: 'Manage Uploads', description: 'View and manage all resumes', icon: FileText, href: '/uploads', color: 'from-purple-500 to-purple-600' }
  ] : [
    { title: 'Design Resume', description: 'Create a professional resume', icon: Palette, href: '/designer', color: 'from-blue-500 to-blue-600' },
    { title: 'Enhance Resume', description: 'Get AI-powered improvements', icon: Zap, href: '/enhancer', color: 'from-green-500 to-green-600' }
  ];

  if (loading) {
    // Show spinner while loading
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"> {/* Adjust height if needed */}
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name}!
          </h1>
          <p className="text-gray-600">
            {user?.role === 'hr'
              ? 'Manage your recruitment pipeline with AI-powered insights'
              : 'Take control of your career with AI-enhanced tools'
            }
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {stat.change && (
                    <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      {stat.change}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </h3>
                <p className="text-gray-600 text-sm">{stat.title}</p>
              </div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Activity Overview</h2>
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">Last 6 months</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                    padding: '8px'
                  }}
                />
                {/* --- BAR SIZE UPDATED HERE --- */}
                <Bar dataKey="value" fill="url(#colorGradient)" barSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Resume Categories</h2>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <RechartsPieChart // Using specific name due to potential conflict
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </RechartsPieChart>
                <Tooltip
                 contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                    padding: '8px'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  // --- 2. REPLACE <a> WITH <Link> AND href WITH to ---
                  <Link
                    key={index}
                    to={action.href} // Changed from href
                    className="block p-4 border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" // Enhanced hover effect
                  >
                    <div className={`w-10 h-10 bg-gradient-to-r ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </Link>
                  // --- END OF CHANGE ---
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-4 max-h-80 overflow-y-auto"> {/* Added scroll */}
              {stats?.recent_resumes && stats.recent_resumes.length > 0 ? (
                stats.recent_resumes.map((resume) => ( // Use map directly if available
                  <div key={resume._id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {resume.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {/* Ensure date formatting is safe */}
                        {resume.uploaded_at ? new Date(resume.uploaded_at).toLocaleDateString() : 'Date N/A'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;