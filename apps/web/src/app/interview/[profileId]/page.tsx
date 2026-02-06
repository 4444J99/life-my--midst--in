'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface InterviewQuestion {
  id: string;
  category: string;
  question: string;
  followUp?: string;
  expectedDuration: number;
}

interface Answer {
  questionId: string;
  answer: string;
  duration: number;
}

export default function InterviewPage() {
  const params = useParams();
  const profileId = params['profileId'] as string;

  const [stage, setStage] = useState<'intro' | 'interview' | 'results'>('intro');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Interview state
  const [interviewerName, setInterviewerName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Results
  const [compatibility, setCompatibility] = useState<any>(null);

  useEffect(() => {
    // Fetch interview questions
    const fetchQuestions = async () => {
      const res = await fetch(`/api/interviews/${profileId}/questions`);
      const data = await res.json();
      setQuestions(data.questions);
    };

    void fetchQuestions();
  }, [profileId]);

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/interviews/${profileId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewerName,
          organizationName,
          jobTitle,
          jobRequirements: [
            { skill: 'Communication', level: 'advanced', required: true },
            { skill: 'Leadership', level: 'intermediate', required: false },
          ],
        }),
      });

      const data = await res.json();
      setSessionId(data.sessionId);
      setStage('interview');
    } catch (error) {
      console.error('Error starting interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || !sessionId) return;

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    const answer: Answer = {
      questionId: currentQ.id,
      answer: currentAnswer,
      duration: 60, // Would track actual duration
    };

    setAnswers([...answers, answer]);

    // Save answer to backend
    try {
      await fetch(`/api/interviews/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...answer,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error saving answer:', error);
    }

    setCurrentAnswer('');

    // Move to next question or complete
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      void completeInterview();
    }
  };

  const completeInterview = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/interviews/sessions/${sessionId}/complete`, {
        method: 'POST',
      });

      const data = await res.json();
      setCompatibility(data.compatibility);
      setStage('results');
    } catch (error) {
      console.error('Error completing interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">The Inverted Interview</h1>
          <p className="text-xl text-gray-300">
            They answer your questions. You evaluate compatibility.
          </p>
        </div>

        {/* Intro Stage */}
        {stage === 'intro' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-12">
            <h2 className="text-3xl font-bold text-white mb-8">Welcome, Interviewer</h2>

            <form onSubmit={handleStartInterview} className="space-y-6">
              <div>
                <label className="block text-white mb-2 font-semibold">Your Name</label>
                <input
                  type="text"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  placeholder="Hiring Manager Name"
                  required
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-semibold">Organization</label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  placeholder="Your Company"
                  required
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-semibold">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  placeholder="Position Title"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition"
              >
                {loading ? 'Starting...' : `Start Interview (${questions.length} Questions)`}
              </button>
            </form>

            <div className="mt-12 p-6 bg-purple-500/20 border border-purple-400/30 rounded-lg">
              <h3 className="text-lg font-bold text-purple-200 mb-3">How This Works</h3>
              <ul className="text-gray-300 space-y-2">
                <li>
                  ✓ You answer {questions.length} thoughtful questions about your organization
                </li>
                <li>✓ The system analyzes your responses in real-time</li>
                <li>✓ Job requirements appear "from the sides of the stage"</li>
                <li>✓ Both parties get compatibility scores and insights</li>
                <li>✓ You learn if you're truly a match before investing time</li>
              </ul>
            </div>
          </div>
        )}

        {/* Interview Stage */}
        {stage === 'interview' && currentQuestion && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-12">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-300 mb-2">
                <span>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 border border-white/20">
                <div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="mb-8">
              <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                {currentQuestion.category}
              </span>
              <h2 className="text-3xl font-bold text-white mt-3 mb-6">
                {currentQuestion.question}
              </h2>

              {currentQuestion.followUp && (
                <p className="text-gray-300 italic mb-6">Follow-up: {currentQuestion.followUp}</p>
              )}
            </div>

            {/* Answer Input */}
            <div className="mb-8">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="w-full h-40 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 resize-none"
                placeholder="Your thoughtful answer here..."
              />
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex(currentQuestionIndex - 1);
                    const prevQ = questions[currentQuestionIndex - 1];
                    setCurrentAnswer(answers.find((a) => a.questionId === prevQ?.id)?.answer || '');
                  }
                }}
                className="px-6 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
              >
                Previous
              </button>

              <button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim() || loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition"
              >
                {currentQuestionIndex === questions.length - 1
                  ? loading
                    ? 'Analyzing...'
                    : 'Complete Interview'
                  : 'Next Question'}
              </button>
            </div>
          </div>
        )}

        {/* Results Stage */}
        {stage === 'results' && compatibility && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-12">
            <h2 className="text-4xl font-bold text-white mb-8">Compatibility Analysis</h2>

            {/* Overall Score */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div className="text-center">
                <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                  {compatibility.scores.overall}%
                </div>
                <p className="text-gray-300">Overall Fit</p>
              </div>
              <div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Skill Match</span>
                      <span className="text-white font-semibold">
                        {compatibility.scores.skillMatch}%
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 border border-white/20">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${compatibility.scores.skillMatch}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Values Alignment</span>
                      <span className="text-white font-semibold">
                        {compatibility.scores.valuesAlign}%
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 border border-white/20">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${compatibility.scores.valuesAlign}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Growth Fit</span>
                      <span className="text-white font-semibold">
                        {compatibility.scores.growthFit}%
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 border border-white/20">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${compatibility.scores.growthFit}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Green Flags */}
            {compatibility.greenFlags.length > 0 && (
              <div className="mb-8 p-6 bg-green-500/20 border border-green-400/30 rounded-lg">
                <h3 className="font-bold text-green-200 mb-3">✓ Green Flags</h3>
                <ul className="text-gray-300 space-y-1">
                  {compatibility.greenFlags.map((flag: string, i: number) => (
                    <li key={i}>• {flag}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red Flags */}
            {compatibility.redFlags.length > 0 && (
              <div className="mb-8 p-6 bg-red-500/20 border border-red-400/30 rounded-lg">
                <h3 className="font-bold text-red-200 mb-3">⚠️ Red Flags</h3>
                <ul className="text-gray-300 space-y-1">
                  {compatibility.redFlags.map((flag: string, i: number) => (
                    <li key={i}>• {flag}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {compatibility.recommendations.length > 0 && (
              <div className="p-6 bg-purple-500/20 border border-purple-400/30 rounded-lg">
                <h3 className="font-bold text-purple-200 mb-3">→ Recommended Next Steps</h3>
                <ul className="text-gray-300 space-y-1">
                  {compatibility.recommendations.map((rec: string, i: number) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-12 flex gap-4">
              <button
                onClick={() => (window.location.href = `/`)}
                className="flex-1 px-6 py-3 rounded-lg border border-white/20 text-white hover:bg-white/10 transition font-semibold"
              >
                Return to Profile
              </button>
              <button
                onClick={() => {
                  setStage('intro');
                  setCurrentAnswer('');
                  setAnswers([]);
                  setCurrentQuestionIndex(0);
                }}
                className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition font-semibold"
              >
                Start New Interview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
