import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth services
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email, password, full_name, role) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      full_name,
      role
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

// Resume services
export const resumeService = {
  uploadResumes: async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await api.post('/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

// Job analysis services
export const jobService = {
  analyzeJob: async (jobData) => {
    const response = await api.post('/jobs/analyze', jobData);
    return response.data;
  }
};

// AI services
export const aiService = {
  enhanceResume: async (resumeText, targetJob) => {
    const response = await api.post('/ai/enhance-resume', {
      resume_text: resumeText,
      target_job: targetJob
    });
    return response.data;
  },

  generateInterviewQuestion: async (jobRole) => {
    const response = await api.post('/ai/interview-question', {
      question: '',
      job_role: jobRole
    });
    return response.data;
  },

  chatWithAI: async (message, context = null) => {
    const response = await api.post('/ai/chat', { message, context });
    return response.data;
  }
};

// Template services
export const templateService = {
  getTemplates: async () => {
    const response = await api.get('/templates');
    return response.data;
  }
};

// Dashboard services
export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }
};

export default api;