import React, { useState } from 'react';
import { aiService } from '../services/api';
import { MessageCircle, Play, RotateCcw, Lightbulb, Award } from 'lucide-react';

const InterviewTrainer = () => {
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [questionHistory, setQuestionHistory] = useState([]);

  const commonRoles = [
    'Software Engineer',
    'Data Scientist',
    'Product Manager',
    'UX Designer',
    'Marketing Manager',
    'Sales Representative',
    'Business Analyst',
    'Project Manager'
  ];

  const handleStartSession = async () => {
    if (!jobRole.trim()) return;
    
    setQuestionLoading(true);
    setSessionStarted(true);
    
    try {
      const result = await aiService.generateInterviewQuestion(jobRole);
      setCurrentQuestion(result.question);
      setQuestionHistory([result.question]);
    } catch (error) {
      console.error('Failed to generate question:', error);
      setCurrentQuestion("Tell me about yourself and why you're interested in this position.");
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleGenerateNewQuestion = async () => {
    setQuestionLoading(true);
    setUserAnswer('');
    setFeedback('');
    
    try {
      const result = await aiService.generateInterviewQuestion(jobRole);
      setCurrentQuestion(result.question);
      setQuestionHistory(prev => [...prev, result.question]);
    } catch (error) {
      console.error('Failed to generate question:', error);
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) return;
    
    setLoading(true);
    
    try {
      // Simulate feedback generation (since we're using the chat endpoint)
      const prompt = `Evaluate this interview answer for a ${jobRole} position. Question: "${currentQuestion}" Answer: "${userAnswer}". Provide constructive feedback on content, structure, and suggestions for improvement.`;
      const result = await aiService.chatWithAI(prompt);
      setFeedback(result.response);
    } catch (error) {
      console.error('Failed to get feedback:', error);
      setFeedback('Great effort! Remember to use the STAR method (Situation, Task, Action, Result) when answering behavioral questions. Be specific about your achievements and quantify results when possible.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setSessionStarted(false);
    setCurrentQuestion('');
    setUserAnswer('');
    setFeedback('');
    setQuestionHistory([]);
    setJobRole('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Trainer</h1>
          <p className="text-gray-600">Practice interviews with AI and get personalized feedback</p>
        </div>

        {!sessionStarted ? (
          /* Setup Section */
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Start Your Interview Practice</h2>
            <p className="text-gray-600 mb-8">Choose your target role to get personalized interview questions</p>
            
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Role
                </label>
                <input
                  type="text"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  placeholder="Enter your target job role"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="text-left">
                <p className="text-sm text-gray-500 mb-2">Popular roles:</p>
                <div className="flex flex-wrap gap-2">
                  {commonRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => setJobRole(role)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleStartSession}
                disabled={!jobRole.trim() || questionLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transform hover:scale-105 transition-all"
              >
                {questionLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <Play className="w-5 h-5" />
                <span>Start Interview</span>
              </button>
            </div>
          </div>
        ) : (
          /* Interview Session */
          <div className="space-y-6">
            {/* Progress Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Interview Session</h2>
                  <p className="text-gray-600">Role: {jobRole} • Question {questionHistory.length}</p>
                </div>
                <button
                  onClick={handleRestart}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart</span>
                </button>
              </div>
            </div>

            {/* Current Question */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Question</h3>
              {questionLoading ? (
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Generating your next question...</span>
                </div>
              ) : (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="text-blue-900 font-medium">{currentQuestion}</p>
                </div>
              )}
            </div>

            {/* Answer Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Answer</h3>
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer here... Think about specific examples and use the STAR method (Situation, Task, Action, Result) for behavioral questions."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  {userAnswer.length} characters
                </div>
                <div className="space-x-3">
                  <button
                    onClick={handleGenerateNewQuestion}
                    disabled={questionLoading}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Skip Question
                  </button>
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!userAnswer.trim() || loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Getting Feedback...' : 'Get Feedback'}
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback Section */}
            {feedback && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  <span>AI Feedback</span>
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="prose prose-sm max-w-none text-green-800 whitespace-pre-wrap">
                    {feedback}
                  </div>
                </div>
                
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleGenerateNewQuestion}
                    disabled={questionLoading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg flex items-center space-x-2 transform hover:scale-105 transition-all"
                  >
                    {questionLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    <span>Next Question</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tips Section */}
            <div className="bg-yellow-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center space-x-2">
                <Lightbulb className="w-5 h-5" />
                <span>Interview Tips</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-yellow-800">
                <div>
                  <h4 className="font-medium mb-2">STAR Method</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>S</strong>ituation: Set the context</li>
                    <li><strong>T</strong>ask: Explain what needed to be done</li>
                    <li><strong>A</strong>ction: Describe what you did</li>
                    <li><strong>R</strong>esult: Share the outcome</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">General Tips</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Be specific and use examples</li>
                    <li>• Quantify your achievements</li>
                    <li>• Show enthusiasm and passion</li>
                    <li>• Ask thoughtful questions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewTrainer;