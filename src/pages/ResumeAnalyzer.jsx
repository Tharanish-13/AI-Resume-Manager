import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useDropzone } from 'react-dropzone';
import { resumeService, jobService } from '../services/api';
import { 
  Upload, 
  FileText, 
  Briefcase, 
  Search, 
  TrendingUp,
  CheckCircle,
  X,
  Download
} from 'lucide-react';

// Helper function to format the date string from the server
const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ResumeAnalyzer = () => {
  const [step, setStep] = useState(1);
  const [uploadedResumes, setUploadedResumes] = useState([]);
  const [jobDescription, setJobDescription] = useState({
    title: '',
    description: '',
    requirements: ''
  });
  const [analysisResults, setAnalysisResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setUploadLoading(true);
        try {
          const result = await resumeService.uploadResumes(acceptedFiles);
          setUploadedResumes(prev => [...prev, ...result.resumes]);
        } catch (error) {
          console.error('Upload failed:', error);
        } finally {
          setUploadLoading(false);
        }
      }
    }
  });

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...jobDescription,
        resume_ids: uploadedResumes.map(r => r.id) // send only current uploads
      };
      const results = await jobService.analyzeJob(payload);
      setAnalysisResults(results);
      setStep(3);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeResume = (index) => {
    setUploadedResumes(prev => prev.filter((_, i) => i !== index));
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Excellent Match';
    if (score >= 0.6) return 'Good Match';
    return 'Needs Improvement';
  };

  const handleExportResults = () => {
    if (!analysisResults) return;

    // Prepare data for Excel
    const data = analysisResults.ranked_resumes.map(resume => ({
      Candidate: resume.filename,
      'Uploaded Date': formatDate(resume.uploaded_at), // Added date to export
      'Match %': `${(resume.similarity_score * 100).toFixed(2)}%`,
      'Missing Skills': resume.missing_skills && resume.missing_skills.length > 0
        ? resume.missing_skills.join(', ')
        : 'None',
      'Improvements Needed': resume.improvements || 'N/A'
    }));

    // Add header row
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');

    // Export to file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fileName = 'resume-analysis-results.xlsx';
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), fileName);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Analyzer</h1>
          <p className="text-gray-600">Upload resumes and job descriptions to get AI-powered matching insights</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[
              { step: 1, title: 'Upload Resumes', icon: Upload },
              { step: 2, title: 'Job Description', icon: Briefcase },
              { step: 3, title: 'Analysis Results', icon: TrendingUp }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = step === item.step;
              const isCompleted = step > item.step;
              
              return (
                <div key={item.step} className="flex items-center space-x-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-600' : isActive ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <Icon className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <span className={`font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {item.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Upload Resumes */}
        {step === 1 && (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Upload Resumes</h2>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drop resume files here, or click to select
              </h3>
              <p className="text-gray-600 mb-4">
                Supports PDF and DOCX files up to 10MB each
              </p>
              {uploadLoading && (
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Uploading...
                </div>
              )}
            </div>

            {/* Uploaded Resumes */}
            {uploadedResumes.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Uploaded Resumes ({uploadedResumes.length})
                </h3>
                <div className="space-y-3">
                  {uploadedResumes.map((resume, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">{resume.filename}</p>
                          <p className="text-sm text-gray-500">
                            {resume.text_preview}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeResume(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={uploadedResumes.length === 0}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Job Description
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Job Description */}
        {step === 2 && (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Job Description</h2>
            
            <form onSubmit={handleJobSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={jobDescription.title}
                  onChange={(e) => setJobDescription({...jobDescription, title: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description
                </label>
                <textarea
                  value={jobDescription.description}
                  onChange={(e) => setJobDescription({...jobDescription, description: e.target.value})}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the role, responsibilities, and what the ideal candidate would do..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requirements & Qualifications
                </label>
                <textarea
                  value={jobDescription.requirements}
                  onChange={(e) => setJobDescription({...jobDescription, requirements: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="List the required skills, experience, education, and qualifications..."
                  required
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-gray-600 hover:text-gray-700 font-medium"
                >
                  Back to Upload
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <Search className="w-5 h-5" />
                  <span>Analyze Resumes</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Analysis Results */}
        {step === 3 && analysisResults && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Analysis Results</h2>
                <div className="text-sm text-gray-500">
                  {analysisResults.total_resumes} resumes analyzed
                </div>
              </div>

              <div className="space-y-4">
                {analysisResults.ranked_resumes.map((resume, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{resume.filename}</h3>
                          {/* --- THIS IS THE MODIFIED PART --- */}
                          <p className="text-sm text-gray-500">
                            Uploaded: {formatDate(resume.uploaded_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(resume.similarity_score)}`}>
                          {(resume.similarity_score * 100).toFixed(1)}% Match
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {getScoreLabel(resume.similarity_score)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Resume Preview</h4>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {resume.text_preview}
                      </p>
                    </div>
                    
                    <div className="flex justify-end">
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center space-x-1">
                        <Download className="w-4 h-4" />
                        <span>View Full Resume</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => {
                    setStep(1);
                    setUploadedResumes([]); // Clear session uploads
                    setAnalysisResults(null); // Clear results
                    setJobDescription({ title: '', description: '', requirements: '' }); // Clear job form
                  }}
                  className="text-gray-600 hover:text-gray-700 font-medium"
                >
                  Start New Analysis
                </button>
                
                <button
                  onClick={handleExportResults}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 flex items-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Export Results</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalyzer;