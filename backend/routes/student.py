"""Student progress routes - Self-analytics for students"""
from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import sys
import asyncio
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dependencies import get_current_user, db
from constants import COMPETENCY_NAMES

router = APIRouter(prefix="/student", tags=["student"])


@router.get("/progress")
async def get_student_progress(request: Request):
    """
    Get student's personal progress and analytics
    Students can only view their own progress
    """
    user = await get_current_user(request)
    
    if user.role != "student":
        raise HTTPException(status_code=403, detail="This endpoint is only for students")
    
    student_id = user.user_id
    
    # Parallel queries
    simulations, evaluations, profile, groups = await asyncio.gather(
        db.simulations.find(
            {"user_id": student_id},
            {"_id": 0}
        ).to_list(1000),
        db.evaluations.find(
            {"user_id": student_id, "evaluation_type": "CASO"},
            {"_id": 0}
        ).to_list(1000),
        db.competency_profiles.find_one(
            {"user_id": student_id},
            {"_id": 0}
        ),
        db.student_groups.find(
            {"student_ids": student_id},
            {"_id": 0}
        ).to_list(100)
    )
    
    # Get case details for simulations
    case_ids = list(set([s["case_id"] for s in simulations]))
    cases = await db.clinical_cases.find(
        {"case_id": {"$in": case_ids}},
        {"_id": 0, "case_id": 1, "title": 1, "specialty": 1, "difficulty": 1}
    ).to_list(1000)
    case_map = {c["case_id"]: c for c in cases}
    
    # Enrich simulations with case info
    for sim in simulations:
        sim["case_info"] = case_map.get(sim["case_id"], {})
    
    # Enrich evaluations with case info
    for eval in evaluations:
        if eval.get("case_id"):
            eval["case_info"] = case_map.get(eval["case_id"], {})
    
    # Calculate competency trends
    competency_trends = {}
    if evaluations:
        sorted_evals = sorted(evaluations, key=lambda x: x.get("evaluated_at", ""))
        
        for comp_name in COMPETENCY_NAMES:
            competency_trends[comp_name] = []
            for eval in sorted_evals:
                score = eval.get("scores", {}).get(comp_name)
                if score is not None:
                    competency_trends[comp_name].append({
                        "date": eval.get("evaluated_at"),
                        "score": score,
                        "case_title": eval.get("case_info", {}).get("title", "Desconocido")
                    })
    
    # Get group averages for comparison (anonymized)
    group_averages = []
    for group in groups:
        group_student_ids = group.get("student_ids", [])
        
        # Get profiles of all students in group
        group_profiles = await db.competency_profiles.find(
            {"user_id": {"$in": group_student_ids}},
            {"_id": 0}
        ).to_list(1000)
        
        # Calculate averages
        group_avg_competencies = {}
        for comp in COMPETENCY_NAMES:
            scores = [p.get("competencies", {}).get(comp) for p in group_profiles if p.get("competencies", {}).get(comp)]
            group_avg_competencies[comp] = round(sum(scores) / len(scores), 2) if scores else 0.0
        
        idec_scores = [p.get("idec_score", 0) for p in group_profiles if p.get("idec_score") and p.get("idec_score") > 0]
        group_avg_idec = round(sum(idec_scores) / len(idec_scores), 2) if idec_scores else 0.0
        
        group_averages.append({
            "group_name": group["name"],
            "avg_competencies": group_avg_competencies,
            "avg_idec": group_avg_idec,
            "student_count": len(group_student_ids)
        })
    
    # Get recent feedback
    recent_feedback = []
    for eval in sorted(evaluations, key=lambda x: x.get("evaluated_at", ""), reverse=True)[:5]:
        recent_feedback.append({
            "case_title": eval.get("case_info", {}).get("title", "Desconocido"),
            "date": eval.get("evaluated_at"),
            "feedback": eval.get("feedback", ""),
            "strengths": eval.get("strengths", []),
            "improvements": eval.get("improvements", [])
        })
    
    return {
        "student": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email
        },
        "summary": {
            "simulations_count": len(simulations),
            "completed_simulations": len([s for s in simulations if s.get("status") == "completed"]),
            "evaluations_count": len(evaluations),
            "idec_score": profile.get("idec_score", 0) if profile else 0
        },
        "competencies": profile.get("competencies", {}) if profile else {},
        "competency_trends": competency_trends,
        "simulations": simulations,
        "recent_feedback": recent_feedback,
        "group_comparisons": group_averages
    }
