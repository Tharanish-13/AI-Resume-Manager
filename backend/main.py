from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from typing import List, Optional
import os
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
import io
from sentence_transformers import SentenceTransformer
import PyPDF2
from docx import Document
from sklearn.metrics.pairwise import cosine_similarity
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
import torch

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
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client.ai_resume_manager

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Initialize AI models
sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
MODEL_NAME = "google/flan-t5-small"
device = 0 if torch.cuda.is_available() else -1  # for pipeline, -1 = CPU

print("Loading model... (this may take a few minutes)")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, force_download=True)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME, force_download=True)

# Create a text-generation pipeline (used for all AI endpoints)
text_generator = pipeline(
    "text2text-generation",
    model=model,
    tokenizer=tokenizer,
    device=device
)
print("Model loaded successfully")

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"

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
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

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
        return "".join([page.extract_text() or "" for page in pdf_reader.pages])
    except Exception as e:
        return f"Error extracting PDF text: {str(e)}"

def extract_text_from_docx(file_content):
    try:
        doc = Document(io.BytesIO(file_content))
        return "\n".join([p.text for p in doc.paragraphs])
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
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    await db.users.insert_one({
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "is_active": True
    })
    access_token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"]
    }

@app.post("/resumes/upload")
async def upload_resumes(files: List[UploadFile] = File(...), current_user: dict = Depends(get_current_user)):
    uploaded_resumes = []
    for file in files:
        if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            continue
        content = await file.read()
        text = extract_text_from_pdf(content) if file.content_type == "application/pdf" else extract_text_from_docx(content)
        result = await db.resumes.insert_one({
            "filename": file.filename,
            "content_type": file.content_type,
            "text": text,
            "uploaded_by": current_user["email"],
            "uploaded_at": datetime.utcnow(),
            "size": len(content)
        })
        uploaded_resumes.append({"id": str(result.inserted_id), "filename": file.filename, "text_preview": text[:200]+"..." if len(text)>200 else text})
    return {"message": f"Uploaded {len(uploaded_resumes)} resumes", "resumes": uploaded_resumes}

@app.post("/jobs/analyze")
async def analyze_job(job: JobDescription, current_user: dict = Depends(get_current_user)):
    job_doc = {
        "title": job.title,
        "description": job.description,
        "requirements": job.requirements,
        "created_by": current_user["email"],
        "created_at": datetime.utcnow()
    }
    job_result = await db.jobs.insert_one(job_doc)
    resumes = await db.resumes.find({"uploaded_by": current_user["email"]}).to_list(None)
    job_text = f"{job.title} {job.description} {job.requirements}"
    ranked_resumes = []
    for resume in resumes:
        similarity_score = calculate_similarity(job_text, resume["text"])
        ranked_resumes.append({
            "id": str(resume["_id"]),
            "filename": resume["filename"],
            "similarity_score": similarity_score,
            "text_preview": resume["text"][:300]+"..." if len(resume["text"])>300 else resume["text"]
        })
    ranked_resumes.sort(key=lambda x: x["similarity_score"], reverse=True)
    await db.analyses.insert_one({
        "job_id": str(job_result.inserted_id),
        "ranked_resumes": ranked_resumes,
        "analyzed_by": current_user["email"],
        "analyzed_at": datetime.utcnow()
    })
    return {"job_id": str(job_result.inserted_id), "total_resumes": len(ranked_resumes), "ranked_resumes": ranked_resumes}

# AI Endpoints using local model
@app.post("/ai/enhance-resume")
async def enhance_resume(request: ResumeEnhanceRequest, current_user: dict = Depends(get_current_user)):
    prompt = f"Enhance this resume for a {request.target_job} position:\n{request.resume_text}"
    output = text_generator(prompt, max_length=500)[0]['generated_text']
    await db.enhancements.insert_one({
        "original_text": request.resume_text,
        "target_job": request.target_job,
        "suggestions": output,
        "user_email": current_user["email"],
        "created_at": datetime.utcnow()
    })
    return {"suggestions": output}

@app.post("/ai/interview-question")
async def generate_interview_question(request: InterviewQuestion):
    prompt = f"Generate one interview question for a {request.job_role} position."
    output = text_generator(prompt, max_length=150)[0]['generated_text']
    return {"question": output}

@app.post("/ai/chat")
async def chat_with_ai(message: ChatMessage, current_user: dict = Depends(get_current_user)):
    system_prompt = "You are an AI assistant for an AI Resume Manager platform. Be concise and helpful."
    full_prompt = f"{system_prompt}\nUser: {message.message}\nAssistant:"
    outputs = text_generator(full_prompt, max_length=300)[0]["generated_text"]
    reply = outputs.replace(full_prompt, "").strip()
    await db.chats.insert_one({
        "user_message": message.message,
        "ai_response": reply,
        "user_email": current_user["email"],
        "timestamp": datetime.utcnow()
    })
    return {"response": reply}

@app.get("/templates")
async def get_resume_templates():
    templates = [
        {"id": 1, "name": "Professional", "description": "Clean and modern design perfect for corporate roles",
         "preview": "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=300", "category": "Corporate"},
        {"id": 2, "name": "Creative", "description": "Eye-catching design for creative professionals",
         "preview": "https://images.pexels.com/photos/7688330/pexels-photo-7688330.jpeg?auto=compress&cs=tinysrgb&w=300", "category": "Creative"},
        {"id": 3, "name": "Technical", "description": "Focused layout highlighting technical skills",
         "preview": "https://images.pexels.com/photos/7688334/pexels-photo-7688334.jpeg?auto=compress&cs=tinysrgb&w=300", "category": "Technical"},
        {"id": 4, "name": "Executive", "description": "Sophisticated design for senior-level positions",
         "preview": "https://images.pexels.com/photos/7688338/pexels-photo-7688338.jpeg?auto=compress&cs=tinysrgb&w=300", "category": "Executive"}
    ]
    return {"templates": templates}

@app.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_resumes = await db.resumes.count_documents({"uploaded_by": current_user["email"]})
    total_jobs = await db.jobs.count_documents({"created_by": current_user["email"]})
    total_analyses = await db.analyses.count_documents({"analyzed_by": current_user["email"]})
    
    recent_resumes = await db.resumes.find(
        {"uploaded_by": current_user["email"]},
        {"filename": 1, "uploaded_at": 1}
    ).sort("uploaded_at", -1).limit(5).to_list(5)
    
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
