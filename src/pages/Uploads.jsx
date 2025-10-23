// src/pages/Uploads.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { resumeService } from '../services/api';
import { FileText, Trash2, Loader2, Filter } from 'lucide-react';
// *** Double-check this import path is correct for your project ***
import { useToast } from '../components/ui/Toaster'; // Or '../components/ui/use-toast'?

// Helper to format dates
const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch (e) { return "Invalid Date"; }
};

const Uploads = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [deletingId, setDeletingId] = useState(null); // To show loading on delete button
  const { toast } = useToast(); // Initialize toast

  const fetchResumes = useCallback(async () => {
    // Keep setLoading(true) outside try/finally if you want immediate loading state
    setLoading(true);
    try {
      const data = await resumeService.getAllResumes();
      setResumes(data.resumes || []);
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
      // Ensure toast is called correctly even in initial load error
      try {
        toast({
          title: 'Error Loading Resumes',
          description: error.response?.data?.detail || 'Could not load your resumes.',
          variant: 'destructive',
        });
      } catch (toastError) {
        console.error("Toast function failed:", toastError); // Log if toast itself fails
      }
    } finally {
      setLoading(false);
    }
  }, [toast]); // Add toast dependency

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const filteredResumes = useMemo(() => {
    if (!filterDate) return resumes;
    try {
      const filterTimestamp = new Date(filterDate).setHours(0, 0, 0, 0);
      return resumes.filter(resume => {
        const resumeTimestamp = new Date(resume.uploaded_at).getTime();
        return !isNaN(resumeTimestamp) && resumeTimestamp >= filterTimestamp;
      });
    } catch (e) {
      console.error("Error filtering date:", e);
      return resumes; // Return unfiltered on error
    }
  }, [resumes, filterDate]);

  // --- Corrected Delete Handler ---
  const handleDelete = async (resumeId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(resumeId); // Show loading state for the specific button
    try {
      // 1. Call API (await is important)
      await resumeService.deleteResume(resumeId);

      // 2. Update state IMMEDIATELY on success *before* showing toast
      setResumes(prevResumes => prevResumes.filter(resume => resume.id !== resumeId));

      // 3. Show success toast (ensure toast is valid before calling)
      if (toast && typeof toast === 'function') { // Check if toast is a function before calling
         toast({
           title: 'Resume Deleted',
           description: `"${filename}" has been permanently deleted.`,
           variant: 'success', // Optional: use a success variant if available
           duration: 3000
         });
      } else {
         console.warn("Toast function not available when expected (success).");
      }

    } catch (error) {
      console.error('Delete failed:', error);
      // 4. Show error toast (ensure toast is valid before calling)
       if (toast && typeof toast === 'function') { // Check if toast is a function before calling
          toast({
            title: 'Delete Failed',
            description: error.response?.data?.detail || `Could not delete "${filename}".`,
            variant: 'destructive',
          });
       } else {
          console.warn("Toast function not available when expected (error).");
       }
    } finally {
       setDeletingId(null); // Clear loading state regardless of outcome
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">My Uploads</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage all your uploaded resumes.</p>
        </div>

        {/* Resume List Card */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
          {/* Filter Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 pb-3 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 sm:mb-0">
              Uploaded Resumes ({filteredResumes.length})
            </h2>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <label htmlFor="filter-date" className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Filter from:</label>
              <input
                type="date" id="filter-date" value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              {filterDate && (
                 <button onClick={() => setFilterDate('')} className="text-xs sm:text-sm text-blue-600 hover:underline">Clear</button>
              )}
            </div>
          </div>

          {/* Loading or List */}
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-20rem)] overflow-y-auto custom-scrollbar pr-1"> {/* Scrollable List */}
              {filteredResumes.length === 0 ? (
                <p className="text-gray-500 text-center py-6 text-sm">
                  {resumes.length > 0 ? 'No resumes match filter.' : "You haven't uploaded any resumes yet."}
                </p>
              ) : (
                filteredResumes.map((resume) => (
                  <div key={resume.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-medium text-gray-800 text-xs sm:text-sm truncate" title={resume.filename}>{resume.filename}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(resume.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(resume.id, resume.filename)}
                      disabled={deletingId === resume.id} // Disable button while deleting this specific item
                      className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-100 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete resume"
                    >
                      {deletingId === resume.id ? (
                         <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"/>
                      ) : (
                         <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple Scrollbar Styles (ensure these are loaded, e.g., in index.css or via <style>)
const scrollbarStyle = `
    .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }
`;
if (!document.getElementById('custom-scrollbar-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'custom-scrollbar-styles';
    styleEl.innerHTML = scrollbarStyle;
    document.head.appendChild(styleEl);
}


export default Uploads;