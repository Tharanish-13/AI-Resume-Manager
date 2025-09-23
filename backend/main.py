from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, status, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from typing import List, Optional
import os
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
import asyncio
from bson import ObjectId
import json
import io
from sentence_transformers import SentenceTransformer
import PyPDF2
from docx import Document
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import google.generativeai as genai  # <-- MODIFIED: Replaced openai
from transformers import pipeline

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Resume Manager API", version="1.0.0")
security = HTTPBearer()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "your mongodb atlas url")
client = AsyncIOMotorClient(MONGO_URI)
db = client.ai_resume_manager

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Initialize AI models
sentence_model = SentenceTransformer('all-MiniLM-L6-v2')

# --- MODIFIED: Google Generative AI Configuration ---
# Use the key from .env or the one you provided as a fallback
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "your google api")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    # Using gemini-1.5-flash for speed and capability
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    print("Warning: GOOGLE_API_KEY not found. AI features will use mock responses.")
    gemini_model = None  # AI features will fallback to mock
# --- End Modification ---


# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"  # "hr" or "student"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class JobDescription(BaseModel):
    title: str
    description: str
    requirements: str

class InterviewQuestion(BaseModel):
    question: str
    job_role: str

class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None

class ResumeEnhanceRequest(BaseModel):
    resume_text: str
    target_job: str

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

def extract_text_from_pdf(file_content):
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    except Exception as e:
        return f"Error extracting PDF text: {str(e)}"

def extract_text_from_docx(file_content):
    try:
        doc = Document(io.BytesIO(file_content))
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        return f"Error extracting DOCX text: {str(e)}"

def calculate_similarity(job_description, resume_text):
    try:
        job_embedding = sentence_model.encode([job_description])
        resume_embedding = sentence_model.encode([resume_text])
        similarity = cosine_similarity(job_embedding, resume_embedding)[0][0]
        return float(similarity)
    except Exception as e:
        print(f"Similarity calculation error: {e}")
        return 0.0

# Routes
@app.get("/")
async def root():
    return {"message": "AI Resume Manager API is running"}

@app.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    user_doc = {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    result = await db.users.insert_one(user_doc)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"]
    }

