'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Activity,
  Filter,
  Download,
} from 'lucide-react';

interface BetaUser {
  id: string;
  email: string;
  name: string;
  joinedAt: string;
  profileCompletion: number;
  personasCreated: number;
  jobsApplied: number;
  feedbackSubmitted: number;
  lastActive: string;
  status: 'active' | 'inactive' | 'churned';
  tier: 'free' | 'pro' | 'enterprise';
}

interface BetaMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
  profileCompletionRate: number;
  hunterAdoptionRate: number;
  feedbackSubmissionRate: number;
  churnRate: number;
  nps: number;
}

export default function BetaDashboard() {
  const [metrics, setMetrics] = useState<BetaMetrics | null>(null);
  const [betaUsers, setBetaUsers] = useState<BetaUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('lastActive');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    try {
      setIsLoading(true);

      // In production, fetch from actual API
      const mockMetrics: BetaMetrics = {
        totalUsers: 247,
        activeUsers: 189,
        newUsersThisWeek: 23,
        profileCompletionRate: 78,
        hunterAdoptionRate: 64,
        feedbackSubmissionRate: 43,
        churnRate: 5.2,
        nps: 72,
      };

      const mockUsers: BetaUser[] = [
        {
          id: '1',
          email: 'alice@example.com',
          name: 'Alice Chen',
          joinedAt: '2024-01-15',
          profileCompletion: 95,
          personasCreated: 3,
          jobsApplied: 8,
          feedbackSubmitted: 2,
          lastActive: '2024-01-20',
          status: 'active',
          tier: 'pro',
        },
        {
          id: '2',
          email: 'bob@example.com',
          name: 'Bob Smith',
          joinedAt: '2024-01-10',
          profileCompletion: 45,
          personasCreated: 1,
          jobsApplied: 0,
          feedbackSubmitted: 0,
          lastActive: '2024-01-14',
          status: 'inactive',
          tier: 'free',
        },
        // Add more mock users as needed
      ];

      setMetrics(mockMetrics);
      setBetaUsers(mockUsers);
    } catch (error) {
      console.error('Failed to load beta dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = betaUsers
    .filter((u) => filterStatus === 'all' || u.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'lastActive':
          return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
        case 'profileCompletion':
          return b.profileCompletion - a.profileCompletion;
        case 'jobsApplied':
          return b.jobsApplied - a.jobsApplied;
        case 'joined':
          return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
        default:
          return 0;
      }
    });

  const exportData = () => {
    const csv = [
      [
        'Email',
        'Name',
        'Joined',
        'Profile %',
        'Personas',
        'Jobs Applied',
        'Feedback',
        'Status',
        'Tier',
      ],
      ...betaUsers.map((u) => [
        u.email,
        u.name,
        u.joinedAt,
        u.profileCompletion,
        u.personasCreated,
        u.jobsApplied,
        u.feedbackSubmitted,
        u.status,
        u.tier,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beta-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Beta Program Dashboard</h1>
          <p className="text-gray-600">Monitor beta user adoption, engagement, and feedback</p>
        </div>

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Beta Users</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.totalUsers}</p>
                  <p className="text-xs text-green-600 mt-1">
                    +{metrics.newUsersThisWeek} this week
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Users</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round((metrics.activeUsers / metrics.totalUsers) * 100)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {metrics.activeUsers} of {metrics.totalUsers}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Profile Completion</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.profileCompletionRate}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Average completion rate</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-purple-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Net Promoter Score</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.nps}</p>
                  <p className="text-xs text-green-600 mt-1">Excellent</p>
                </div>
                <MessageSquare className="w-8 h-8 text-orange-500 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Feature Adoption */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Feature Adoption</h2>
              <div className="space-y-4">
                {[
                  { name: 'Hunter Protocol', rate: metrics.hunterAdoptionRate },
                  { name: 'Inverted Interview', rate: 38 },
                  { name: 'Feedback Submission', rate: metrics.feedbackSubmissionRate },
                  { name: 'Persona Creation', rate: 72 },
                ].map((feature) => (
                  <div key={feature.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">{feature.name}</span>
                      <span className="text-sm font-semibold text-gray-700">{feature.rate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${feature.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Health Indicators</h2>
              <div className="space-y-4">
                {[
                  { label: 'Churn Rate', value: `${metrics.churnRate}%`, status: 'good' },
                  { label: 'Retention (30-day)', value: '94.8%', status: 'good' },
                  {
                    label: 'Avg Profile Completeness',
                    value: `${metrics.profileCompletionRate}%`,
                    status: 'good',
                  },
                  { label: 'Feedback Response Rate', value: '46%', status: 'ok' },
                ].map((indicator) => (
                  <div key={indicator.label} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{indicator.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{indicator.value}</span>
                      {indicator.status === 'good' && (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Toolbar */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Beta Users</h2>
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'active', 'inactive', 'churned'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <option value="lastActive">Last Active</option>
                <option value="profileCompletion">Profile Completion</option>
                <option value="jobsApplied">Jobs Applied</option>
                <option value="joined">Recently Joined</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Profile %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Personas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Jobs Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Feedback
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-600">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(user.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${user.profileCompletion}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {user.profileCompletion}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {user.personasCreated}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {user.jobsApplied}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {user.feedbackSubmitted}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : user.status === 'inactive'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(user.lastActive).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-6 text-center text-gray-600">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No users found with selected filter</p>
            </div>
          )}
        </div>

        {/* Insights Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">🎯 Key Insights</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>✓ Hunter Protocol adoption is strong (64%)</li>
              <li>✓ Profile completion rate is healthy (78%)</li>
              <li>⚠️ Inverted Interview adoption needs improvement (38%)</li>
              <li>⚠️ Churn is within expected range but monitor closely</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-3">📊 Recommended Actions</h3>
            <ul className="text-sm text-green-800 space-y-2">
              <li>1. Email inactive users (7+ days) with encouragement</li>
              <li>2. Add tutorial for Inverted Interview feature</li>
              <li>3. Create onboarding email sequence for new users</li>
              <li>4. Follow up with churned users to understand why</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
