# AI Resume Manager - Full Stack Application

A comprehensive AI-powered resume management platform built with React.js and FastAPI, featuring advanced resume ranking, enhancement, and interview training capabilities.

## Features

### 🤖 AI-Powered Core Features
- **Resume Ranking**: Uses Sentence-BERT transformers to analyze semantic similarity between resumes and job descriptions
- **Resume Enhancement**: LLM-powered suggestions to improve resume content for specific job roles
- **Interview Trainer**: Interactive AI chatbot that generates job-specific questions and provides feedback
- **AI Assistant**: Real-time help system for platform guidance and HR/interview tips

### 👥 User Roles
- **HR Professionals**: Upload multiple resumes, analyze job fit, view ranked candidates
- **Job Seekers/Students**: Design resumes, get AI enhancements, practice interviews

### 🎨 Professional UI/UX
- Modern gradient-based design system
- Fully responsive layouts (mobile, tablet, desktop)
- Advanced animations and micro-interactions
- Professional dashboard with data visualizations
- ATS-friendly resume templates

## Tech Stack

### Frontend
- **React.js 18** (JSX only, no TypeScript)
- **Tailwind CSS** - Complete styling solution
- **React Router DOM** - Client-side routing
- **Axios** - API communication
- **Recharts** - Data visualization
- **React Dropzone** - File upload handling
- **Lucide React** - Icon library

### Backend
- **FastAPI** - High-performance Python API
- **MongoDB Atlas** - Cloud database
- **Sentence Transformers** - AI-powered resume ranking
- **OpenAI GPT** - Resume enhancement and chat
- **PyPDF2 & python-docx** - Document processing
- **JWT Authentication** - Secure user sessions
- **Motor** - Async MongoDB driver

### AI/ML Components
- **sentence-transformers/all-MiniLM-L6-v2** - Semantic similarity calculation
- **OpenAI GPT-3.5-turbo** - Text enhancement and conversation
- **Scikit-learn** - Cosine similarity calculations
- **PyTorch** - Machine learning framework

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- MongoDB Atlas account (connection string provided)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Configuration:**
   The `.env` file is already configured with MongoDB Atlas connection:
   ```env
   MONGO_URI="mongodb+srv://stark-s_database:welcomestark@airesumemanager.swknryw.mongodb.net/?retryWrites=true&w=majority&appName=AIResumeManager"
   SECRET_KEY="your-super-secret-jwt-key-here-change-in-production"
   OPENAI_API_KEY=""  # Optional: Add for enhanced AI features
   ```

4. **Start the FastAPI server:**
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

   The API will be available at: `http://localhost:8000`
   API Documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

   The application will be available at: `http://localhost:5173`

## Usage Guide

### For HR Professionals

1. **Register/Login** as an HR professional
2. **Upload Resumes**: Go to Resume Analyzer and upload multiple PDF/DOCX files
3. **Add Job Description**: Enter job title, description, and requirements
4. **View Rankings**: Get AI-powered similarity scores and ranked candidate list
5. **Export Results**: Download analysis results for further review

### For Job Seekers/Students

1. **Register/Login** as a student/job seeker
2. **Resume Designer**: Create professional resumes using multiple templates
3. **Resume Enhancer**: Get AI suggestions to improve your resume for specific jobs
4. **Interview Trainer**: Practice with AI-generated questions and get feedback
5. **AI Assistant**: Ask questions about resume writing, interview tips, and platform features

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info

### Resume Management
- `POST /resumes/upload` - Upload multiple resume files
- `POST /jobs/analyze` - Analyze resumes against job description

### AI Services
- `POST /ai/enhance-resume` - Get resume improvement suggestions
- `POST /ai/interview-question` - Generate interview questions
- `POST /ai/chat` - Chat with AI assistant

### Templates & Dashboard
- `GET /templates` - Get resume templates
- `GET /dashboard/stats` - Get user dashboard statistics

## File Structure

```
ai-resume-manager/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── .env                # Environment variables
├── src/
│   ├── components/          # Reusable components
│   │   ├── Navigation.jsx
│   │   ├── AIAssistant.jsx
│   │   └── ui/
│   ├── contexts/           # React contexts
│   │   └── AuthContext.jsx
│   ├── pages/              # Main application pages
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ResumeAnalyzer.jsx
│   │   ├── ResumeDesigner.jsx
│   │   ├── ResumeEnhancer.jsx
│   │   └── InterviewTrainer.jsx
│   ├── services/           # API services
│   │   └── api.js
│   └── App.jsx            # Main application component
├── package.json           # Node.js dependencies
└── README.md             # Project documentation
```

## AI Model Details

### Resume Ranking Algorithm
1. **Text Extraction**: PDF/DOCX files are processed to extract plain text
2. **Embedding Generation**: Sentence-BERT creates semantic embeddings for job descriptions and resumes
3. **Similarity Calculation**: Cosine similarity measures relevance between job requirements and candidate profiles
4. **Ranking**: Candidates are sorted by similarity scores with percentage-based matching

### Enhancement Engine
- Uses OpenAI GPT-3.5-turbo for contextual resume improvements
- Analyzes resume content against specific job requirements
- Provides actionable suggestions for better keyword optimization
- Includes formatting and structure recommendations

## Security Features

- **JWT Authentication** with secure token handling
- **Password Hashing** using bcrypt
- **CORS Configuration** for secure cross-origin requests
- **Input Validation** and sanitization
- **Rate Limiting** on AI endpoints
- **Secure File Upload** with type validation

## Production Deployment

### Environment Variables for Production
```env
MONGO_URI="your-production-mongodb-uri"
SECRET_KEY="your-super-secure-jwt-secret-key"
OPENAI_API_KEY="your-openai-api-key"
```

### Docker Deployment (Optional)
```dockerfile
# Backend Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Frontend Dockerfile  
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "run", "preview"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For technical support or questions:
- Check the API documentation at `http://localhost:8000/docs`
- Review the codebase for implementation details
- Open an issue on the repository

--

**AI Resume Manager** - Transforming recruitment with artificial intelligence 🚀