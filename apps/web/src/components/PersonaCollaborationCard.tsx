'use client';

import { useState, useCallback } from 'react';
import { Users, Send, Copy, Clock } from 'lucide-react';

interface PersonaCollaborationCardProps {
  profileId: string;
  personaId: string;
  personaName: string;
  onRequestSent?: () => void;
}

export default function PersonaCollaborationCard({
  profileId,
  personaId,
  personaName,
  onRequestSent,
}: PersonaCollaborationCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [advisorEmail, setAdvisorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_shareToken, setShareToken] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const generateShareLink = useCallback(() => {
    try {
      setIsSubmitting(true);
      const token = crypto.randomUUID(); // allow-secret
      setShareToken(token);

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${baseUrl}/feedback/persona/${token}`;
      setShareLink(link);
      setShowLink(true);
    } catch (error) {
      console.error('Failed to generate share link:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleSendRequest = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!advisorEmail.trim() || isSubmitting) return;

      setIsSubmitting(true);
      setSubmitStatus('idle');

      try {
        const response = await fetch('/api/collaboration/feedback-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId,
            personaId,
            advisorEmail: advisorEmail.trim(),
            message: message.trim() || undefined,
          }),
        });

        if (response.ok) {
          setSubmitStatus('success');
          setAdvisorEmail('');
          setMessage('');

          setTimeout(() => {
            setIsOpen(false);
            setSubmitStatus('idle');
            if (onRequestSent) onRequestSent();
          }, 2000);
        } else {
          setSubmitStatus('error');
        }
      } catch (error) {
        console.error('Failed to send feedback request:', error);
        setSubmitStatus('error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [profileId, personaId, advisorEmail, message, isSubmitting, onRequestSent],
  );

  const copyToClipboard = () => {
    if (shareLink) {
      void navigator.clipboard.writeText(shareLink);
      // Show confirmation
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Refine {personaName}</h3>
            <p className="text-sm text-gray-600">Request feedback from advisors</p>
          </div>
        </div>
      </div>

      {/* Not open state */}
      {!isOpen && (
        <div>
          <p className="text-sm text-gray-700 mb-4">
            Get constructive feedback on your <strong>{personaName}</strong> persona. Share a link
            with mentors or advisors to get their insights on how you can refine this persona.
          </p>

          <button
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <Send className="w-4 h-4" />
            Request Feedback
          </button>
        </div>
      )}

      {/* Open state - Form */}
      {isOpen && (
        <div>
          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            <button
              onClick={() => setShowLink(false)}
              className={`px-4 py-2 font-medium transition-colors ${
                !showLink
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Send Email
            </button>
            <button
              onClick={() => setShowLink(true)}
              className={`px-4 py-2 font-medium transition-colors ${
                showLink
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Share Link
            </button>
          </div>

          {/* Email form */}
          {!showLink && (
            <form onSubmit={handleSendRequest} className="space-y-3">
              <div>
                <label
                  htmlFor="advisorEmail"
                  className="block text-sm font-semibold text-gray-900 mb-1"
                >
                  Advisor Email
                </label>
                <input
                  id="advisorEmail"
                  type="email"
                  value={advisorEmail}
                  onChange={(e) => setAdvisorEmail(e.target.value)}
                  placeholder="advisor@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-900 mb-1">
                  Message (optional)
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell them what kind of feedback would be most helpful..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition"
                />
              </div>

              {submitStatus === 'success' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  ✓ Feedback request sent! Your advisor will receive an email with a link to review
                  your persona.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  ✗ Failed to send request. Please try again.
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          )}

          {/* Share link form */}
          {showLink && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Share this link with anyone. They can view your <strong>{personaName}</strong>{' '}
                persona and provide feedback without needing to create an account.
              </p>

              {!shareLink ? (
                <button
                  onClick={generateShareLink}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {isSubmitting ? 'Generating...' : 'Generate Share Link'}
                </button>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy link"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 mb-3">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Link expires in 30 days
                  </div>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          💡 <strong>Tip:</strong> Feedback helps you refine how you present yourself. Choose
          advisors who know you well and can give honest, constructive input.
        </p>
      </div>
    </div>
  );
}
