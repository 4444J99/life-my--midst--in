'use client';

import { useState, useEffect } from 'react';
import { Star, Briefcase, MessageSquare, Send, Filter, Heart } from 'lucide-react';

interface MentorProfile {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  areasOfExpertise: string[];
  yearsOfExperience: number;
  bio: string;
  availability: 'limited' | 'moderate' | 'available' | 'unavailable';
  commitmentLevel: 'casual' | 'committed' | 'intensive';
  rating: number;
  reviewCount: number;
  matchScore?: number;
}

interface MentorProfilesProps {
  userId: string;
  onRequestMentorship?: (mentorId: string) => void;
}

export default function MentorProfiles({ userId: _userId, onRequestMentorship }: MentorProfilesProps) {
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<MentorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('any');
  const [savedMentors, setSavedMentors] = useState<Set<string>>(new Set());

  const allExpertiseAreas = [
    'Software Engineering',
    'Product Management',
    'Design',
    'Data Science',
    'Leadership',
    'Entrepreneurship',
    'Career Transition',
    'Personal Development',
  ];

  useEffect(() => {
    loadMentors();
  }, []);

  useEffect(() => {
    filterMentors();
  }, [mentors, selectedExpertise, availabilityFilter]);

  const loadMentors = async () => {
    try {
      setIsLoading(true);
      // Mock data - in production, fetch from API
      const mockMentors: MentorProfile[] = [
        {
          id: '1',
          userId: 'user-1',
          name: 'Sarah Chen',
          areasOfExpertise: ['Software Engineering', 'Leadership'],
          yearsOfExperience: 12,
          bio: 'Senior engineer turned tech lead. Passionate about helping engineers grow into leadership roles.',
          availability: 'moderate',
          commitmentLevel: 'committed',
          rating: 4.8,
          reviewCount: 24,
          matchScore: 95,
        },
        {
          id: '2',
          userId: 'user-2',
          name: 'Marcus Johnson',
          areasOfExpertise: ['Entrepreneurship', 'Product Management'],
          yearsOfExperience: 15,
          bio: 'Founded 2 startups, now advising early-stage founders. Love helping people navigate the startup journey.',
          availability: 'limited',
          commitmentLevel: 'intensive',
          rating: 4.9,
          reviewCount: 31,
          matchScore: 87,
        },
        {
          id: '3',
          userId: 'user-3',
          name: 'Aisha Patel',
          areasOfExpertise: ['Design', 'Product Management', 'Leadership'],
          yearsOfExperience: 10,
          bio: 'Design leader helping teams build human-centered products. Experience at Google and Figma.',
          availability: 'available',
          commitmentLevel: 'committed',
          rating: 4.7,
          reviewCount: 18,
          matchScore: 92,
        },
      ];

      setMentors(mockMentors);
    } catch (error) {
      console.error('Failed to load mentors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMentors = () => {
    let filtered = mentors;

    // Filter by expertise
    if (selectedExpertise.length > 0) {
      filtered = filtered.filter((m) =>
        m.areasOfExpertise.some((e) => selectedExpertise.includes(e)),
      );
    }

    // Filter by availability
    if (availabilityFilter !== 'any') {
      filtered = filtered.filter((m) => m.availability === availabilityFilter);
    }

    // Sort by match score
    filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    setFilteredMentors(filtered);
  };

  const handleExpertiseToggle = (expertise: string) => {
    setSelectedExpertise((prev) =>
      prev.includes(expertise) ? prev.filter((e) => e !== expertise) : [...prev, expertise],
    );
  };

  const handleSaveMentor = (mentorId: string) => {
    setSavedMentors((prev) => {
      const updated = new Set(prev);
      if (updated.has(mentorId)) {
        updated.delete(mentorId);
      } else {
        updated.add(mentorId);
      }
      return updated;
    });
  };

  const handleRequestMentorship = async (mentor: MentorProfile) => {
    try {
      const response = await fetch('/api/collaboration/mentorship-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: mentor.userId,
          message: `I'd like to learn from your expertise in ${mentor.areasOfExpertise.join(', ')}.`,
        }),
      });

      if (response.ok) {
        if (onRequestMentorship) {
          onRequestMentorship(mentor.id);
        }
        // Show success message
      }
    } catch (error) {
      console.error('Failed to request mentorship:', error);
    }
  };

  const getAvailabilityBadge = (availability: string) => {
    const badges = {
      available: { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
      moderate: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Moderately Available' },
      limited: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Limited' },
      unavailable: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Unavailable' },
    };
    const badge = badges[availability as keyof typeof badges];
    return badge || badges.unavailable;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Mentor</h1>
        <p className="text-gray-600">
          Connect with experienced professionals who can guide your growth and career development.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Filters */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </h2>

            {/* Expertise Filter */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Areas of Expertise</h3>
              <div className="space-y-2">
                {allExpertiseAreas.map((expertise) => (
                  <label key={expertise} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedExpertise.includes(expertise)}
                      onChange={() => handleExpertiseToggle(expertise)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{expertise}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability Filter */}
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Availability</h3>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
              >
                <option value="any">Any</option>
                <option value="available">Available</option>
                <option value="moderate">Moderately Available</option>
                <option value="limited">Limited</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(selectedExpertise.length > 0 || availabilityFilter !== 'any') && (
              <button
                onClick={() => {
                  setSelectedExpertise([]);
                  setAvailabilityFilter('any');
                }}
                className="w-full mt-6 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Main Content - Mentor Cards */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                <p className="text-gray-600">Loading mentors...</p>
              </div>
            </div>
          ) : filteredMentors.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No mentors match your criteria</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMentors.map((mentor) => {
                const availabilityBadge = getAvailabilityBadge(mentor.availability);
                const isSaved = savedMentors.has(mentor.id);

                return (
                  <div
                    key={mentor.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0"></div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-900">{mentor.name}</h3>
                              {mentor.matchScore && mentor.matchScore > 90 && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                                  Perfect Match
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 mb-2 flex-wrap">
                              <span className="flex items-center gap-1 text-sm text-gray-600">
                                <Briefcase className="w-4 h-4" />
                                {mentor.yearsOfExperience} years experience
                              </span>
                              <span className="flex items-center gap-1 text-sm text-gray-600">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                {mentor.rating.toFixed(1)} ({mentor.reviewCount} reviews)
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {mentor.areasOfExpertise.slice(0, 3).map((expertise) => (
                                <span
                                  key={expertise}
                                  className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                                >
                                  {expertise}
                                </span>
                              ))}
                              {mentor.areasOfExpertise.length > 3 && (
                                <span className="text-xs text-gray-600">
                                  +{mentor.areasOfExpertise.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSaveMentor(mentor.id)}
                          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                            isSaved ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* Bio */}
                      <p className="text-sm text-gray-600 mb-4">{mentor.bio}</p>

                      {/* Status & Actions */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${availabilityBadge.bg} ${availabilityBadge.text}`}
                        >
                          {availabilityBadge.label}
                        </span>

                        <div className="flex gap-2">
                          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                            <MessageSquare className="w-4 h-4" />
                            Message
                          </button>
                          <button
                            onClick={() => handleRequestMentorship(mentor)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                          >
                            <Send className="w-4 h-4" />
                            Request
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info Card */}
          {filteredMentors.length > 0 && (
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                💡 <strong>Tip:</strong> When requesting mentorship, personalize your message and
                explain what specific areas you'd like to learn about. Mentors appreciate
                thoughtful, specific requests.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
