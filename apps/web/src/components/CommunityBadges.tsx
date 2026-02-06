'use client';

import { useState, useEffect } from 'react';
import { Trophy, Star, Users, MessageSquare, Code, Award, Zap } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  requirement: string;
  progress?: number;
  maxProgress?: number;
  earnedAt?: string;
  isEarned: boolean;
}

interface CommunityBadgesProps {
  userId: string;
  userBadges?: string[];
  onBadgeEarned?: (badgeId: string) => void;
}

const BADGE_DEFINITIONS: Omit<Badge, 'isEarned' | 'progress' | 'maxProgress'>[] = [
  {
    id: 'first-persona',
    name: 'Identity Architect',
    description: 'Created your first persona',
    icon: <Award className="w-6 h-6" />,
    rarity: 'common',
    requirement: 'Create 1 persona',
  },
  {
    id: 'mentor-seeker',
    name: 'Mentor Seeker',
    description: 'Connected with a mentor',
    icon: <Users className="w-6 h-6" />,
    rarity: 'uncommon',
    requirement: 'Send 1 mentorship request',
  },
  {
    id: 'feedback-collector',
    name: 'Feedback Collector',
    description: 'Requested feedback on a persona',
    icon: <MessageSquare className="w-6 h-6" />,
    rarity: 'uncommon',
    requirement: 'Request feedback 3 times',
  },
  {
    id: 'network-builder',
    name: 'Network Builder',
    description: 'Connected with 10 other users',
    icon: <Users className="w-6 h-6" />,
    rarity: 'rare',
    requirement: 'Create 10 connections',
  },
  {
    id: 'open-source-hero',
    name: 'Open Source Hero',
    description: 'Integrated GitHub profile',
    icon: <Code className="w-6 h-6" />,
    rarity: 'uncommon',
    requirement: 'Sync GitHub profile',
  },
  {
    id: 'well-rounded',
    name: 'Well Rounded',
    description: 'Created 5 different personas',
    icon: <Star className="w-6 h-6" />,
    rarity: 'rare',
    requirement: 'Create 5 personas',
  },
  {
    id: 'mentor-master',
    name: 'Mentor Master',
    description: 'Mentored 5 people',
    icon: <Trophy className="w-6 h-6" />,
    rarity: 'rare',
    requirement: 'Complete 5 mentorships',
  },
  {
    id: 'community-pillar',
    name: 'Community Pillar',
    description: 'Received 100+ profile views',
    icon: <Zap className="w-6 h-6" />,
    rarity: 'legendary',
    requirement: 'Get 100 profile views',
  },
];

const rarityColors = {
  common: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-700',
    badge: 'bg-gray-200',
  },
  uncommon: {
    bg: 'bg-green-100',
    border: 'border-green-300',
    text: 'text-green-700',
    badge: 'bg-green-200',
  },
  rare: {
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-700',
    badge: 'bg-blue-200',
  },
  legendary: {
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-700',
    badge: 'bg-purple-200',
  },
};

export default function CommunityBadges({
  userId: _userId,
  userBadges = [],
  onBadgeEarned: _onBadgeEarned,
}: CommunityBadgesProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    // Map definitions to user data
    const userBadgeSet = new Set(userBadges);
    const mappedBadges = BADGE_DEFINITIONS.map((def) => ({
      ...def,
      isEarned: userBadgeSet.has(def.id),
      progress: undefined,
      maxProgress: undefined,
    }));

    setBadges(mappedBadges);
  }, [userBadges]);

  const earnedBadges = badges.filter((b) => b.isEarned);
  const displayedBadges = showAll ? badges : badges.slice(0, 6);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Achievements & Badges
        </h2>
        <span className="text-sm font-semibold text-gray-600">
          {earnedBadges.length} / {badges.length} earned
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Badge Collection Progress</span>
          <span className="text-sm font-semibold text-gray-900">
            {Math.round((earnedBadges.length / badges.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-yellow-400 to-purple-500 h-3 rounded-full transition-all"
            style={{ width: `${(earnedBadges.length / badges.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {displayedBadges.map((badge) => {
          const colors = rarityColors[badge.rarity];
          return (
            <button
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={`p-4 rounded-lg border-2 transition-all group ${
                badge.isEarned
                  ? `${colors.bg} ${colors.border} cursor-pointer hover:shadow-md`
                  : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
              }`}
            >
              <div
                className={`w-8 h-8 mx-auto mb-2 ${badge.isEarned ? colors.text : 'text-gray-400'}`}
              >
                {badge.icon}
              </div>
              <h4 className="text-xs font-semibold text-gray-900 text-center leading-tight line-clamp-2">
                {badge.name}
              </h4>
              {!badge.isEarned && (
                <p className="text-xs text-gray-500 mt-1 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${colors.badge}`}>
                    {badge.rarity}
                  </span>
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Show All Toggle */}
      {badges.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {showAll ? 'Show Less' : `Show All (${badges.length})`}
        </button>
      )}

      {/* Selected Badge Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <button
              onClick={() => setSelectedBadge(null)}
              className="float-right text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <div className="mb-4">
              <div className={`w-16 h-16 ${rarityColors[selectedBadge.rarity].text} mx-auto mb-4`}>
                {selectedBadge.icon}
              </div>

              <h3 className="text-xl font-bold text-gray-900 text-center">{selectedBadge.name}</h3>
              <p className="text-sm text-gray-600 text-center mt-1">{selectedBadge.description}</p>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-600">Rarity</span>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    rarityColors[selectedBadge.rarity].badge
                  } ${rarityColors[selectedBadge.rarity].text}`}
                >
                  {selectedBadge.rarity.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-700 font-medium">{selectedBadge.requirement}</p>
            </div>

            {selectedBadge.isEarned && selectedBadge.earnedAt && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                <p className="text-xs text-green-800">
                  ✓ <strong>Earned</strong> on{' '}
                  {new Date(selectedBadge.earnedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {!selectedBadge.isEarned && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="text-xs text-amber-800">
                  Keep working! Complete the requirement to unlock this badge.
                </p>
              </div>
            )}

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      {earnedBadges.length === 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Get started:</strong> Create your first persona to earn your first badge!
          </p>
        </div>
      )}
    </div>
  );
}
