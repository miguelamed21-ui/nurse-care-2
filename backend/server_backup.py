from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, File, UploadFile
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
import json
import base64
import shutil
from export_utils import generate_evaluation_pdf, generate_evaluation_excel, generate_global_evaluation_pdf, generate_global_evaluation_excel

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Environment variables
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# MongoDB connection
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========== MODELS ==========

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str = "student"  # admin, teacher, student
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class SessionExchangeRequest(BaseModel):
    session_id: str

class ClinicalCase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    case_id: str
    title: str
    specialty: str
    difficulty: str
    scenario: str
    instructions: Optional[str] = None  # Briefing/instructions for student
    patient_profile: Dict[str, Any]
    learning_objectives: List[str]
    simulation_type: str = "individual"  # individual, equipo_interdisciplinario
    team_members: Optional[List[Dict[str, str]]] = None  # [{role, name, specialty, description}]
    created_by: str
    created_at: datetime

class CaseCreateRequest(BaseModel):
    title: str
    specialty: str
    difficulty: str
    scenario: str
    instructions: Optional[str] = None
    patient_profile: Dict[str, Any]
    learning_objectives: List[str]
    simulation_type: str = "individual"
    team_members: Optional[List[Dict[str, str]]] = None

class CaseUpdateRequest(BaseModel):
    title: Optional[str] = None
    specialty: Optional[str] = None
    difficulty: Optional[str] = None
    scenario: Optional[str] = None
    instructions: Optional[str] = None
    patient_profile: Optional[Dict[str, Any]] = None
    learning_objectives: Optional[List[str]] = None
    simulation_type: Optional[str] = None
    team_members: Optional[List[Dict[str, str]]] = None

class GenerateCaseRequest(BaseModel):
    specialty: str
    difficulty: str
    focus_area: Optional[str] = None

class Simulation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    sim_id: str
    user_id: str
    case_id: str
    conversation: List[Dict[str, str]]  # {role: student/participant_name, content: text}
    current_participant: Optional[str] = None  # For team simulations
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: str = "in_progress"  # in_progress, completed

class StartSimulationRequest(BaseModel):
    case_id: str

class ChatMessage(BaseModel):
    message: str
    target_participant: Optional[str] = None  # For team simulations: "paciente", "medico", "fisioterapeuta", etc.

class Evaluation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    eval_id: str
    sim_id: Optional[str] = None  # Opcional para evaluaciones globales
    user_id: str
    evaluation_type: str = "CASO"  # "CASO" o "GLOBAL"
    case_id: Optional[str] = None
    scores: Dict[str, Any]
    feedback: str
    strengths: List[str]
    improvements: List[str]
    evaluated_at: datetime
    evaluated_by: Optional[str] = None  # ID del docente evaluador
    period_info: Optional[Dict[str, Any]] = None  # Info de periodo para evaluaciones globales

class GlobalEvaluationRequest(BaseModel):
    user_id: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    include_cases: Optional[List[str]] = None
    rubric_id: Optional[str] = None

class CompetencyProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_id: str
    user_id: str
    competencies: Dict[str, float]
    idec_score: float
    simulations_count: int
    updated_at: datetime

