// src/pages/Uploads.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { resumeService } from '../services/api';
import { FileText, Trash2, Loader2, Filter } from 'lucide-react';
import { useToast } from '../components/ui/Toaster';

// Helper to format dates
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

const Uploads = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(''); // State for the date filter
  const { toast } = useToast();

  // Function to fetch all resumes
  const fetchResumes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await resumeService.getAllResumes();
      setResumes(data.resumes || []); // Ensure resumes is always an array
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your resumes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch resumes on component load
  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // Memoized hook to filter resumes based on the selected date
  const filteredResumes = useMemo(() => {
    if (!filterDate) {
      return resumes; // No filter applied
    }
    const filterTimestamp = new Date(filterDate).setHours(0, 0, 0, 0); // Get start of the filter day
    return resumes.filter(resume => {
      const resumeTimestamp = new Date(resume.uploaded_at).getTime();
      return resumeTimestamp >= filterTimestamp;
    });
  }, [resumes, filterDate]);

  // Delete resume handler
  const handleDelete = async (resumeId, filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}? This action cannot be undone.`)) {
      return;
    }
    try {
      // 1. Call the API to delete the file
      await resumeService.deleteResume(resumeId);
      
      // 2. Show a success message
      toast({
        title: 'Resume Deleted',
        description: `${filename} has been permanently deleted.`,
      });

      // 3. --- THIS IS THE FIX ---
      // Immediately remove the item from the local state
      setResumes(prevResumes => prevResumes.filter(resume => resume.id !== resumeId));
      
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: 'Delete Failed',
        description: 'Could not delete the resume. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Uploads</h1>
          <p className="text-gray-600">Manage all your uploaded resumes in one place.</p>
        </div>

        {/* Resume List */}
        <div className="bg-white rounded-xl p-8 shadow-sm">
          {/* Date Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Uploaded Resumes ({filteredResumes.length})
            </h2>
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              <Filter className="w-5 h-5 text-gray-500" />
              <label htmlFor="filter-date" className="text-sm font-medium text-gray-700">Filter from:</label>
              <input
                type="date"
                id="filter-date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              {filterDate && (
                 <button
                    onClick={() => setFilterDate('')}
                    className="text-sm text-blue-600 hover:underline"
                 >
                   Clear
                 </button>
              )}
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResumes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {resumes.length > 0 ? 'No resumes match your filter.' : "You haven't uploaded any resumes yet."}
                </p>
              ) : (
                filteredResumes.map((resume) => (
                  <div key={resume.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-medium text-gray-900 truncate">{resume.filename}</p>
                        <p className="text-sm text-gray-500">
                          Uploaded: {formatDate(resume.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(resume.id, resume.filename)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 flex-shrink-0"
                      title="Delete resume"
                    >
                      <Trash2 className="w-5 h-5" />
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

export default Uploads;