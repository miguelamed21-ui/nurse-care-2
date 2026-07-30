"""Pydantic models for AMED-IA API"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# ========== USER MODELS ==========

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

# ========== CASE MODELS ==========

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

# ========== SIMULATION MODELS ==========

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
    target_participant: Optional[str] = None  # For team simulations

# ========== EVALUATION MODELS ==========

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

class ManualEvaluationRequest(BaseModel):
    sim_id: str
    scores: Dict[str, Any]
    feedback: str
    strengths: List[str]
    improvements: List[str]

class CompetencyProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_id: str
    user_id: str
    competencies: Dict[str, float]
    idec_score: float
    simulations_count: int
    updated_at: datetime

# ========== RUBRIC MODELS ==========

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
    competency_levels: Optional[Dict[str, Dict[str, Any]]] = None

class RubricUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    competency_weights: Optional[Dict[str, float]] = None
    competency_levels: Optional[Dict[str, Dict[str, Any]]] = None

# ========== RBAC & GROUPS MODELS ==========

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
    case_id: Optional[str] = None  # None for random assignments
    assigned_to: str  # user_id or group_id
    assignment_type: str  # "individual" | "group"
    assigned_by: str  # teacher_id
    assignment_mode: str  # "directed" | "random"
    random_filters: Optional[Dict[str, str]] = None  # {difficulty, specialty}
    status: str = "pending"  # "pending" | "in_progress" | "completed"
    assigned_at: datetime
    completed_at: Optional[datetime] = None

class AssignmentCreateRequest(BaseModel):
    case_id: Optional[str] = None  # Required for directed, None for random
    assigned_to: str  # user_id or group_id
    assignment_type: str  # "individual" | "group"
    assignment_mode: str  # "directed" | "random"
    random_filters: Optional[Dict[str, str]] = None  # For random mode