class Rubric(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rubric_id: str
    name: str
    description: Optional[str] = None
    competency_weights: Dict[str, float]  # Pesos por competencia (deben sumar 100)
    competency_levels: Dict[str, Dict[str, Any]]  # Niveles de logro con descripciones
    created_by: str
    created_at: datetime
    is_default: bool = False

class RubricCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    competency_weights: Dict[str, float]
    competency_levels: Optional[Dict[str, Dict[str, Any]]] = None  # Opcional para retrocompatibilidad

class RubricUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    competency_weights: Optional[Dict[str, float]] = None
    competency_levels: Optional[Dict[str, Dict[str, Any]]] = None

# ========== NEW MODELS FOR RBAC & GROUPS ==========

class StudentGroup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    group_id: str
    name: str
    description: Optional[str] = None
    teacher_id: str  # Owner/creator of the group
    student_ids: List[str] = []  # Array of user_ids
    created_at: datetime
    updated_at: datetime

class GroupCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    student_ids: List[str] = []

class GroupUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    student_ids: Optional[List[str]] = None

class CaseAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    assignment_id: str
    case_id: Optional[str] = None  # None for random assignments (determined at simulation start)
    assigned_to: str  # user_id or group_id
    assignment_type: str  # "individual" | "group"
    assigned_by: str  # teacher_id
    assignment_mode: str  # "directed" | "random"
    random_filters: Optional[Dict[str, str]] = None  # {difficulty, specialty} for random mode
    status: str = "pending"  # "pending" | "in_progress" | "completed"
    assigned_at: datetime
    completed_at: Optional[datetime] = None

class AssignmentCreateRequest(BaseModel):
    case_id: Optional[str] = None  # Required for directed, None for random
    assigned_to: str  # user_id or group_id
    assignment_type: str  # "individual" | "group"
    assignment_mode: str  # "directed" | "random"
    random_filters: Optional[Dict[str, str]] = None  # For random mode

# ========== AUTH HELPERS ==========

async def get_current_user(request: Request) -> User:
    """Extract user from session_token (cookie or Authorization header)"""
    session_token = None
    
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Parse datetime if string
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# ========== AUTH ROUTES ==========

@api_router.post("/auth/session")
async def exchange_session(req: SessionExchangeRequest, response: Response):
    """Exchange session_id from Emergent Auth for user data and create session"""
    try:
        logger.info(f"Attempting to exchange session_id: {req.session_id[:20]}...")
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": req.session_id},
                timeout=10.0
            )
            logger.info(f"Emergent Auth response status: {resp.status_code}")
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"Successfully got user data for: {data.get('email')}")
        
        # Check if user exists
        existing_user = await db.users.find_one(
            {"email": data["email"]},
            {"_id": 0}
        )
        
        if existing_user:
            user_id = existing_user["user_id"]
            logger.info(f"Existing user found: {user_id}")
            # Update user info
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": data["name"],
                    "picture": data.get("picture")
                }}
            )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            logger.info(f"Creating new user: {user_id}")
            user_doc = {
                "user_id": user_id,
                "email": data["email"],
                "name": data["name"],
                "role": "student",  # Default role
                "picture": data.get("picture"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
        
        # Create session
        session_token = data["session_token"]
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session_doc)
        logger.info(f"Session created for user: {user_id}")
        
        # Set cookie (for backward compatibility)
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7*24*60*60
        )
        
        # Return user with session_token (for Authorization header usage)
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if isinstance(user_doc['created_at'], str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
        
        # Add session_token to response
        user_with_token = {**user_doc, "session_token": session_token}
        return user_with_token
    
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error from Emergent Auth: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=400, detail=f"Invalid session_id: {e.response.status_code}")
    except httpx.TimeoutException as e:
        logger.error(f"Timeout calling Emergent Auth: {e}")
        raise HTTPException(status_code=504, detail="Timeout connecting to auth service")
    except Exception as e:
        logger.error(f"Session exchange error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user from session"""
    user = await get_current_user(request)
    return user

@api_router.get("/users")
async def get_users(request: Request, role: Optional[str] = None):
    """Get list of users (Teacher/Admin only) - for group management"""
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can list users")
    
    query = {}
    if role:
        query["role"] = role
    
    # Teachers can only see students, admins can see everyone
    if user.role == "teacher" and not role:
        query["role"] = "student"
    
    users = await db.users.find(query, {"_id": 0}).to_list(1000)
    
    for user_doc in users:
        if isinstance(user_doc.get('created_at'), str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return users

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session"""
    try:
        session_token = request.cookies.get("session_token")
        if session_token:
            await db.user_sessions.delete_one({"session_token": session_token})
        
        response.delete_cookie("session_token", path="/")
        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return {"message": "Logged out"}

@api_router.post("/auth/upload-avatar")
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    """Upload user avatar/profile picture"""
    user = await get_current_user(request)
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")
    
    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    # Convert to base64 data URL
    base64_image = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_image}"
    
    # Update user's picture field
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"picture": data_url}}
    )
    
    return {"message": "Avatar uploaded successfully", "picture": data_url}

# ========== CASE ROUTES ==========

@api_router.get("/cases", response_model=List[ClinicalCase])
async def get_cases(request: Request):
    """Get all clinical cases"""
    await get_current_user(request)  # Verify auth
    
    cases = await db.clinical_cases.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for case in cases:
        if isinstance(case['created_at'], str):
            case['created_at'] = datetime.fromisoformat(case['created_at'])
    
    return cases

@api_router.post("/cases", response_model=ClinicalCase)
async def create_case(request: Request, case_req: CaseCreateRequest):
    """Create a new clinical case (teacher only)"""
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can create cases")
    
    case_id = f"case_{uuid.uuid4().hex[:12]}"
    case_doc = {
        "case_id": case_id,
        "title": case_req.title,
        "specialty": case_req.specialty,
        "difficulty": case_req.difficulty,
        "scenario": case_req.scenario,
        "patient_profile": case_req.patient_profile,
        "learning_objectives": case_req.learning_objectives,
        "simulation_type": case_req.simulation_type,
        "team_members": case_req.team_members,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.clinical_cases.insert_one(case_doc)
    
    case_doc['created_at'] = datetime.fromisoformat(case_doc['created_at'])
    return ClinicalCase(**case_doc)

@api_router.get("/cases/{case_id}", response_model=ClinicalCase)
async def get_case(request: Request, case_id: str):
    """Get a specific case"""
    await get_current_user(request)
    
    case_doc = await db.clinical_cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if isinstance(case_doc['created_at'], str):
        case_doc['created_at'] = datetime.fromisoformat(case_doc['created_at'])
    
    return ClinicalCase(**case_doc)

@api_router.put("/cases/{case_id}", response_model=ClinicalCase)
async def update_case(request: Request, case_id: str, case_req: CaseUpdateRequest):
    """Update a clinical case (teacher only)"""
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can update cases")
    
    # Check if case exists
    existing_case = await db.clinical_cases.find_one({"case_id": case_id}, {"_id": 0})
    if not existing_case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Build update document (only include fields that were provided)
    update_doc = {}
    if case_req.title is not None:
        update_doc["title"] = case_req.title
    if case_req.specialty is not None:
        update_doc["specialty"] = case_req.specialty
    if case_req.difficulty is not None:
        update_doc["difficulty"] = case_req.difficulty
    if case_req.scenario is not None:
        update_doc["scenario"] = case_req.scenario
    if case_req.instructions is not None:
        update_doc["instructions"] = case_req.instructions
    if case_req.patient_profile is not None:
        update_doc["patient_profile"] = case_req.patient_profile
    if case_req.learning_objectives is not None:
        update_doc["learning_objectives"] = case_req.learning_objectives
    if case_req.simulation_type is not None:
        update_doc["simulation_type"] = case_req.simulation_type
    if case_req.team_members is not None:
        update_doc["team_members"] = case_req.team_members
    
    # Update the case
    await db.clinical_cases.update_one(
        {"case_id": case_id},
        {"$set": update_doc}
    )
    
    # Return updated case
    updated_case = await db.clinical_cases.find_one({"case_id": case_id}, {"_id": 0})
    if isinstance(updated_case['created_at'], str):
        updated_case['created_at'] = datetime.fromisoformat(updated_case['created_at'])
    
    return ClinicalCase(**updated_case)

@api_router.delete("/cases/{case_id}")
async def delete_case(request: Request, case_id: str):
    """Delete a clinical case (teacher only)"""
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can delete cases")
    
    # Check if case exists
    case_doc = await db.clinical_cases.find_one({"case_id": case_id}, {"_id": 0})
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Delete the case
    await db.clinical_cases.delete_one({"case_id": case_id})
    
    return {"message": "Case deleted successfully", "case_id": case_id}

# ========== GROUP MANAGEMENT ROUTES ==========

@api_router.post("/groups", response_model=StudentGroup)
async def create_group(request: Request, group_req: GroupCreateRequest):
    """Create a new student group (Teacher/Admin only)"""
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can create groups")
    
    group_id = f"group_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    group_doc = {
        "group_id": group_id,
        "name": group_req.name,
        "description": group_req.description,
        "teacher_id": user.user_id,
        "student_ids": group_req.student_ids,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.student_groups.insert_one(group_doc)
    
    group_doc['created_at'] = now
    group_doc['updated_at'] = now
    return StudentGroup(**group_doc)

@api_router.get("/groups")
async def get_groups(request: Request):
    """Get all groups (filtered by role)"""
    user = await get_current_user(request)
    
    if user.role == "admin":
        # Admins see all groups
        groups = await db.student_groups.find({}, {"_id": 0}).to_list(1000)
    elif user.role == "teacher":
        # Teachers see only their groups
        groups = await db.student_groups.find({"teacher_id": user.user_id}, {"_id": 0}).to_list(1000)
    else:
        # Students see groups they belong to
        groups = await db.student_groups.find({"student_ids": user.user_id}, {"_id": 0}).to_list(1000)
    
    for group in groups:
        if isinstance(group['created_at'], str):
            group['created_at'] = datetime.fromisoformat(group['created_at'])
        if isinstance(group['updated_at'], str):
            group['updated_at'] = datetime.fromisoformat(group['updated_at'])
    
    return groups

@api_router.get("/groups/{group_id}", response_model=StudentGroup)
async def get_group(request: Request, group_id: str):
    """Get specific group details"""
    user = await get_current_user(request)
    
    group_doc = await db.student_groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group_doc:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check permissions
    if user.role == "student" and user.user_id not in group_doc["student_ids"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this group")
    elif user.role == "teacher" and group_doc["teacher_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this group")
    
    if isinstance(group_doc['created_at'], str):
        group_doc['created_at'] = datetime.fromisoformat(group_doc['created_at'])
    if isinstance(group_doc['updated_at'], str):
        group_doc['updated_at'] = datetime.fromisoformat(group_doc['updated_at'])
    
    return StudentGroup(**group_doc)

@api_router.put("/groups/{group_id}", response_model=StudentGroup)
async def update_group(request: Request, group_id: str, group_req: GroupUpdateRequest):
    """Update group details (Teacher/Admin only)"""
    user = await get_current_user(request)
    
    group_doc = await db.student_groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group_doc:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check permissions: only group owner or admin
    if user.role != "admin" and group_doc["teacher_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this group")
    
    update_data = {}
    if group_req.name is not None:
        update_data["name"] = group_req.name
    if group_req.description is not None:
        update_data["description"] = group_req.description
    if group_req.student_ids is not None:
        update_data["student_ids"] = group_req.student_ids
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.student_groups.update_one(
        {"group_id": group_id},
        {"$set": update_data}
    )
    
    updated_doc = await db.student_groups.find_one({"group_id": group_id}, {"_id": 0})
    if isinstance(updated_doc['created_at'], str):
        updated_doc['created_at'] = datetime.fromisoformat(updated_doc['created_at'])
    if isinstance(updated_doc['updated_at'], str):
        updated_doc['updated_at'] = datetime.fromisoformat(updated_doc['updated_at'])
    
    return StudentGroup(**updated_doc)

@api_router.delete("/groups/{group_id}")
async def delete_group(request: Request, group_id: str):
    """Delete a group (Teacher/Admin only)"""
    user = await get_current_user(request)
    
    group_doc = await db.student_groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group_doc:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check permissions
    if user.role != "admin" and group_doc["teacher_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this group")
    
    await db.student_groups.delete_one({"group_id": group_id})
    
    # Also delete related assignments
    await db.case_assignments.delete_many({"assigned_to": group_id, "assignment_type": "group"})
    
    return {"message": "Group deleted successfully", "group_id": group_id}

# ========== CASE ASSIGNMENT ROUTES ==========

@api_router.post("/assignments", response_model=CaseAssignment)
async def create_assignment(request: Request, assign_req: AssignmentCreateRequest):
    """Create a case assignment (Teacher/Admin only)"""
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can create assignments")
    
    # Validate assignment mode
    if assign_req.assignment_mode == "directed" and not assign_req.case_id:
        raise HTTPException(status_code=400, detail="case_id is required for directed assignments")
    
    if assign_req.assignment_mode == "random" and not assign_req.random_filters:
        raise HTTPException(status_code=400, detail="random_filters required for random assignments")
    
    # If directed, verify case exists
    if assign_req.assignment_mode == "directed":
        case_doc = await db.clinical_cases.find_one({"case_id": assign_req.case_id}, {"_id": 0})
        if not case_doc:
            raise HTTPException(status_code=404, detail="Case not found")
    
    # If assigning to group, verify group exists
    if assign_req.assignment_type == "group":
        group_doc = await db.student_groups.find_one({"group_id": assign_req.assigned_to}, {"_id": 0})
        if not group_doc:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Teacher must own the group (unless admin)
        if user.role != "admin" and group_doc["teacher_id"] != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to assign to this group")
    
    assignment_id = f"assign_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    assignment_doc = {
        "assignment_id": assignment_id,
        "case_id": assign_req.case_id,
        "assigned_to": assign_req.assigned_to,
        "assignment_type": assign_req.assignment_type,
        "assigned_by": user.user_id,
        "assignment_mode": assign_req.assignment_mode,
        "random_filters": assign_req.random_filters,
        "status": "pending",
        "assigned_at": now.isoformat(),
        "completed_at": None
    }
    
    await db.case_assignments.insert_one(assignment_doc)
    
    assignment_doc['assigned_at'] = now
    return CaseAssignment(**assignment_doc)

@api_router.get("/assignments")
async def get_assignments(request: Request):
    """Get assignments (filtered by role and user)"""
    user = await get_current_user(request)
    
    if user.role == "admin":
        # Admins see all assignments
        assignments = await db.case_assignments.find({}, {"_id": 0}).to_list(1000)
    elif user.role == "teacher":
        # Teachers see assignments they created
        assignments = await db.case_assignments.find({"assigned_by": user.user_id}, {"_id": 0}).to_list(1000)
    else:
        # Students see only their individual assignments + group assignments
        # Get user's groups
        user_groups = await db.student_groups.find({"student_ids": user.user_id}, {"_id": 0}).to_list(1000)
        group_ids = [g["group_id"] for g in user_groups]
        
        # Find assignments (individual OR group)
        assignments = await db.case_assignments.find({
            "$or": [
                {"assigned_to": user.user_id, "assignment_type": "individual"},
                {"assigned_to": {"$in": group_ids}, "assignment_type": "group"}
            ]
        }, {"_id": 0}).to_list(1000)
    
    for assignment in assignments:
        if isinstance(assignment['assigned_at'], str):
            assignment['assigned_at'] = datetime.fromisoformat(assignment['assigned_at'])
        if assignment.get('completed_at') and isinstance(assignment['completed_at'], str):
            assignment['completed_at'] = datetime.fromisoformat(assignment['completed_at'])
    
    return assignments

@api_router.delete("/assignments/{assignment_id}")
async def delete_assignment(request: Request, assignment_id: str):
    """Delete an assignment (Teacher/Admin only)"""
    user = await get_current_user(request)
    
    assignment_doc = await db.case_assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not assignment_doc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check permissions
    if user.role != "admin" and assignment_doc["assigned_by"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this assignment")
    
    await db.case_assignments.delete_one({"assignment_id": assignment_id})
    
    return {"message": "Assignment deleted successfully", "assignment_id": assignment_id}

@api_router.get("/assignments/my-cases")
async def get_my_assigned_cases(request: Request):
    """Get cases assigned to current student (Student only)"""
    user = await get_current_user(request)
    
    if user.role != "student":
        raise HTTPException(status_code=403, detail="This endpoint is for students only")
    
    # Get user's groups
    user_groups = await db.student_groups.find({"student_ids": user.user_id}, {"_id": 0}).to_list(1000)
    group_ids = [g["group_id"] for g in user_groups]
    
    # Find pending assignments
    assignments = await db.case_assignments.find({
        "$or": [
            {"assigned_to": user.user_id, "assignment_type": "individual"},
            {"assigned_to": {"$in": group_ids}, "assignment_type": "group"}
        ],
        "status": "pending"
    }, {"_id": 0}).to_list(1000)
    
    # Get case details for each assignment
    assigned_cases = []
    for assignment in assignments:
        if assignment["assignment_mode"] == "directed":
            case_doc = await db.clinical_cases.find_one({"case_id": assignment["case_id"]}, {"_id": 0})
            if case_doc:
                assigned_cases.append({
                    "assignment": assignment,
                    "case": case_doc
                })
        else:
            # For random assignments, case will be determined at simulation start
            assigned_cases.append({
                "assignment": assignment,
                "case": None,
                "random_filters": assignment.get("random_filters")
            })
    
    return assigned_cases

@api_router.post("/cases/generate")
async def generate_case(request: Request, gen_req: GenerateCaseRequest):
    """Generate a clinical case using AI"""
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can generate cases")
    
    try:
        # Use Claude to generate a case
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"casegen_{uuid.uuid4().hex[:8]}",
            system_message=f"""Eres un experto en educación de enfermería. 
Genera un caso clínico realista en español para la especialidad: {gen_req.specialty}, 
nivel de dificultad: {gen_req.difficulty}.
{f'Enfocado en: {gen_req.focus_area}' if gen_req.focus_area else ''}

Devuelve un JSON con esta estructura:
{{
  "title": "Título del caso",
  "scenario": "Descripción detallada del escenario clínico",
  "patient_profile": {{
    "name": "Nombre del paciente",
    "age": edad,
    "gender": "género",
    "chief_complaint": "Motivo de consulta",
    "vital_signs": {{"hr": 80, "bp": "120/80", "temp": 36.5, "rr": 16, "spo2": 98}},
    "medical_history": ["antecedente 1", "antecedente 2"]
  }},
  "learning_objectives": ["objetivo 1", "objetivo 2", "objetivo 3"]
}}"""
        ).with_model("anthropic", "claude-sonnet-4-6")
        
        response = await chat.send_message(UserMessage(text="Genera el caso clínico"))
        
        # Parse JSON from response
        import re
        json_match = re.search(r'\{[\s\S]*\}', response.content)
        if not json_match:
            raise HTTPException(status_code=500, detail="Failed to generate case")
        
        case_data = json.loads(json_match.group())
        
        # Create case
        case_id = f"case_{uuid.uuid4().hex[:12]}"
        case_doc = {
            "case_id": case_id,
            "title": case_data["title"],
            "specialty": gen_req.specialty,
            "difficulty": gen_req.difficulty,
            "scenario": case_data["scenario"],
            "patient_profile": case_data["patient_profile"],
            "learning_objectives": case_data.get("learning_objectives", []),
            "created_by": user.user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.clinical_cases.insert_one(case_doc)
        
        case_doc['created_at'] = datetime.fromisoformat(case_doc['created_at'])
        return ClinicalCase(**case_doc)
    
    except Exception as e:
        logger.error(f"Case generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate case: {str(e)}")

# ========== SIMULATION ROUTES ==========

@api_router.post("/simulations/start", response_model=Simulation)
async def start_simulation(request: Request, start_req: StartSimulationRequest):
    """Start a new simulation"""
    user = await get_current_user(request)
    
    # RBAC: If user is student, verify they have this case assigned
    if user.role == "student":
        # Get user's groups
        user_groups = await db.student_groups.find({"student_ids": user.user_id}, {"_id": 0}).to_list(1000)
        group_ids = [g["group_id"] for g in user_groups]
        
        # Build assignment query: must match user/group AND (directed case OR random mode)
        assignment_query = {
            "$or": [
                {"assigned_to": user.user_id, "assignment_type": "individual"},
                {"assigned_to": {"$in": group_ids}, "assignment_type": "group"}
            ]
        }
        
        # First, try to find a directed assignment for this specific case
        directed_assignment = await db.case_assignments.find_one({
            **assignment_query,
            "case_id": start_req.case_id,
            "assignment_mode": "directed"
        }, {"_id": 0})
        
        if directed_assignment:
            assignment = directed_assignment
        else:
            # If no directed assignment, check for a pending random assignment
            # that matches the case's difficulty/specialty
            case_doc = await db.clinical_cases.find_one({"case_id": start_req.case_id}, {"_id": 0})
            if not case_doc:
                raise HTTPException(status_code=404, detail="Case not found")
            
            random_assignment = await db.case_assignments.find_one({
                **assignment_query,
                "assignment_mode": "random",
                "status": "pending",
                "random_filters.difficulty": case_doc.get("difficulty"),
                "random_filters.specialty": case_doc.get("specialty")
            }, {"_id": 0})
            
            if random_assignment:
                assignment = random_assignment
            else:
                assignment = None
        
        if not assignment:
            raise HTTPException(status_code=403, detail="You don't have access to this case. Contact your teacher.")
        
        # If assignment is random, select a case based on filters
        actual_case_id = start_req.case_id
        if assignment["assignment_mode"] == "random":
            filters = assignment.get("random_filters", {})
            query = {}
            if filters.get("difficulty"):
                query["difficulty"] = filters["difficulty"]
            if filters.get("specialty"):
                query["specialty"] = filters["specialty"]
            
            # Get random case matching filters
            matching_cases = await db.clinical_cases.find(query, {"_id": 0}).to_list(1000)
            if not matching_cases:
                raise HTTPException(status_code=404, detail="No cases found matching the assignment criteria")
            
            import random
            random_case = random.choice(matching_cases)
            actual_case_id = random_case["case_id"]
            
            # Update assignment with selected case
            await db.case_assignments.update_one(
                {"assignment_id": assignment["assignment_id"]},
                {"$set": {"case_id": actual_case_id}}
            )
        
        # Mark assignment as in_progress
        await db.case_assignments.update_one(
            {"assignment_id": assignment["assignment_id"]},
            {"$set": {"status": "in_progress"}}
        )
        
        # Use actual_case_id (either from directed or random selection)
        start_req.case_id = actual_case_id
    
    # Get case
    case_doc = await db.clinical_cases.find_one({"case_id": start_req.case_id}, {"_id": 0})
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Create simulation
    sim_id = f"sim_{uuid.uuid4().hex[:12]}"
    sim_doc = {
        "sim_id": sim_id,
        "user_id": user.user_id,
        "case_id": start_req.case_id,
        "conversation": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "ended_at": None,
        "status": "in_progress"
    }
    
    await db.simulations.insert_one(sim_doc)
    
    sim_doc['started_at'] = datetime.fromisoformat(sim_doc['started_at'])
    return Simulation(**sim_doc)

@api_router.post("/simulations/{sim_id}/chat")
async def chat_simulation(request: Request, sim_id: str, msg: ChatMessage):
    """Stream chat response from AI participant (SSE) - supports team simulations"""
    user = await get_current_user(request)
    
    # Get simulation
    sim_doc = await db.simulations.find_one({"sim_id": sim_id}, {"_id": 0})
    if not sim_doc:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    if sim_doc["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not your simulation")
    
    # Get case
    case_doc = await db.clinical_cases.find_one({"case_id": sim_doc["case_id"]}, {"_id": 0})
    
    # Build conversation history
    conversation = sim_doc.get("conversation", [])
    
    # Determine which participant to interact with
    simulation_type = case_doc.get("simulation_type", "individual")
    
    if simulation_type == "equipo_interdisciplinario":
        # Team simulation - determine participant
        team_members = case_doc.get("team_members", [])
        
        if not msg.target_participant:
            # If no participant specified, default to first team member
            if not team_members:
                raise HTTPException(status_code=400, detail="Team simulation has no team members defined")
            target_participant = team_members[0]["role"]
        else:
            target_participant = msg.target_participant
        
        # Find team member info
        participant_info = next((m for m in team_members if m["role"] == target_participant), None)
        
        if not participant_info:
            available_roles = [m["role"] for m in team_members]
            raise HTTPException(
                status_code=400, 
                detail=f"Participant '{target_participant}' not found in team. Available roles: {', '.join(available_roles)}"
            )
        
        participant_name = participant_info["name"]
        participant_specialty = participant_info.get("specialty", "")
        participant_description = participant_info.get("description", "")
        
        patient_context = json.dumps(case_doc["patient_profile"], ensure_ascii=False, indent=2)
        
        system_prompt = f"""Eres {participant_name}, {participant_specialty} en una simulación de equipo interdisciplinario.

Escenario: {case_doc['scenario']}

Contexto del paciente:
{patient_context}

Tu rol específico: {participant_description}

Instrucciones:
- Responde SOLO como {participant_name}, en primera persona
- Mantén tu rol profesional y conocimiento específico de tu área
- Colabora con el estudiante de enfermería desde tu perspectiva profesional
- Comparte información relevante de tu especialidad
- Sé realista con tu ámbito de competencia
- Muestra profesionalismo y trabajo en equipo
- Si te preguntan algo fuera de tu área, sugiere consultar con otro miembro del equipo
- Usa lenguaje técnico apropiado pero comprensible"""
        
        role_identifier = target_participant
        
    else:
        # Individual simulation - patient only
        participant_name = case_doc["patient_profile"]["name"]
        patient_context = json.dumps(case_doc["patient_profile"], ensure_ascii=False, indent=2)
        
        system_prompt = f"""Eres {participant_name}, un paciente virtual en una simulación clínica de enfermería.

Escenario: {case_doc['scenario']}

Tu perfil:
{patient_context}

Instrucciones:
- Responde SOLO como el paciente, en primera persona
- Revela información gradualmente según las preguntas del estudiante
- Sé realista con síntomas y emociones
- No des diagnósticos, solo describe cómo te sientes
- Usa lenguaje natural, como hablaría un paciente real
- Si el estudiante pregunta algo que no sabes, di que no lo sabes
- Mantén coherencia con tu perfil médico"""
        
        role_identifier = "paciente"
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"{sim_id}_{role_identifier}",
        system_message=system_prompt
    ).with_model("anthropic", "claude-sonnet-4-6")
    
    # Add conversation history for this specific participant
    for turn in conversation:
        if turn["role"] == "student":
            chat.messages.append({"role": "user", "content": turn["content"]})
        elif turn["role"] == role_identifier:
            chat.messages.append({"role": "assistant", "content": turn["content"]})
    
    async def event_generator():
        full_response = ""
        try:
            async for event in chat.stream_message(UserMessage(text=msg.message)):
                if isinstance(event, TextDelta):
                    full_response += event.content
                    yield f"data: {json.dumps({'content': event.content, 'participant': role_identifier})}\n\n"
                elif isinstance(event, StreamDone):
                    # Save conversation
                    conversation.append({"role": "student", "content": msg.message, "target": role_identifier})
                    conversation.append({"role": role_identifier, "content": full_response})
                    
                    await db.simulations.update_one(
                        {"sim_id": sim_id},
                        {"$set": {
                            "conversation": conversation,
                            "current_participant": role_identifier
                        }}
                    )
                    
                    yield f"data: {json.dumps({'done': True, 'participant': role_identifier})}\n\n"
                    break
        except Exception as e:
            logger.error(f"Chat error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )

@api_router.post("/simulations/{sim_id}/end")
async def end_simulation(request: Request, sim_id: str):
    """End a simulation"""
    user = await get_current_user(request)
    
    sim_doc = await db.simulations.find_one({"sim_id": sim_id}, {"_id": 0})
    if not sim_doc:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    if sim_doc["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not your simulation")
    
    await db.simulations.update_one(
        {"sim_id": sim_id},
        {"$set": {
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        }}
    )
    
    return {"message": "Simulation ended", "sim_id": sim_id}

@api_router.get("/simulations", response_model=List[Simulation])
async def get_simulations(request: Request):
    """Get user's simulation history"""
    user = await get_current_user(request)
    
    sims = await db.simulations.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("started_at", -1).to_list(100)
    
    for sim in sims:
        if isinstance(sim['started_at'], str):
            sim['started_at'] = datetime.fromisoformat(sim['started_at'])
        if sim.get('ended_at') and isinstance(sim['ended_at'], str):
            sim['ended_at'] = datetime.fromisoformat(sim['ended_at'])
    
    return sims

@api_router.get("/simulations/{sim_id}", response_model=Simulation)
async def get_simulation(request: Request, sim_id: str):
    """Get a specific simulation"""
    user = await get_current_user(request)
    
    sim_doc = await db.simulations.find_one({"sim_id": sim_id}, {"_id": 0})
    if not sim_doc:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    if sim_doc["user_id"] != user.user_id and user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if isinstance(sim_doc['started_at'], str):
        sim_doc['started_at'] = datetime.fromisoformat(sim_doc['started_at'])
    if sim_doc.get('ended_at') and isinstance(sim_doc['ended_at'], str):
        sim_doc['ended_at'] = datetime.fromisoformat(sim_doc['ended_at'])
    
    return Simulation(**sim_doc)

# ========== EVALUATION ROUTES ==========

@api_router.post("/evaluations/generate")
async def generate_evaluation(request: Request, sim_id: str):
    """Generate evaluation and feedback for a simulation"""
    user = await get_current_user(request)
    
    # Get simulation
    sim_doc = await db.simulations.find_one({"sim_id": sim_id}, {"_id": 0})
    if not sim_doc:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    if sim_doc["user_id"] != user.user_id and user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if already evaluated
    existing_eval = await db.evaluations.find_one({"sim_id": sim_id}, {"_id": 0})
    if existing_eval:
        if isinstance(existing_eval['evaluated_at'], str):
            existing_eval['evaluated_at'] = datetime.fromisoformat(existing_eval['evaluated_at'])
        return Evaluation(**existing_eval)
    
    # Get case
    case_doc = await db.clinical_cases.find_one({"case_id": sim_doc["case_id"]}, {"_id": 0})
    
    # Generate evaluation using AI
    try:
        conversation_text = "\n".join([
            f"{turn['role'].upper()}: {turn['content']}"
            for turn in sim_doc.get("conversation", [])
        ])
        
        eval_prompt = f"""Evalúa el desempeño del estudiante de enfermería en esta simulación clínica.

Caso: {case_doc['title']}
Escenario: {case_doc['scenario']}
Objetivos de aprendizaje: {', '.join(case_doc['learning_objectives'])}

Conversación:
{conversation_text}

Genera una evaluación en formato JSON con:
{{
  "scores": {{
    "comunicacion": 0-100,
    "valoracion_clinica": 0-100,
    "razonamiento_critico": 0-100,
    "competencia_tecnica": 0-100,
    "empatia": 0-100
  }},
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "improvements": ["área de mejora 1", "área de mejora 2"],
  "feedback": "Retroalimentación detallada y constructiva"
}}"""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"eval_{uuid.uuid4().hex[:8]}",
            system_message="Eres un docente experto en enfermería que evalúa de forma justa y constructiva."
        ).with_model("anthropic", "claude-sonnet-4-6")
        
        response = await chat.send_message(UserMessage(text=eval_prompt))
        
        # Parse JSON - response is the text content directly
        import re
        response_text = response if isinstance(response, str) else response.content
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if not json_match:
            raise HTTPException(status_code=500, detail="Failed to generate evaluation")
        
        eval_data = json.loads(json_match.group())
        
        # Create evaluation
        eval_id = f"eval_{uuid.uuid4().hex[:12]}"
        eval_doc = {
            "eval_id": eval_id,
            "sim_id": sim_id,
            "user_id": sim_doc["user_id"],
            "scores": eval_data["scores"],
            "feedback": eval_data["feedback"],
            "strengths": eval_data["strengths"],
            "improvements": eval_data["improvements"],
            "evaluated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.evaluations.insert_one(eval_doc)
        
        # Update competency profile
        await update_competency_profile(sim_doc["user_id"], eval_data["scores"])
        
        eval_doc['evaluated_at'] = datetime.fromisoformat(eval_doc['evaluated_at'])
        return Evaluation(**eval_doc)
    
    except Exception as e:
        logger.error(f"Evaluation generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate evaluation: {str(e)}")

@api_router.get("/evaluations/{sim_id}", response_model=Evaluation)
async def get_evaluation(request: Request, sim_id: str):
    """Get evaluation for a simulation"""
    user = await get_current_user(request)
    
    eval_doc = await db.evaluations.find_one({"sim_id": sim_id}, {"_id": 0})
    if not eval_doc:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    if eval_doc["user_id"] != user.user_id and user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if isinstance(eval_doc['evaluated_at'], str):
        eval_doc['evaluated_at'] = datetime.fromisoformat(eval_doc['evaluated_at'])
    
    return Evaluation(**eval_doc)

class ManualEvaluationRequest(BaseModel):
    sim_id: str
    scores: Dict[str, float]
    feedback: str
    strengths: List[str]
    improvements: List[str]

@api_router.post("/evaluations/manual", response_model=Evaluation)
async def create_manual_evaluation(request: Request, eval_req: ManualEvaluationRequest):
    """Create a manual case-specific evaluation from rubric form"""
    user = await get_current_user(request)
    
    # Only teachers and admins can create manual evaluations
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can create manual evaluations")
    
    # Verify simulation exists
    sim_doc = await db.simulations.find_one({"sim_id": eval_req.sim_id}, {"_id": 0})
    if not sim_doc:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    # Derive user_id and case_id from simulation (security: don't trust client)
    student_user_id = sim_doc["user_id"]
    case_id = sim_doc["case_id"]
    
    # Check if evaluation already exists
    existing_eval = await db.evaluations.find_one({"sim_id": eval_req.sim_id}, {"_id": 0})
    if existing_eval:
        raise HTTPException(status_code=400, detail="Evaluation already exists for this simulation")
    
    # Validate scores contain exactly the expected competencies
    expected_competencies = {"comunicacion", "valoracion_clinica", "razonamiento_critico", "competencia_tecnica", "empatia"}
    valid_cuartil_values = {12.5, 37.5, 62.5, 87.5}
    
    if set(eval_req.scores.keys()) != expected_competencies:
        raise HTTPException(
            status_code=400, 
            detail=f"Scores must contain exactly these competencies: {', '.join(expected_competencies)}"
        )
    
    for comp, score in eval_req.scores.items():
        if score not in valid_cuartil_values:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid score for {comp}: {score}. Must be one of {valid_cuartil_values}"
            )
    
    # Create evaluation document
    eval_id = f"eval_{uuid.uuid4().hex[:12]}"
    eval_doc = {
        "eval_id": eval_id,
        "sim_id": eval_req.sim_id,
        "user_id": student_user_id,  # From simulation, not from request
        "case_id": case_id,  # From simulation, not from request
        "evaluation_type": "CASO",
        "scores": eval_req.scores,
        "feedback": eval_req.feedback,
        "strengths": eval_req.strengths,
        "improvements": eval_req.improvements,
        "evaluated_by": user.user_id,  # From authenticated user, not from request
        "evaluated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.evaluations.insert_one(eval_doc)
    
    # Update competency profile
    await update_competency_profile(student_user_id, eval_req.scores)
    
    eval_doc['evaluated_at'] = datetime.fromisoformat(eval_doc['evaluated_at'])
    return Evaluation(**eval_doc)

@api_router.get("/evaluations/user/{user_id}/count")
async def get_user_evaluations_count(request: Request, user_id: str):
    """Get count of case evaluations for a user"""
    user = await get_current_user(request)
    
    # Only teachers and admins can check other users' evaluations
    if user.role not in ["teacher", "admin"] and user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Count case-specific evaluations
    case_evaluations_count = await db.evaluations.count_documents({
        "user_id": user_id,
        "evaluation_type": "CASO"
    })
    
    # Count global evaluations
    global_evaluations_count = await db.evaluations.count_documents({
        "user_id": user_id,
        "evaluation_type": "GLOBAL"
    })
    
    return {
        "user_id": user_id,
        "case_evaluations_count": case_evaluations_count,
        "global_evaluations_count": global_evaluations_count,
        "total_evaluations": case_evaluations_count + global_evaluations_count
    }

@api_router.get("/evaluations/{eval_id}/export")
async def export_evaluation(request: Request, eval_id: str, format: str = "pdf"):
    """Export case evaluation as PDF or Excel"""
    user = await get_current_user(request)
    
    # Get evaluation
    eval_doc = await db.evaluations.find_one({"eval_id": eval_id}, {"_id": 0})
    if not eval_doc:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    # Check permissions
    if eval_doc["user_id"] != user.user_id and user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get related data
    case_doc = await db.clinical_cases.find_one({"case_id": eval_doc.get("case_id", "")}, {"_id": 0})
    if not case_doc:
        case_doc = {"title": "Caso no encontrado", "specialty": "N/A", "difficulty": "N/A"}
    
    user_doc = await db.users.find_one({"user_id": eval_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        user_doc = {"name": "Usuario no encontrado", "email": "N/A"}
    
    # Generate file
    try:
        if format.lower() == "pdf":
            buffer = generate_evaluation_pdf(eval_doc, case_doc, user_doc)
            media_type = "application/pdf"
            filename = f"evaluacion_{eval_id[:8]}.pdf"
        elif format.lower() == "excel":
            buffer = generate_evaluation_excel(eval_doc, case_doc, user_doc)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"evaluacion_{eval_id[:8]}.xlsx"
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Use 'pdf' or 'excel'")
        
        return StreamingResponse(
            buffer,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate export: {str(e)}")

@api_router.get("/evaluations/global/{eval_id}/export")
async def export_global_evaluation(request: Request, eval_id: str, format: str = "pdf"):
    """Export global evaluation as PDF or Excel"""
    user = await get_current_user(request)
    
    # Get global evaluation
    eval_doc = await db.evaluations.find_one({"eval_id": eval_id, "evaluation_type": "GLOBAL"}, {"_id": 0})
    if not eval_doc:
        raise HTTPException(status_code=404, detail="Global evaluation not found")
    
    # Check permissions
    if eval_doc["user_id"] != user.user_id and user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get user data
    user_doc = await db.users.find_one({"user_id": eval_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        user_doc = {"name": "Usuario no encontrado", "email": "N/A"}
    
    # Get all case evaluations for this user (to list cases included)
    case_evals = await db.evaluations.find({
        "user_id": eval_doc["user_id"],
        "evaluation_type": "CASO"
    }, {"_id": 0}).to_list(100)
    
    # Get simulation data for each case evaluation
    simulations_data = []
    for case_eval in case_evals:
        sim_doc = await db.simulations.find_one({"sim_id": case_eval.get("sim_id")}, {"_id": 0})
        if sim_doc:
            case_doc = await db.clinical_cases.find_one({"case_id": sim_doc.get("case_id")}, {"_id": 0})
            simulations_data.append({
                "case_title": case_doc.get("title", "N/A") if case_doc else "N/A",
                "started_at": sim_doc.get("started_at"),
                "status": sim_doc.get("status", "N/A")
            })
    
    # Prepare period info
    if case_evals:
        dates = [datetime.fromisoformat(e.get("evaluated_at", "").replace('Z', '+00:00')) for e in case_evals if e.get("evaluated_at")]
        if dates:
            eval_doc["period_info"] = {
                "start_date": min(dates).strftime('%d/%m/%Y') if dates else 'N/A',
                "end_date": max(dates).strftime('%d/%m/%Y') if dates else 'N/A',
                "simulations_count": len(case_evals)
            }
    
    # Generate file
    try:
        if format.lower() == "pdf":
            buffer = generate_global_evaluation_pdf(eval_doc, user_doc, simulations_data)
            media_type = "application/pdf"
            filename = f"evaluacion_global_{eval_id[:8]}.pdf"
        elif format.lower() == "excel":
            buffer = generate_global_evaluation_excel(eval_doc, user_doc, simulations_data)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"evaluacion_global_{eval_id[:8]}.xlsx"
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Use 'pdf' or 'excel'")
        
        return StreamingResponse(
            buffer,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate export: {str(e)}")

# ========== DASHBOARD ROUTES ==========

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    """Get dashboard statistics"""
    user = await get_current_user(request)
    
    if user.role == "admin":
        # Admin sees all stats
        total_students = await db.users.count_documents({"role": "student"})
        total_simulations = await db.simulations.count_documents({})
        completed_simulations = await db.simulations.count_documents({"status": "completed"})
    elif user.role == "teacher":
        # Teacher sees their students
        total_students = await db.users.count_documents({"role": "student"})
        total_simulations = await db.simulations.count_documents({})
        completed_simulations = await db.simulations.count_documents({"status": "completed"})
    else:
        # Student sees own stats
        total_students = 1
        total_simulations = await db.simulations.count_documents({"user_id": user.user_id})
        completed_simulations = await db.simulations.count_documents({"user_id": user.user_id, "status": "completed"})
    
    total_cases = await db.clinical_cases.count_documents({})
    
    return {
        "total_students": total_students,
        "total_simulations": total_simulations,
        "completed_simulations": completed_simulations,
        "total_cases": total_cases
    }

@api_router.get("/dashboard/competencies")
async def get_competencies(request: Request):
    """Get user's competency profile"""
    user = await get_current_user(request)
    
    profile_doc = await db.competency_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not profile_doc:
        # Create default profile
        profile_id = f"prof_{uuid.uuid4().hex[:12]}"
        profile_doc = {
            "profile_id": profile_id,
            "user_id": user.user_id,
            "competencies": {
                "comunicacion": 0,
                "valoracion_clinica": 0,
                "razonamiento_critico": 0,
                "competencia_tecnica": 0,
                "empatia": 0
            },
            "idec_score": 0,
            "simulations_count": 0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.competency_profiles.insert_one(profile_doc)
    
    if isinstance(profile_doc['updated_at'], str):
        profile_doc['updated_at'] = datetime.fromisoformat(profile_doc['updated_at'])
    
    return CompetencyProfile(**profile_doc)

@api_router.get("/dashboard/trends")
async def get_trends(request: Request):
    """Get competency trends over time"""
    user = await get_current_user(request)
    
    # Get recent evaluations
    pipeline = [
        {"$match": {"user_id": user.user_id}},
        {"$sort": {"evaluated_at": -1}},
        {"$limit": 10},
        {"$project": {"_id": 0, "scores": 1, "evaluated_at": 1}}
    ]
    
    evaluations = await db.evaluations.aggregate(pipeline).to_list(10)
    
    # Format for chart
    trends = []
    for i, eval_doc in enumerate(reversed(evaluations)):
        trends.append({
            "index": i + 1,
            **eval_doc["scores"]
        })
    
    return {"trends": trends}

# ========== RUBRICS ENDPOINTS ==========

@api_router.get("/rubrics")
async def get_rubrics(request: Request):
    """Get all rubrics (teachers see all, students see only defaults)"""
    user = await get_current_user(request)
    
    if user.role in ["teacher", "admin"]:
        # Teachers see all rubrics
        rubrics = await db.rubrics.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    else:
        # Students only see default rubrics
        rubrics = await db.rubrics.find({"is_default": True}, {"_id": 0}).to_list(100)
    
    for rubric in rubrics:
        if isinstance(rubric['created_at'], str):
            rubric['created_at'] = datetime.fromisoformat(rubric['created_at'])
    
    return rubrics

@api_router.post("/rubrics", response_model=Rubric)
async def create_rubric(request: Request, rubric_req: RubricCreateRequest):
    """Create a new rubric (teacher only)"""
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can create rubrics")
    
    # Validate weights sum to 100
    total_weight = sum(rubric_req.competency_weights.values())
    if not (99.9 <= total_weight <= 100.1):  # Allow small floating point errors
        raise HTTPException(status_code=400, detail=f"Competency weights must sum to 100 (current: {total_weight})")
    
    rubric_id = f"rubric_{uuid.uuid4().hex[:12]}"
    rubric_doc = {
        "rubric_id": rubric_id,
        "name": rubric_req.name,
        "description": rubric_req.description,
        "competency_weights": rubric_req.competency_weights,
        "competency_levels": rubric_req.competency_levels or {},
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_default": False
    }
    
    await db.rubrics.insert_one(rubric_doc)
    
    rubric_doc['created_at'] = datetime.fromisoformat(rubric_doc['created_at'])
    return Rubric(**rubric_doc)

@api_router.get("/rubrics/{rubric_id}", response_model=Rubric)
async def get_rubric(request: Request, rubric_id: str):
    """Get a specific rubric"""
    await get_current_user(request)
    
    rubric_doc = await db.rubrics.find_one({"rubric_id": rubric_id}, {"_id": 0})
    if not rubric_doc:
        raise HTTPException(status_code=404, detail="Rubric not found")
    
    if isinstance(rubric_doc['created_at'], str):
        rubric_doc['created_at'] = datetime.fromisoformat(rubric_doc['created_at'])
    
    return Rubric(**rubric_doc)

@api_router.put("/rubrics/{rubric_id}", response_model=Rubric)
async def update_rubric(request: Request, rubric_id: str, rubric_req: RubricUpdateRequest):
    """Update a rubric (teacher only)"""
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can update rubrics")
    
    # Check if rubric exists
    existing_rubric = await db.rubrics.find_one({"rubric_id": rubric_id}, {"_id": 0})
    if not existing_rubric:
        raise HTTPException(status_code=404, detail="Rubric not found")
    
    # Build update document
    update_doc = {}
    if rubric_req.name is not None:
        update_doc["name"] = rubric_req.name
    if rubric_req.description is not None:
        update_doc["description"] = rubric_req.description
    if rubric_req.competency_weights is not None:
        # Validate weights
        total_weight = sum(rubric_req.competency_weights.values())
        if not (99.9 <= total_weight <= 100.1):
            raise HTTPException(status_code=400, detail=f"Competency weights must sum to 100 (current: {total_weight})")
        update_doc["competency_weights"] = rubric_req.competency_weights
    if rubric_req.competency_levels is not None:
        update_doc["competency_levels"] = rubric_req.competency_levels
    
    # Update the rubric
    await db.rubrics.update_one(
        {"rubric_id": rubric_id},
        {"$set": update_doc}
    )
    
    # Return updated rubric
    updated_rubric = await db.rubrics.find_one({"rubric_id": rubric_id}, {"_id": 0})
    if isinstance(updated_rubric['created_at'], str):
        updated_rubric['created_at'] = datetime.fromisoformat(updated_rubric['created_at'])
    
    return Rubric(**updated_rubric)

@api_router.delete("/rubrics/{rubric_id}")
async def delete_rubric(request: Request, rubric_id: str):
    """Delete a rubric (teacher only)"""
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can delete rubrics")
    
    # Check if rubric exists
    rubric_doc = await db.rubrics.find_one({"rubric_id": rubric_id}, {"_id": 0})
    if not rubric_doc:
        raise HTTPException(status_code=404, detail="Rubric not found")
    
    # Don't allow deletion of default rubrics
    if rubric_doc.get("is_default", False):
        raise HTTPException(status_code=403, detail="Cannot delete default rubrics")
    
    # Delete the rubric
    await db.rubrics.delete_one({"rubric_id": rubric_id})
    
    return {"message": "Rubric deleted successfully", "rubric_id": rubric_id}

# ========== EVALUATION ENDPOINTS (EXTENDED) ==========

@api_router.post("/evaluations/global/generate")
async def generate_global_evaluation(request: Request, eval_req: GlobalEvaluationRequest):
    """
    Genera una evaluación global/transversal automática 
    basada en el promedio ponderado de evaluaciones por caso particular
    """
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can generate global evaluations")
    
    # Construir query para obtener simulaciones en el rango de fechas
    query = {
        "user_id": eval_req.user_id,
        "status": "completed"
    }
    
    # Filtrar por fechas si se proporcionan
    if eval_req.start_date or eval_req.end_date:
        date_filter = {}
        if eval_req.start_date:
            date_filter["$gte"] = eval_req.start_date
        if eval_req.end_date:
            date_filter["$lte"] = eval_req.end_date
        query["started_at"] = date_filter
    
    # Obtener todas las simulaciones del periodo
    simulations = await db.simulations.find(query, {"_id": 0}).to_list(1000)
    
    if not simulations:
        raise HTTPException(
            status_code=404, 
            detail="No se encontraron simulaciones completadas en el periodo especificado"
        )
    
    # Filtrar por casos específicos si se indicaron
    if eval_req.include_cases:
        simulations = [s for s in simulations if s.get("case_id") in eval_req.include_cases]
    
    if not simulations:
        raise HTTPException(
            status_code=404, 
            detail="No se encontraron simulaciones para los casos especificados"
        )
    
    # Obtener evaluaciones de esas simulaciones
    sim_ids = [s["sim_id"] for s in simulations]
    evaluations = await db.evaluations.find(
        {"sim_id": {"$in": sim_ids}},
        {"_id": 0}
    ).to_list(1000)
    
    if not evaluations:
        raise HTTPException(
            status_code=404,
            detail="No se encontraron evaluaciones para el periodo/casos especificados"
        )
    
    # Calcular promedios por competencia
    competency_sums = {
        "comunicacion": 0,
        "valoracion_clinica": 0,
        "razonamiento_critico": 0,
        "competencia_tecnica": 0,
        "empatia": 0
    }
    competency_counts = {k: 0 for k in competency_sums.keys()}
    
    for evaluation in evaluations:
        scores = evaluation.get("scores", {})
        for comp_key in competency_sums.keys():
            if comp_key in scores:
                competency_sums[comp_key] += scores[comp_key]
                competency_counts[comp_key] += 1
    
    # Calcular promedios
    global_competencies = {}
    for comp_key in competency_sums.keys():
        if competency_counts[comp_key] > 0:
            global_competencies[comp_key] = competency_sums[comp_key] / competency_counts[comp_key]
        else:
            global_competencies[comp_key] = 0
    
    # Calcular puntaje global
    global_score = sum(global_competencies.values()) / len(global_competencies)
    
    # Determinar nivel por cuartil
    def get_quartile_level(score):
        if score >= 75:
            return 4  # Excelente
        elif score >= 50:
            return 3  # Competente
        elif score >= 25:
            return 2  # En desarrollo
        else:
            return 1  # Inicial
    
    # Crear evaluación global
    global_eval_id = f"eval_global_{uuid.uuid4().hex[:12]}"
    
    # Generar feedback automático
    feedback_parts = [
        "**Evaluación Global del Periodo**\n",
        f"Total de simulaciones evaluadas: {len(evaluations)}",
        f"Puntaje global promedio: {global_score:.1f}/100\n",
        "\n**Desempeño por Competencia:**\n"
    ]
    
    competency_names = {
        "comunicacion": "Comunicación",
        "valoracion_clinica": "Valoración Clínica",
        "razonamiento_critico": "Razonamiento Crítico",
        "competencia_tecnica": "Competencia Técnica",
        "empatia": "Empatía y Relación Terapéutica"
    }
    
    strengths = []
    improvements = []
    
    for comp_key, score in global_competencies.items():
        level = get_quartile_level(score)
        level_names = ["Inicial", "En Desarrollo", "Competente", "Excelente"]
        
        feedback_parts.append(
            f"- {competency_names[comp_key]}: {score:.1f}% (Nivel {level} - {level_names[level-1]})"
        )
        
        if score >= 75:
            strengths.append(f"{competency_names[comp_key]}: Desempeño excelente sostenido")
        elif score < 50:
            improvements.append(f"{competency_names[comp_key]}: Requiere mayor desarrollo y práctica")
    
    global_eval = {
        "eval_id": global_eval_id,
        "sim_id": None,
        "user_id": eval_req.user_id,
        "evaluation_type": "GLOBAL",
        "case_id": None,
        "scores": global_competencies,
        "feedback": "\n".join(feedback_parts),
        "strengths": strengths or ["Progreso constante en el periodo evaluado"],
        "improvements": improvements or ["Mantener el nivel de desempeño actual"],
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "evaluated_by": user.user_id,
        "period_info": {
            "start_date": eval_req.start_date,
            "end_date": eval_req.end_date,
            "simulations_count": len(evaluations),
            "cases_evaluated": list(set([s.get("case_id") for s in simulations if s.get("case_id")]))
        }
    }
    
    await db.evaluations.insert_one(global_eval)
    
    # Actualizar perfil de competencias del usuario
    await update_competency_profile(eval_req.user_id)
    
    # Remove _id from global_eval before returning
    global_eval_response = {k: v for k, v in global_eval.items() if k != '_id'}
    
    return {
        "message": "Evaluación global generada exitosamente",
        "evaluation": global_eval_response,
        "summary": {
            "global_score": global_score,
            "simulations_evaluated": len(evaluations),
            "competencies": global_competencies
        }
    }

# ========== HELPER FUNCTIONS ==========

async def update_competency_profile(user_id: str, new_scores: Dict[str, float]):
    """Update user's competency profile with new scores"""
    profile_doc = await db.competency_profiles.find_one({"user_id": user_id}, {"_id": 0})
    
    if not profile_doc:
        # Create new profile
        profile_id = f"prof_{uuid.uuid4().hex[:12]}"
        profile_doc = {
            "profile_id": profile_id,
            "user_id": user_id,
            "competencies": new_scores,
            "idec_score": sum(new_scores.values()) / len(new_scores),
            "simulations_count": 1,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.competency_profiles.insert_one(profile_doc)
    else:
        # Update with weighted average
        count = profile_doc["simulations_count"]
        old_competencies = profile_doc["competencies"]
        
        updated_competencies = {}
        for key in new_scores:
            old_val = old_competencies.get(key, 0)
            new_val = new_scores[key]
            updated_competencies[key] = (old_val * count + new_val) / (count + 1)
        
        new_idec = sum(updated_competencies.values()) / len(updated_competencies)
        
        await db.competency_profiles.update_one(
            {"user_id": user_id},
            {"$set": {
                "competencies": updated_competencies,
                "idec_score": new_idec,
                "simulations_count": count + 1,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

# ========== ROOT ROUTES ==========

@api_router.get("/")
async def root():
    return {"message": "AMED IA API v1.0", "status": "operational"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
