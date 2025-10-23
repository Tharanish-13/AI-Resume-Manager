// src/pages/AnalysisHistory.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { jobService, resumeService } from '../services/api'; // Import both services
import { useAuth } from '../contexts/AuthContext';
import { Loader2, FileText, Calendar, User as UserIcon, AlertCircle, Filter, Download, Eye, Sheet } from 'lucide-react';
import { useToast } from '../components/ui/Toaster'; // Ensure correct path
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// --- Helper Functions ---

// Formats ISO date string to a more readable format
const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString('en-US', { // Use 'en-IN' for Indian locale if preferred
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch (e) { console.error("Date format error:", e); return "Invalid Date"; }
};

// Determines background/text color based on similarity score
const getScoreColor = (score) => {
    const numericScore = parseFloat(score);
    if (isNaN(numericScore)) return 'text-gray-500 bg-gray-100';
    if (numericScore >= 0.8) return 'text-green-700 bg-green-100';
    if (numericScore >= 0.6) return 'text-yellow-700 bg-yellow-100';
    if (numericScore < 0.4) return 'text-red-700 bg-red-100';
    return 'text-orange-700 bg-orange-100'; // Default for "Needs Improvement" range
};

// Gets a descriptive label for the score range
const getScoreLabel = (score) => {
    const numericScore = parseFloat(score);
     if (isNaN(numericScore)) return 'N/A';
     if (numericScore >= 0.8) return 'Excellent';
     if (numericScore >= 0.6) return 'Good';
     if (numericScore < 0.4) return 'Poor';
     return 'Needs Improvement';
};

// --- Component Definition ---

const AnalysisHistory = () => {
  // --- State Variables ---
  const [history, setHistory] = useState([]); // Raw analysis data from API
  const [loading, setLoading] = useState(true); // Loading state for initial fetch
  const [error, setError] = useState(null); // Stores fetch error messages
  const [startDate, setStartDate] = useState(''); // Start date filter
  const [endDate, setEndDate] = useState(''); // End date filter
  const [loadingAction, setLoadingAction] = useState({ type: null, id: null }); // Tracks loading state for buttons (preview, download, export)

  // --- Hooks ---
  const { user } = useAuth(); // Get current user data (for displaying name)
  const { toast } = useToast(); // Toast notifications

  // --- Data Fetching ---
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await jobService.getAnalysisHistory();
      // Sort newest analyses first (backend should ideally do this)
      const sortedHistory = (data.history || []).sort((a, b) =>
          new Date(b.analyzedAt) - new Date(a.analyzedAt)
      );
      setHistory(sortedHistory);
    } catch (err) {
      console.error("Failed to fetch analysis history:", err);
      const errorMsg = err.response?.data?.detail || "Could not load analysis history.";
      setError(errorMsg);
      if (toast && typeof toast === 'function') {
        toast({ title: "Error Loading History", description: errorMsg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]); // Dependency: toast function

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]); // Run fetch on mount (and if fetchHistory changes, though unlikely)

  // --- Filtering Logic ---
  const filteredHistory = useMemo(() => {
    return history.filter(analysis => {
      try {
        const analysisDate = new Date(analysis.analyzedAt);
        if (isNaN(analysisDate.getTime())) return false; // Skip invalid dates

        // Get start/end timestamps (start of day for start, end of day for end)
        const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

        // Apply filters
        if (start && analysisDate < start) return false;
        if (end && analysisDate > end) return false;
        return true; // Include if passes checks
      } catch (e) {
        console.error("Date filtering error:", e);
        return false; // Exclude on error
      }
    });
  }, [history, startDate, endDate]); // Recalculate when data or filters change

  // --- Action Handlers ---

  // Preview Resume File
  const handlePreviewResume = async (resumeId, filename) => {
    if (!resumeId || loadingAction.id) return; // Prevent if no ID or another action is loading
    setLoadingAction({ type: 'preview', id: resumeId });
    try {
      const { blob } = await resumeService.getResumeBlob(resumeId, 'inline'); // Request for inline view
      if (!blob || blob.size === 0) throw new Error("Received empty file data.");
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, '_blank'); // Open in new tab
    } catch (err) {
      console.error('Preview failed:', err);
      if (toast && typeof toast === 'function') toast({ title: 'Preview Failed', description: err.message || `Could not load ${filename}.`, variant: 'destructive' });
    } finally {
      setLoadingAction({ type: null, id: null }); // Reset loading state
    }
  };

  // Download Resume File
  const handleDownloadResume = async (resumeId, filename) => {
    if (!resumeId || loadingAction.id) return; // Prevent if no ID or another action is loading
    setLoadingAction({ type: 'download', id: resumeId });
    try {
      // Request blob with attachment hint, get actual filename from header if possible
      const { blob, filename: actualFilename } = await resumeService.getResumeBlob(resumeId, 'attachment');
      if (!blob || blob.size === 0) throw new Error("Received empty file data for download.");
      saveAs(blob, actualFilename || filename); // Use file-saver
    } catch (err) {
      console.error('Download failed:', err);
      if (toast && typeof toast === 'function') toast({ title: 'Download Failed', description: err.message || `Could not download ${filename}.`, variant: 'destructive' });
    } finally {
      setLoadingAction({ type: null, id: null }); // Reset loading state
    }
  };

  // Export Results for a Single Analysis Group to Excel
  const handleExportGroupResults = (analysis) => {
    const analysisId = analysis.analysisId || analysis._id;
    if (loadingAction.id === analysisId || !analysis?.rankedResumes?.length) {
       if (!analysis?.rankedResumes?.length && toast && typeof toast === 'function') {
           toast({ title: "No results to export", variant: "warning" });
       }
       return; // Prevent multiple clicks or exporting empty data
    }
    setLoadingAction({ type: 'export', id: analysisId });
    if (toast && typeof toast === 'function') toast({title: "Generating Export...", description: `Preparing data...`, duration: 2000});

    // Use setTimeout to allow UI update before potentially blocking export generation
    setTimeout(() => {
      try {
        // Prepare data: Ensure score is numeric, sort, select columns
        const data = analysis.rankedResumes
          .map(r => ({ ...r, score: parseFloat(r.similarity_score) || 0 }))
          .sort((a, b) => b.score - a.score)
          .map((resume, index) => ({
            Rank: index + 1,
            Candidate: resume.filename,
            'Match Score (%)': (resume.score * 100).toFixed(1),
            'Match Level': getScoreLabel(resume.score),
            // Add 'Uploaded Date': formatDate(resume.uploaded_at) if available
          }));

        // Create Excel sheet and workbook
        const ws = XLSX.utils.json_to_sheet(data);
        // Optional: Adjust column widths (example)
        ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ranked Resumes');

        // Generate filename
        const safeTitle = (analysis.jobTitle || 'analysis').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateStr = analysis.analyzedAt ? new Date(analysis.analyzedAt).toISOString().split('T')[0] : 'date';
        const fileName = `analysis_${safeTitle}_${dateStr}.xlsx`;

        // Generate buffer and save
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(blob, fileName);

      } catch (error) {
        console.error("Failed to export group results:", error);
        if (toast && typeof toast === 'function') toast({ title: "Export Failed", description: "Could not generate Excel file.", variant: "destructive"});
      } finally {
        setLoadingAction({ type: null, id: null }); // Clear loading state
      }
    }, 50); // Small delay
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Analysis History</h1>
          <p className="text-sm sm:text-base text-gray-600">Review past resume analysis results.</p>
        </div>

        {/* Date Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-6 border border-gray-200">
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <h3 className="text-sm sm:text-md font-semibold text-gray-700 flex items-center whitespace-nowrap">
                   <Filter className="w-4 h-4 mr-1.5 text-gray-400"/> Filter by Date
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:space-x-2">
                    <div>
                        <label htmlFor="start-date" className="sr-only">From Date</label>
                        <input type="date" id="start-date" value={startDate} title="Start Date"
                            onChange={(e) => setStartDate(e.target.value)} max={endDate || undefined}
                            className="px-2 py-1 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full"
                        />
                    </div>
                     <div>
                        <label htmlFor="end-date" className="sr-only">To Date</label>
                        <input type="date" id="end-date" value={endDate} title="End Date"
                            onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined}
                            className="px-2 py-1 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full"
                         />
                    </div>
                    {(startDate || endDate) && (
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} title="Clear date filters"
                            className="text-xs sm:text-sm text-blue-600 hover:underline pt-1 sm:pt-0 whitespace-nowrap col-span-2 sm:col-span-1 text-center sm:text-left">
                           Clear
                        </button>
                    )}
                </div>
           </div>
        </div>

        {/* Error Display */}
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-center space-x-2 text-sm">
                <AlertCircle className="w-5 h-5"/> <span>{error}</span>
            </div>
        )}

        {/* Empty State */}
        {!loading && filteredHistory.length === 0 && !error && (
            <div className="text-center py-10 bg-white rounded-lg shadow-sm border border-gray-200">
               <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
               <p className="text-gray-500 text-sm sm:text-base">
                    {history.length > 0 ? 'No analyses match filter.' : 'No analysis history.'}
                </p>
                {history.length === 0 && <p className="text-xs sm:text-sm text-gray-400 mt-1">Run analysis via 'Analyzer' page.</p>}
           </div>
        )}

        {/* History List */}
        <div className="space-y-5 sm:space-y-6">
          {filteredHistory.map((analysis) => {
            const currentAnalysisId = analysis.analysisId || analysis._id;
            const isExporting = loadingAction.type === 'export' && loadingAction.id === currentAnalysisId;
            return (
              <div key={currentAnalysisId} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                {/* Analysis Group Header */}
                <div className="bg-gray-50 p-3 sm:p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="overflow-hidden">
                      <h2 className="text-md sm:text-lg font-semibold text-gray-800 truncate" title={analysis.jobTitle}> Job: {analysis.jobTitle} </h2>
                      <div className="flex flex-wrap items-center text-[10px] sm:text-xs text-gray-500 mt-1 gap-x-3 gap-y-0.5">
                         <div className="flex items-center space-x-1"> <Calendar className="w-3 h-3"/> <span>{formatDate(analysis.analyzedAt)}</span> </div>
                         <div className="flex items-center space-x-1"> <UserIcon className="w-3 h-3"/> <span>By: {user?.full_name || 'You'}</span> </div>
                         <div className="flex items-center space-x-1"> <FileText className="w-3 h-3"/> <span>{analysis.rankedResumes?.length || 0} Resume(s)</span> </div>
                      </div>
                  </div>
                  <div className="flex-shrink-0 self-start sm:self-center mt-2 sm:mt-0">
                        <button onClick={() => handleExportGroupResults(analysis)}
                            disabled={isExporting || !analysis.rankedResumes || analysis.rankedResumes.length === 0}
                            className="bg-green-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-green-700 flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={(!analysis.rankedResumes || analysis.rankedResumes.length === 0) ? "No resumes to export" : "Export results to Excel"}
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sheet className="w-4 h-4" />}
                            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                        </button>
                   </div>
                </div>

                {/* Ranked Resumes List */}
                <div className="p-3 sm:p-4 max-h-80 overflow-y-auto custom-scrollbar">
                  {analysis.rankedResumes && analysis.rankedResumes.length > 0 ? (
                      <ul className="space-y-2">
                      {analysis.rankedResumes
                          .map(r => ({ ...r, score: parseFloat(r.similarity_score) || 0 }))
                          .sort((a, b) => b.score - a.score)
                          .map((resume, index) => {
                            const isActionLoading = loadingAction.id === resume.id;
                            return (
                                <li key={resume.id || index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-2.5 bg-white rounded-md border border-gray-100 gap-1.5 sm:gap-2">
                                  <div className="flex items-center space-x-2 overflow-hidden w-full sm:w-auto flex-grow">
                                    <span className="text-xs font-medium text-gray-400 w-5 text-right flex-shrink-0">{index + 1}.</span>
                                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm text-gray-700 truncate" title={resume.filename}> {resume.filename || 'N/A'} </span>
                                  </div>
                                  <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start pl-7 sm:pl-0">
                                     <span className={`text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${getScoreColor(resume.score)}`}>
                                       {(resume.score * 100).toFixed(1)}%
                                     </span>
                                     <button onClick={() => handlePreviewResume(resume.id, resume.filename)} disabled={isActionLoading}
                                       className="text-indigo-500 hover:text-indigo-700 p-0.5 rounded disabled:opacity-40 disabled:cursor-not-allowed" title="Preview">
                                        {loadingAction.type === 'preview' && isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Eye className="w-3.5 h-3.5" />}
                                     </button>
                                     <button onClick={() => handleDownloadResume(resume.id, resume.filename)} disabled={isActionLoading}
                                       className="text-blue-500 hover:text-blue-700 p-0.5 rounded disabled:opacity-40 disabled:cursor-not-allowed" title="Download">
                                         {loadingAction.type === 'download' && isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5" />}
                                     </button>
                                  </div>
                                </li>
                           );
                         })}
                    </ul>
                  ) : (
                    <p className="text-center text-gray-400 text-sm py-3">No ranked resumes found.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Scrollbar styles
const scrollbarStyle = `
    .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }
`;
if (!document.getElementById('custom-scrollbar-styles')) {
    const styleEl = document.createElement('style'); styleEl.id = 'custom-scrollbar-styles';
    styleEl.innerHTML = scrollbarStyle; document.head.appendChild(styleEl);
}

export default AnalysisHistory;