@app.post("/resumes/upload")
async def upload_resumes(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    uploaded_resumes = []
    
    for file in files:
        if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            continue
        
        content = await file.read()
        
        # Extract text based on file type
        if file.content_type == "application/pdf":
            text = extract_text_from_pdf(content)
        else:
            text = extract_text_from_docx(content)
        
        resume_doc = {
            "filename": file.filename,
            "content_type": file.content_type,
            "text": text,
            "uploaded_by": current_user["email"],
            "uploaded_at": datetime.utcnow(),
            "size": len(content)
        }
        
        result = await db.resumes.insert_one(resume_doc)
        uploaded_resumes.append({
            "id": str(result.inserted_id),
            "filename": file.filename,
            "text_preview": text[:200] + "..." if len(text) > 200 else text
        })
    
    return {"message": f"Uploaded {len(uploaded_resumes)} resumes", "resumes": uploaded_resumes}

@app.post("/jobs/analyze")
async def analyze_job(
    job: JobDescription,
    current_user: dict = Depends(get_current_user)
):
    # Save job description
    job_doc = {
        "title": job.title,
        "description": job.description,
        "requirements": job.requirements,
        "created_by": current_user["email"],
        "created_at": datetime.utcnow()
    }
    
    job_result = await db.jobs.insert_one(job_doc)
    
    # Get all resumes for this user
    resumes = await db.resumes.find({"uploaded_by": current_user["email"]}).to_list(None)
    
    # Calculate similarities
    job_text = f"{job.title} {job.description} {job.requirements}"
    ranked_resumes = []
    
    for resume in resumes:
        similarity_score = calculate_similarity(job_text, resume["text"])
        ranked_resumes.append({
            "id": str(resume["_id"]),
            "filename": resume["filename"],
            "similarity_score": similarity_score,
            "text_preview": resume["text"][:300] + "..." if len(resume["text"]) > 300 else resume["text"]
        })
    
    # Sort by similarity score
    ranked_resumes.sort(key=lambda x: x["similarity_score"], reverse=True)
    
    # Save analysis results
    analysis_doc = {
        "job_id": str(job_result.inserted_id),
        "ranked_resumes": ranked_resumes,
        "analyzed_by": current_user["email"],
        "analyzed_at": datetime.utcnow()
    }
    
    await db.analyses.insert_one(analysis_doc)
    
    return {
        "job_id": str(job_result.inserted_id),
        "total_resumes": len(ranked_resumes),
        "ranked_resumes": ranked_resumes
    }

@app.post("/ai/enhance-resume")
async def enhance_resume(
    request: ResumeEnhanceRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        # --- MODIFIED: Use Google Gemini ---
        suggestions = ""
        if gemini_model:
            system_prompt = "You are a professional resume enhancer. Provide specific, actionable improvements to make the resume more compelling for the target job."
            user_prompt = f"Enhance this resume for the job: {request.target_job}\n\nResume:\n{request.resume_text}"
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            generation_config = genai.types.GenerationConfig(max_output_tokens=500)
            
            try:
                response = await gemini_model.generate_content_async(
                    full_prompt,
                    generation_config=generation_config
                )
                suggestions = response.text
            except ValueError:
                suggestions = "The response was blocked due to safety settings. Please rephrase your request."
            except Exception as e:
                suggestions = f"Error generating suggestions: {str(e)}"
        else:
            # Mock suggestions when no API key
            suggestions = """
            (Mock Response) Here are some suggestions to enhance your resume:
            
            1. **Quantify Achievements**: Add specific numbers and metrics to demonstrate impact
            2. **Action Verbs**: Start bullet points with strong action verbs like 'Led', 'Implemented', 'Achieved'
            3. **Keywords**: Include relevant keywords from the job description
            """
        # --- End Modification ---
        
        # Save enhancement request
        enhancement_doc = {
            "original_text": request.resume_text,
            "target_job": request.target_job,
            "suggestions": suggestions,
            "user_email": current_user["email"],
            "created_at": datetime.utcnow()
        }
        
        await db.enhancements.insert_one(enhancement_doc)
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        return {"suggestions": f"Enhancement service temporarily unavailable. Error: {str(e)}"}

@app.post("/ai/interview-question")
async def generate_interview_question(
    request: InterviewQuestion,
    current_user: dict = Depends(get_current_user)
):
    try:
        # --- MODIFIED: Use Google Gemini ---
        question = ""
        if gemini_model:
            system_prompt = "You are an experienced interviewer. Generate thoughtful interview questions for specific job roles."
            user_prompt = f"Generate an interview question for a {request.job_role} position. Make it specific and relevant."
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            generation_config = genai.types.GenerationConfig(max_output_tokens=150)
            
            try:
                response = await gemini_model.generate_content_async(
                    full_prompt,
                    generation_config=generation_config
                )
                question = response.text
            except ValueError:
                question = "The response was blocked due to safety settings. Please rephrase your request."
            except Exception as e:
                question = f"Error generating question: {str(e)}"
        else:
            # Mock questions
            mock_questions = {
                "software engineer": "Can you walk me through how you would design a scalable web application architecture?",
                "data scientist": "How would you approach a machine learning problem with limited labeled data?",
                "product manager": "How do you prioritize features when you have limited development resources?",
                "default": "Tell me about a challenging project you worked on and how you overcame obstacles."
            }
            question = mock_questions.get(request.job_role.lower(), mock_questions["default"])
        # --- End Modification ---
        
        return {"question": question}
        
    except Exception as e:
        # Fallback question
        return {"question": "What motivated you to apply for this position, and what unique value would you bring to our team?"}

@app.post("/ai/chat")
async def chat_with_ai(
    message: ChatMessage,
    current_user: dict = Depends(get_current_user)
):
    try:
        system_prompt = """
        You are an AI assistant for an AI Resume Manager platform. You help users understand:
        - How the resume ranking system works (using Sentence-BERT similarity)
        - Best practices for resume writing
        - Interview preparation tips
        - Platform features and navigation
        
        Be helpful, professional, and concise in your responses.
        """
        
        # --- MODIFIED: Use Google Gemini ---
        reply = ""
        if gemini_model:
            # Context can be added here if needed, but for a simple chat, just combine
            full_prompt = f"{system_prompt}\n\nUser: {message.message}\nAssistant:"
            
            generation_config = genai.types.GenerationConfig(max_output_tokens=300)

            try:
                response = await gemini_model.generate_content_async(
                    full_prompt,
                    generation_config=generation_config
                )
                reply = response.text
            except ValueError:
                reply = "The response was blocked due to safety settings. Please rephrase your request."
            except Exception as e:
                reply = f"Error generating response: {str(e)}"
        else:
            # Mock responses for common questions
            mock_responses = {
                "how does ranking work": "Our system uses Sentence-BERT, an advanced AI model, to understand the semantic meaning of both job descriptions and resumes. It calculates similarity scores to rank candidates based on relevance.",
                "resume tips": "Focus on quantifiable achievements, use relevant keywords, tailor your resume for each job, and ensure clear formatting with consistent structure.",
                "interview": "Prepare by researching the company, practicing common questions, preparing specific examples using the STAR method, and asking thoughtful questions about the role.",
                "default": "I'm here to help you with resume management, interview preparation, and understanding our AI-powered ranking system. What specific question do you have?"
            }
            
            reply = mock_responses.get("default", mock_responses["default"])
            for key in mock_responses:
                if key in message.message.lower():
                    reply = mock_responses[key]
                    break
        # --- End Modification ---

        # Save chat interaction
        chat_doc = {
            "user_message": message.message,
            "ai_response": reply,
            "user_email": current_user["email"],
            "timestamp": datetime.utcnow()
        }
        
        await db.chats.insert_one(chat_doc)
        
        return {"response": reply}
        
    except Exception as e:
        return {"response": "I'm experiencing some technical difficulties. Please try again later or contact support."}

@app.get("/templates")
async def get_resume_templates():
    templates = [
        {
            "id": 1,
            "name": "Professional",
            "description": "Clean and modern design perfect for corporate roles",
            "preview": "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=300",
            "category": "Corporate"
        },
        {
            "id": 2,
            "name": "Creative",
            "description": "Eye-catching design for creative professionals",
            "preview": "https://images.pexels.com/photos/7688330/pexels-photo-7688330.jpeg?auto=compress&cs=tinysrgb&w=300",
            "category": "Creative"
        },
        {
            "id": 3,
            "name": "Technical",
            "description": "Focused layout highlighting technical skills",
            "preview": "https://images.pexels.com/photos/7688334/pexels-photo-7688334.jpeg?auto=compress&cs=tinysrgb&w=300",
            "category": "Technical"
        },
        {
            "id": 4,
            "name": "Executive",
            "description": "Sophisticated design for senior-level positions",
            "preview": "https://images.pexels.com/photos/7688338/pexels-photo-7688338.jpeg?auto=compress&cs=tinysrgb&w=300",
            "category": "Executive"
        }
    ]
    
    return {"templates": templates}

@app.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Get user stats
    total_resumes = await db.resumes.count_documents({"uploaded_by": current_user["email"]})
    total_jobs = await db.jobs.count_documents({"created_by": current_user["email"]})
    total_analyses = await db.analyses.count_documents({"analyzed_by": current_user["email"]})
    
    # Get recent activity
    recent_resumes = await db.resumes.find(
        {"uploaded_by": current_user["email"]},
        {"filename": 1, "uploaded_at": 1}
    ).sort("uploaded_at", -1).limit(5).to_list(5)
    
    # Convert ObjectId to string for JSON serialization
    for resume in recent_resumes:
        resume["_id"] = str(resume["_id"])
    
    return {
        "total_resumes": total_resumes,
        "total_jobs": total_jobs,
        "total_analyses": total_analyses,
        "recent_resumes": recent_resumes
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
