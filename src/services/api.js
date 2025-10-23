import axios from 'axios';

// Use environment variable exposed by Vite, otherwise default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json', // Default for most requests
  },
  timeout: 10000, // Add a reasonable timeout (10 seconds)
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Remove default Content-Type for FormData requests, Axios will set it
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling (401, etc.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const originalRequestUrl = error.config?.url; // Get URL of the failed request

    if (status === 401) {
      console.error("Unauthorized (401) - Clearing token and redirecting.");
      localStorage.removeItem('token');
      // Avoid redirect loop if already on login/register or if the 401 was from login itself
      if (!originalRequestUrl?.includes('/auth/login') && !window.location.pathname.startsWith('/login')) {
         window.location.href = '/login'; // Force redirect
      }
    } else {
      // Log more specific error details if available
      const errorMsg = error.response?.data?.detail || // FastAPI specific detail
                       (Array.isArray(error.response?.data?.errors) ? JSON.stringify(error.response.data.errors) : null) || // Handle multi-error response from upload
                       error.response?.data || // Other potential error structures
                       error.message; // Fallback to general message
      console.error(`API Response Error (${status || 'Network Error'}):`, errorMsg);
    }
    return Promise.reject(error); // Reject so components can catch it
  }
);


// --- Auth services ---
export const authService = {
  login: async (email, password) => {
    if (!email || !password) throw new Error("Email and password are required.");
    const response = await api.post('/auth/login', { email, password });
    if (response.data.access_token) localStorage.setItem('token', response.data.access_token);
    return response.data; // { access_token, token_type }
  },
  register: async (email, password, full_name, role) => {
    if (!email || !password || !full_name || !role) throw new Error("All fields required.");
    const response = await api.post('/auth/register', { email, password, full_name, role });
    if (response.data.access_token) localStorage.setItem('token', response.data.access_token);
    return response.data; // { access_token, token_type }
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data; // { email, full_name, role }
  }
};

// --- Resume services ---
export const resumeService = {
  uploadResumes: async (files) => {
    const formData = new FormData();
    if (!files || typeof files[Symbol.iterator] !== 'function' || files.length === 0) {
        throw new Error("Input must be a non-empty iterable (FileList or Array).");
    }
    let fileAppended = false;
    Array.from(files).forEach((file) => {
        if (file instanceof File && file.size > 0) {
            formData.append('files', file); // Key MUST match backend File(...) parameter name
            fileAppended = true;
        } else { console.warn("Skipping invalid/empty file:", file?.name); }
    });
    if (!fileAppended) throw new Error("No valid, non-empty files to upload.");

    // The request interceptor will remove Content-Type for FormData
    const response = await api.post('/resumes/upload', formData);
    return response.data; // { message, resumes: [...], errors?: [...] }
  },
  getAllResumes: async () => {
    const response = await api.get('/resumes/all');
    return response.data; // { resumes: [...] }
  },
  deleteResume: async (resumeId) => {
    if (!resumeId) throw new Error("Resume ID required.");
    const response = await api.delete(`/resumes/${resumeId}`);
    return response.data; // { message }
  },
  getResumeBlob: async (resumeId, disposition = 'inline') => {
    if (!resumeId) throw new Error("Resume ID required.");
    const response = await api.get(`/resumes/file/${resumeId}`, {
      params: { disposition }, responseType: 'blob',
    });
    const contentDisposition = response.headers['content-disposition'];
    let filename = `resume_${resumeId}.file`;
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/i); // Improved regex
        if (filenameMatch?.[1]) {
             try { filename = decodeURIComponent(filenameMatch[1]); } // Handle URI encoding
             catch (e) { filename = filenameMatch[1].replace(/['"]/g, ''); } // Fallback cleaning
        }
    }
    return { blob: response.data, filename: filename };
  }
};

// --- Job analysis services ---
export const jobService = {
  analyzeJob: async (jobData) => {
     if (!jobData?.title || !jobData?.description || !jobData?.requirements) {
         throw new Error("Job Title, Description, and Requirements mandatory.");
     }
    // resume_ids is optional based on backend logic
    const response = await api.post('/jobs/analyze', jobData);
    return response.data; // { job_id, total_resumes, ranked_resumes: [...] }
  },

  // --- ADDED THIS FUNCTION ---
  getAnalysisHistory: async () => {
    const response = await api.get('/analyses/history');
    // Expected structure from backend: { history: [ { analysisId, jobTitle, analyzedAt, rankedResumes: [...] } ] }
    return response.data;
  }
  // --- END ADDITION ---
};

// --- AI services ---
export const aiService = {
  enhanceResume: async (resumeText, targetJob) => {
    if (!resumeText || !targetJob) throw new Error("Resume text & target job required.");
    const response = await api.post('/ai/enhance-resume', { resume_text: resumeText, target_job: targetJob });
    return response.data; // { suggestions: string }
  },
  generateInterviewQuestion: async (jobRole) => {
    if (!jobRole) throw new Error("Job role required.");
    const response = await api.post('/ai/interview-question', { job_role: jobRole });
    return response.data; // { question: string }
  },
  chatWithAI: async (message, context = null) => {
     if (!message) throw new Error("Message required.");
    const payload = context ? { message, context } : { message };
    const response = await api.post('/ai/chat', payload);
    return response.data; // { response: string }
  }
};

// --- Template services ---
export const templateService = {
  getTemplates: async () => {
    const response = await api.get('/templates');
    return response.data; // { templates: [...] }
  }
};

// --- Dashboard services ---
export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data; // { total_resumes, total_jobs, total_analyses, recent_resumes: [...] }
  }
};

// You typically import the service objects (authService, resumeService, etc.)
// export default api;