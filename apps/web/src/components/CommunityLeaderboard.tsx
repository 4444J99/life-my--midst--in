'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Medal, Star, Users, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  score: number;
  contributions: {
    feedbackGiven: number;
    mentoringSessions: number;
    profilesCreated: number;
    connectionsFormed: number;
    contentCreated: number;
  };
  badges: number;
  profileViews: number;
}

interface CommunityMetrics {
  totalUsers: number;
  activeContributors: number;
  avgContributionsPerUser: number;
  totalMentorshipSessions: number;
  mostPopularSkills: string[];
}

export default function CommunityLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [metrics, setMetrics] = useState<CommunityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');
  const [filterBy, setFilterBy] = useState<'overall' | 'feedback' | 'mentoring'>('overall');

  useEffect(() => {
    void loadLeaderboard();
  }, [timeframe, filterBy]);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/community/leaderboard?timeframe=${timeframe}&filterBy=${filterBy}`,
      );
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      // Mock data for demo
      setLeaderboard(generateMockLeaderboard());
      setMetrics(generateMockMetrics());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockLeaderboard = (): LeaderboardUser[] => [
    {
      rank: 1,
      userId: '1',
      name: 'Alice Chen',
      score: 2850,
      contributions: {
        feedbackGiven: 45,
        mentoringSessions: 12,
        profilesCreated: 5,
        connectionsFormed: 32,
        contentCreated: 8,
      },
      badges: 8,
      profileViews: 245,
    },
    {
      rank: 2,
      userId: '2',
      name: 'Marcus Johnson',
      score: 2650,
      contributions: {
        feedbackGiven: 38,
        mentoringSessions: 15,
        profilesCreated: 4,
        connectionsFormed: 28,
        contentCreated: 6,
      },
      badges: 7,
      profileViews: 189,
    },
    {
      rank: 3,
      userId: '3',
      name: 'Aisha Patel',
      score: 2420,
      contributions: {
        feedbackGiven: 32,
        mentoringSessions: 10,
        profilesCreated: 5,
        connectionsFormed: 25,
        contentCreated: 7,
      },
      badges: 7,
      profileViews: 156,
    },
  ];

  const generateMockMetrics = (): CommunityMetrics => ({
    totalUsers: 2847,
    activeContributors: 342,
    avgContributionsPerUser: 3.2,
    totalMentorshipSessions: 1203,
    mostPopularSkills: ['Leadership', 'Python', 'Product Management', 'Design', 'DevOps'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.totalUsers.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Contributors</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeContributors}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Mentorship Sessions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.totalMentorshipSessions}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            {(['week', 'month', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tf === 'week' ? 'This Week' : tf === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {(['overall', 'feedback', 'mentoring'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterBy(filter)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterBy === filter
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter === 'overall'
                  ? 'Overall'
                  : filter === 'feedback'
                    ? 'Feedback'
                    : 'Mentoring'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Community Leaderboard
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Score</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                  Contributions
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Badges</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaderboard.map((user) => (
                <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.rank === 1 && <Medal className="w-5 h-5 text-yellow-500" />}
                      {user.rank === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                      {user.rank === 3 && <Medal className="w-5 h-5 text-orange-600" />}
                      <span className="font-bold text-gray-900">{user.rank}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <Link
                      href={`/profile/${user.userId}`}
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      {user.name}
                    </Link>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-lg font-bold text-gray-900">
                      {user.score.toLocaleString()}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Feedback: {user.contributions.feedbackGiven}</div>
                      <div>Mentoring: {user.contributions.mentoringSessions}</div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {Array(Math.min(user.badges, 5))
                        .fill(0)
                        .map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      {user.badges > 5 && (
                        <span className="text-xs text-gray-600">+{user.badges - 5}</span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-gray-700 font-medium">{user.profileViews}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Skills */}
      {metrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-900 mb-4">Most Popular Skills</h3>
          <div className="flex flex-wrap gap-2">
            {metrics.mostPopularSkills.map((skill, idx) => (
              <span
                key={skill}
                className={`px-4 py-2 rounded-full font-medium text-sm ${
                  idx === 0
                    ? 'bg-yellow-100 text-yellow-800'
                    : idx === 1
                      ? 'bg-gray-200 text-gray-800'
                      : idx === 2
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-50 text-blue-700'
                }`}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 <strong>How to climb the leaderboard:</strong> Request feedback on personas, mentor
          others, build connections, and contribute to the community!
        </p>
      </div>
    </div>
  );
}
