import React, { useState } from 'react';
import { aiService } from '../services/api';
import { Zap, FileText, Lightbulb, CheckCircle, Copy } from 'lucide-react';

const ResumeEnhancer = () => {
  const [resumeText, setResumeText] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEnhance = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await aiService.enhanceResume(resumeText, targetJob);
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error('Enhancement failed:', error);
      setSuggestions('Sorry, there was an error processing your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleResume = `John Doe
Software Engineer
john.doe@email.com | (555) 123-4567 | LinkedIn: linkedin.com/in/johndoe

EXPERIENCE
Software Developer at TechCorp (2021 - Present)
- Developed web applications using React and Node.js
- Worked with databases and APIs
- Participated in team meetings and code reviews

Junior Developer at StartupXYZ (2019 - 2021)
- Built websites using HTML, CSS, and JavaScript
- Fixed bugs and implemented new features
- Collaborated with team members

EDUCATION
Bachelor of Science in Computer Science
State University (2015 - 2019)
GPA: 3.5/4.0

SKILLS
JavaScript, React, Node.js, Python, SQL, Git`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Enhancer</h1>
          <p className="text-gray-600">Get AI-powered suggestions to improve your resume for specific job roles</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Your Resume</span>
              </h2>
              
              <form onSubmit={handleEnhance} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Job Title/Role
                  </label>
                  <input
                    type="text"
                    value={targetJob}
                    onChange={(e) => setTargetJob(e.target.value)}
                    placeholder="e.g., Senior Software Engineer, Data Scientist, Product Manager"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resume Text
                  </label>
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your resume text here..."
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setResumeText(sampleResume)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Use Sample Resume
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading || !resumeText.trim() || !targetJob.trim()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transform hover:scale-105 transition-all"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    <Zap className="w-5 h-5" />
                    <span>Enhance Resume</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Tips Section */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center space-x-2">
                <Lightbulb className="w-5 h-5" />
                <span>Enhancement Tips</span>
              </h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span className="text-sm">Include specific metrics and achievements</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span className="text-sm">Use action verbs to start bullet points</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span className="text-sm">Tailor keywords to match job requirements</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span className="text-sm">Highlight relevant skills and technologies</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <span>AI Suggestions</span>
              </h2>
              {suggestions && (
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Analyzing your resume...</p>
                </div>
              </div>
            ) : suggestions ? (
              <div className="prose prose-sm max-w-none">
                <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
                  {suggestions}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Enhance Your Resume?</h3>
                <p className="text-gray-600">
                  Enter your target job and resume text to get personalized AI-powered suggestions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        {suggestions && (
          <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white text-center">
            <h3 className="text-xl font-semibold mb-2">Ready to Apply These Suggestions?</h3>
            <p className="mb-4 opacity-90">Use our Resume Designer to create a polished, professional resume</p>
            <a
              href="/designer"
              className="inline-flex items-center space-x-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all"
            >
              <span>Go to Resume Designer</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeEnhancer;