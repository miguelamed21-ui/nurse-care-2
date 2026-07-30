"""Analytics routes for teacher dashboard - Fase 2"""
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

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/groups/{group_id}/overview")
async def get_group_overview(request: Request, group_id: str):
    """
    Get overview metrics for a specific group
    Returns: student count, average competencies, simulation stats, etc.
    """
    user = await get_current_user(request)
    
    # Only teachers and admins can access
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can access analytics")
    
    # Get group
    group = await db.student_groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Verify ownership (teachers can only see their own groups)
    if user.role == "teacher" and group["teacher_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="You can only view your own groups")
    
    student_ids = group.get("student_ids", [])
    
    # Parallel queries for better performance
    students, simulations, evaluations, profiles = await asyncio.gather(
        db.users.find(
            {"user_id": {"$in": student_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1}
        ).to_list(1000),
        db.simulations.find(
            {"user_id": {"$in": student_ids}},
            {"_id": 0}
        ).to_list(1000),
        db.evaluations.find(
            {"user_id": {"$in": student_ids}, "evaluation_type": "CASO"},
            {"_id": 0}
        ).to_list(1000),
        db.competency_profiles.find(
            {"user_id": {"$in": student_ids}},
            {"_id": 0}
        ).to_list(1000)
    )
    
    # Calculate group metrics
    total_simulations = len(simulations)
    completed_simulations = len([s for s in simulations if s.get("status") == "completed"])
    total_evaluations = len(evaluations)
    
    # Average competencies across group
    avg_competencies = {}
    for comp in COMPETENCY_NAMES:
        scores = []
        for profile in profiles:
            comp_score = profile.get("competencies", {}).get(comp)
            if comp_score is not None:
                scores.append(comp_score)
        avg_competencies[comp] = round(sum(scores) / len(scores), 2) if scores else 0.0
    
    # Average IDEC (excluding 0.0 to avoid skewing)
    idec_scores = [p.get("idec_score", 0) for p in profiles if p.get("idec_score") and p.get("idec_score") > 0]
    avg_idec = round(sum(idec_scores) / len(idec_scores), 2) if idec_scores else 0.0
    
    # Student performance summary
    student_summaries = []
    for student in students:
        student_id = student["user_id"]
        student_sims = [s for s in simulations if s["user_id"] == student_id]
        student_evals = [e for e in evaluations if e["user_id"] == student_id]
        student_profile = next((p for p in profiles if p["user_id"] == student_id), None)
        
        student_summaries.append({
            "user_id": student_id,
            "name": student["name"],
            "email": student["email"],
            "simulations_count": len(student_sims),
            "evaluations_count": len(student_evals),
            "idec_score": student_profile.get("idec_score", 0) if student_profile else 0,
            "last_activity": max(
                [s.get("started_at") for s in student_sims if s.get("started_at")] + 
                [e.get("evaluated_at") for e in student_evals if e.get("evaluated_at")],
                default=None
            )
        })
    
    return {
        "group_id": group_id,
        "group_name": group["name"],
        "student_count": len(student_ids),
        "total_simulations": total_simulations,
        "completed_simulations": completed_simulations,
        "total_evaluations": total_evaluations,
        "avg_competencies": avg_competencies,
        "avg_idec": avg_idec,
        "students": student_summaries
    }


@router.get("/students/{student_id}")
async def get_student_analytics(request: Request, student_id: str):
    """
    Get detailed analytics for a specific student
    Returns: full history, competencies breakdown, simulations, evaluations
    """
    user = await get_current_user(request)
    
    # Only teachers and admins can access
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can access analytics")
    
    # Get student
    student = await db.users.find_one({"user_id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # If teacher, verify they have access to this student (via groups)
    if user.role == "teacher":
        teacher_groups = await db.student_groups.find(
            {"teacher_id": user.user_id, "student_ids": student_id},
            {"_id": 0}
        ).to_list(1000)
        
        if not teacher_groups:
            raise HTTPException(status_code=403, detail="You don't have access to this student")
    
    # Parallel queries for better performance
    simulations, evaluations, profile = await asyncio.gather(
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
        )
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
    
    # Calculate competency trends (grouping by date)
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
    
    return {
        "student": {
            "user_id": student["user_id"],
            "name": student["name"],
            "email": student["email"],
            "role": student["role"]
        },
        "summary": {
            "simulations_count": len(simulations),
            "completed_simulations": len([s for s in simulations if s.get("status") == "completed"]),
            "evaluations_count": len(evaluations),
            "idec_score": profile.get("idec_score", 0) if profile else 0
        },
        "competencies": profile.get("competencies", {}) if profile else {},
        "simulations": simulations,
        "evaluations": evaluations,
        "competency_trends": competency_trends
    }


@router.get("/groups/{group_id}/compare")
async def compare_students(request: Request, group_id: str):
    """
    Compare students within a group
    Returns comparative metrics for all students
    """
    user = await get_current_user(request)
    
    # Only teachers and admins can access
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can access analytics")
    
    # Get group
    group = await db.student_groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Verify ownership
    if user.role == "teacher" and group["teacher_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="You can only view your own groups")
    
    student_ids = group.get("student_ids", [])
    
    # Get students
    students = await db.users.find(
        {"user_id": {"$in": student_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1}
    ).to_list(1000)
    
    # Get data for all students
    comparisons = []
    
    for student in students:
        student_id = student["user_id"]
        
        # Get simulations
        sim_count = await db.simulations.count_documents({"user_id": student_id})
        completed_sim_count = await db.simulations.count_documents(
            {"user_id": student_id, "status": "completed"}
        )
        
        # Get evaluations
        eval_count = await db.evaluations.count_documents(
            {"user_id": student_id, "evaluation_type": "CASO"}
        )
        
        # Get competency profile
        profile = await db.competency_profiles.find_one(
            {"user_id": student_id},
            {"_id": 0}
        )
        
        comparisons.append({
            "user_id": student_id,
            "name": student["name"],
            "email": student["email"],
            "simulations": sim_count,
            "completed_simulations": completed_sim_count,
            "evaluations": eval_count,
            "idec_score": profile.get("idec_score", 0) if profile else 0,
            "competencies": profile.get("competencies", {}) if profile else {}
        })
    
    # Sort by IDEC score descending
    comparisons.sort(key=lambda x: x["idec_score"], reverse=True)
    
    return {
        "group_id": group_id,
        "group_name": group["name"],
        "student_count": len(comparisons),
        "comparisons": comparisons
    }


@router.get("/groups/{group_id}/export/pdf")
async def export_group_pdf(request: Request, group_id: str):
    """Export group analytics as PDF"""
    from fastapi.responses import StreamingResponse
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from export_utils import generate_group_analytics_pdf
    
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can export analytics")
    
    # Get group
    group = await db.student_groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if user.role == "teacher" and group["teacher_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="You can only export your own groups")
    
    # Get overview data
    student_ids = group.get("student_ids", [])
    
    students, simulations, evaluations, profiles = await asyncio.gather(
        db.users.find({"user_id": {"$in": student_ids}}, {"_id": 0}).to_list(1000),
        db.simulations.find({"user_id": {"$in": student_ids}}, {"_id": 0}).to_list(1000),
        db.evaluations.find({"user_id": {"$in": student_ids}, "evaluation_type": "CASO"}, {"_id": 0}).to_list(1000),
        db.competency_profiles.find({"user_id": {"$in": student_ids}}, {"_id": 0}).to_list(1000)
    )
    
    # Calculate stats
    avg_competencies = {}
    for comp in COMPETENCY_NAMES:
        scores = [p.get("competencies", {}).get(comp) for p in profiles if p.get("competencies", {}).get(comp)]
        avg_competencies[comp] = round(sum(scores) / len(scores), 2) if scores else 0.0
    
    idec_scores = [p.get("idec_score", 0) for p in profiles if p.get("idec_score") and p.get("idec_score") > 0]
    avg_idec = round(sum(idec_scores) / len(idec_scores), 2) if idec_scores else 0.0
    
    students_data = []
    for student in students:
        student_id = student["user_id"]
        student_sims = [s for s in simulations if s["user_id"] == student_id]
        student_evals = [e for e in evaluations if e["user_id"] == student_id]
        student_profile = next((p for p in profiles if p["user_id"] == student_id), None)
        
        students_data.append({
            "name": student["name"],
            "simulations_count": len(student_sims),
            "evaluations_count": len(student_evals),
            "idec_score": student_profile.get("idec_score", 0) if student_profile else 0
        })
    
    # Get teacher name
    teacher = await db.users.find_one({"user_id": group["teacher_id"]}, {"_id": 0})
    
    group_data = {
        "group_name": group["name"],
        "teacher_name": teacher.get("name", "N/A") if teacher else "N/A"
    }
    
    stats = {
        "student_count": len(student_ids),
        "total_simulations": len(simulations),
        "completed_simulations": len([s for s in simulations if s.get("status") == "completed"]),
        "total_evaluations": len(evaluations),
        "avg_idec": avg_idec,
        "avg_competencies": avg_competencies
    }
    
    pdf_buffer = generate_group_analytics_pdf(group_data, students_data, stats)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=grupo_{group['name']}_analytics.pdf"}
    )


@router.get("/groups/{group_id}/export/excel")
async def export_group_excel(request: Request, group_id: str):
    """Export group comparison as Excel"""
    from fastapi.responses import StreamingResponse
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from export_utils import generate_group_comparison_excel
    
    user = await get_current_user(request)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can export analytics")
    
    # Get group
    group = await db.student_groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if user.role == "teacher" and group["teacher_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="You can only export your own groups")
    
    student_ids = group.get("student_ids", [])
    students = await db.users.find({"user_id": {"$in": student_ids}}, {"_id": 0}).to_list(1000)
    
    comparisons = []
    for student in students:
        student_id = student["user_id"]
        
        sim_count = await db.simulations.count_documents({"user_id": student_id})
        completed_sim_count = await db.simulations.count_documents({"user_id": student_id, "status": "completed"})
        eval_count = await db.evaluations.count_documents({"user_id": student_id, "evaluation_type": "CASO"})
        profile = await db.competency_profiles.find_one({"user_id": student_id}, {"_id": 0})
        
        comparisons.append({
            "name": student["name"],
            "email": student["email"],
            "simulations": sim_count,
            "completed_simulations": completed_sim_count,
            "evaluations": eval_count,
            "idec_score": profile.get("idec_score", 0) if profile else 0,
            "competencies": profile.get("competencies", {}) if profile else {}
        })
    
    comparisons.sort(key=lambda x: x["idec_score"], reverse=True)
    
    excel_buffer = generate_group_comparison_excel(group["name"], comparisons)
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=grupo_{group['name']}_comparativa.xlsx"}
    )
