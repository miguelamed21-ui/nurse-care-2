"""Admin routes for user management - Fase 3"""
from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import sys
from pathlib import Path
from uuid import uuid4

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dependencies import get_current_user, db
from models import User
from constants import USER_ROLES

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
async def list_all_users(request: Request, role: Optional[str] = None):
    """
    List all users in the system (Admin only)
    Can filter by role
    """
    user = await get_current_user(request)
    
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage users")
    
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0}).to_list(1000)
    
    # Parse datetime strings
    for user_doc in users:
        if isinstance(user_doc.get('created_at'), str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return users


@router.post("/users")
async def create_user(request: Request, user_data: Dict[str, Any]):
    """
    Create a new user (Admin only)
    Required fields: email, name, role
    """
    current_user = await get_current_user(request)
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    # Validate required fields
    if not user_data.get("email") or not user_data.get("name") or not user_data.get("role"):
        raise HTTPException(status_code=400, detail="email, name, and role are required")
    
    # Validate role
    if user_data["role"] not in USER_ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of: {', '.join(USER_ROLES)}")
    
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    
    # Create user
    user_id = f"user_{uuid4().hex[:12]}"
    new_user = {
        "user_id": user_id,
        "email": user_data["email"],
        "name": user_data["name"],
        "role": user_data["role"],
        "picture": user_data.get("picture"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    # Return created user
    new_user['created_at'] = datetime.fromisoformat(new_user['created_at'])
    return new_user


@router.put("/users/{user_id}")
async def update_user(request: Request, user_id: str, user_data: Dict[str, Any]):
    """
    Update user information (Admin only)
    Can update: name, role, picture
    Cannot update: user_id, email, created_at
    """
    current_user = await get_current_user(request)
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update users")
    
    # Check if user exists
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build update object
    update_fields = {}
    
    if "name" in user_data:
        update_fields["name"] = user_data["name"]
    
    if "role" in user_data:
        if user_data["role"] not in USER_ROLES:
            raise HTTPException(status_code=400, detail=f"role must be one of: {', '.join(USER_ROLES)}")
        update_fields["role"] = user_data["role"]
    
    if "picture" in user_data:
        update_fields["picture"] = user_data["picture"]
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Update user
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_fields}
    )
    
    # Return updated user
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if isinstance(updated_user.get('created_at'), str):
        updated_user['created_at'] = datetime.fromisoformat(updated_user['created_at'])
    
    return updated_user


@router.delete("/users/{user_id}")
async def delete_user(request: Request, user_id: str):
    """
    Delete a user (Admin only)
    Also deletes all related data: sessions, simulations, evaluations, profiles
    Cannot delete yourself
    """
    current_user = await get_current_user(request)
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    # Prevent self-deletion
    if current_user.user_id == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")
    
    # Check if user exists
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user and all related data
    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.simulations.delete_many({"user_id": user_id})
    await db.evaluations.delete_many({"user_id": user_id})
    await db.competency_profiles.delete_many({"user_id": user_id})
    
    # Remove from groups
    await db.student_groups.update_many(
        {"student_ids": user_id},
        {"$pull": {"student_ids": user_id}}
    )
    
    # Delete groups owned by this user (if teacher)
    await db.student_groups.delete_many({"teacher_id": user_id})
    
    # Delete assignments
    await db.case_assignments.delete_many({"assigned_to": user_id})
    await db.case_assignments.delete_many({"assigned_by": user_id})
    
    return {
        "message": "User deleted successfully",
        "user_id": user_id,
        "deleted_user": target_user
    }


@router.get("/stats/overview")
async def get_institutional_stats(request: Request):
    """
    Get institutional-level statistics (Admin only)
    Returns global metrics across all users
    """
    user = await get_current_user(request)
    
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view institutional stats")
    
    # Count users by role
    total_users = await db.users.count_documents({})
    admins = await db.users.count_documents({"role": "admin"})
    teachers = await db.users.count_documents({"role": "teacher"})
    students = await db.users.count_documents({"role": "student"})
    
    # Count resources
    total_cases = await db.clinical_cases.count_documents({})
    total_simulations = await db.simulations.count_documents({})
    completed_simulations = await db.simulations.count_documents({"status": "completed"})
    total_evaluations = await db.evaluations.count_documents({})
    
    # Count groups and assignments
    total_groups = await db.student_groups.count_documents({})
    total_assignments = await db.case_assignments.count_documents({})
    
    # Get average IDEC across all students
    profiles = await db.competency_profiles.find({}, {"_id": 0, "idec_score": 1}).to_list(1000)
    idec_scores = [p.get("idec_score", 0) for p in profiles if p.get("idec_score")]
    avg_idec = round(sum(idec_scores) / len(idec_scores), 2) if idec_scores else 0.0
    
    # Get cases by specialty
    cases = await db.clinical_cases.find({}, {"_id": 0, "specialty": 1, "difficulty": 1}).to_list(1000)
    specialties = {}
    difficulties = {}
    
    for case in cases:
        spec = case.get("specialty", "Desconocido")
        diff = case.get("difficulty", "Desconocido")
        specialties[spec] = specialties.get(spec, 0) + 1
        difficulties[diff] = difficulties.get(diff, 0) + 1
    
    return {
        "users": {
            "total": total_users,
            "admins": admins,
            "teachers": teachers,
            "students": students
        },
        "resources": {
            "cases": total_cases,
            "simulations": total_simulations,
            "completed_simulations": completed_simulations,
            "evaluations": total_evaluations,
            "groups": total_groups,
            "assignments": total_assignments
        },
        "performance": {
            "avg_idec": avg_idec,
            "total_profiles": len(profiles)
        },
        "distribution": {
            "by_specialty": specialties,
            "by_difficulty": difficulties
        }
    }
