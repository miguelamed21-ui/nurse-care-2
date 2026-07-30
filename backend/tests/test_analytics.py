"""AMED IA - Phase 2 Analytics endpoints tests.

Covers:
- GET /api/analytics/groups/{group_id}/overview
- GET /api/analytics/students/{student_id}
- GET /api/analytics/groups/{group_id}/compare
- RBAC: only teachers/admins can access
- RBAC: teachers only see their own groups / students in their groups
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

mc = MongoClient(MONGO_URL)
db = mc[DB_NAME]


def _mk_user(role: str, name_suffix: str):
    uid = f"test-an-{role}-{name_suffix}-{uuid.uuid4().hex[:6]}"
    token = f"test_an_{role}_{name_suffix}_{uuid.uuid4().hex[:6]}"
    db.users.insert_one({
        "user_id": uid,
        "email": f"TEST_an_{role}_{name_suffix}@e.com",
        "name": f"TEST {role} {name_suffix}",
        "role": role,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": uid,
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return uid, token


def hdr(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def analytics_seed():
    """Seed: teacher A with group G1 (2 students s1, s2 with sims/evals/profiles).
       teacher B with group G2 (1 student s3). Admin user too."""
    created = {"users": [], "sessions": [], "groups": [], "sims": [], "evals": [], "profiles": []}

    t1_uid, t1_tok = _mk_user("teacher", "A")
    t2_uid, t2_tok = _mk_user("teacher", "B")
    adm_uid, adm_tok = _mk_user("admin", "X")
    s1_uid, s1_tok = _mk_user("student", "1")
    s2_uid, s2_tok = _mk_user("student", "2")
    s3_uid, s3_tok = _mk_user("student", "3")

    created["users"] = [t1_uid, t2_uid, adm_uid, s1_uid, s2_uid, s3_uid]
    created["sessions"] = [t1_tok, t2_tok, adm_tok, s1_tok, s2_tok, s3_tok]

    g1_id = f"test-group-{uuid.uuid4().hex[:8]}"
    g2_id = f"test-group-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    db.student_groups.insert_one({
        "group_id": g1_id, "name": "TEST Group 1", "teacher_id": t1_uid,
        "student_ids": [s1_uid, s2_uid], "created_at": now,
    })
    db.student_groups.insert_one({
        "group_id": g2_id, "name": "TEST Group 2", "teacher_id": t2_uid,
        "student_ids": [s3_uid], "created_at": now,
    })
    created["groups"] = [g1_id, g2_id]

    # Simulations: s1 has 2 (1 completed), s2 has 1 active
    case_id_a = f"case-an-{uuid.uuid4().hex[:6]}"
    db.clinical_cases.insert_one({
        "case_id": case_id_a, "title": "TEST Case A", "specialty": "Medicina",
        "difficulty": "Intermedio", "created_by": t1_uid, "created_at": now,
    })
    for uid_, status_ in [(s1_uid, "completed"), (s1_uid, "active"), (s2_uid, "active")]:
        sid = f"sim-an-{uuid.uuid4().hex[:6]}"
        db.simulations.insert_one({
            "sim_id": sid, "user_id": uid_, "case_id": case_id_a,
            "status": status_, "started_at": now, "messages": [],
        })
        created["sims"].append(sid)

    # Evaluations CASO for s1 and s2
    for uid_ in [s1_uid, s2_uid]:
        eid = f"eval-an-{uuid.uuid4().hex[:6]}"
        db.evaluations.insert_one({
            "evaluation_id": eid, "user_id": uid_, "case_id": case_id_a,
            "evaluation_type": "CASO", "evaluated_at": now,
            "scores": {
                "Valoración y Diagnóstico": 80,
                "Planificación del Cuidado": 70,
                "Intervención Clínica": 75,
                "Comunicación Terapéutica": 85,
                "Pensamiento Crítico": 78,
            },
        })
        created["evals"].append(eid)

    # Competency profiles
    for uid_, idec in [(s1_uid, 82.0), (s2_uid, 70.0)]:
        db.competency_profiles.insert_one({
            "user_id": uid_,
            "competencies": {
                "Valoración y Diagnóstico": 80, "Planificación del Cuidado": 70,
                "Intervención Clínica": 75, "Comunicación Terapéutica": 85,
                "Pensamiento Crítico": 78,
            },
            "idec_score": idec, "updated_at": now,
        })
        created["profiles"].append(uid_)

    yield {
        "t1_uid": t1_uid, "t1_tok": t1_tok,
        "t2_uid": t2_uid, "t2_tok": t2_tok,
        "adm_uid": adm_uid, "adm_tok": adm_tok,
        "s1_uid": s1_uid, "s1_tok": s1_tok,
        "s2_uid": s2_uid, "s2_tok": s2_tok,
        "s3_uid": s3_uid, "s3_tok": s3_tok,
        "g1_id": g1_id, "g2_id": g2_id, "case_id": case_id_a,
    }

    # Cleanup
    db.users.delete_many({"user_id": {"$in": created["users"]}})
    db.user_sessions.delete_many({"session_token": {"$in": created["sessions"]}})
    db.student_groups.delete_many({"group_id": {"$in": created["groups"]}})
    db.simulations.delete_many({"sim_id": {"$in": created["sims"]}})
    db.evaluations.delete_many({"evaluation_id": {"$in": created["evals"]}})
    db.competency_profiles.delete_many({"user_id": {"$in": created["profiles"]}})
    db.clinical_cases.delete_many({"case_id": created["users"] and f"case-an-..."} if False else {"created_by": created["users"][0]})


# ----------------- /analytics/groups/{id}/overview --------------------------

def test_overview_unauth(analytics_seed):
    r = requests.get(f"{API}/analytics/groups/{analytics_seed['g1_id']}/overview", timeout=15)
    assert r.status_code == 401


def test_overview_student_forbidden(analytics_seed):
    r = requests.get(
        f"{API}/analytics/groups/{analytics_seed['g1_id']}/overview",
        headers=hdr(analytics_seed["s1_tok"]), timeout=15,
    )
    assert r.status_code == 403


def test_overview_teacher_own_group_ok(analytics_seed):
    r = requests.get(
        f"{API}/analytics/groups/{analytics_seed['g1_id']}/overview",
        headers=hdr(analytics_seed["t1_tok"]), timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["group_id"] == analytics_seed["g1_id"]
    assert data["group_name"] == "TEST Group 1"
    assert data["student_count"] == 2
    assert data["total_simulations"] == 3
    assert data["completed_simulations"] == 1
    assert data["total_evaluations"] == 2
    # Avg IDEC across (82, 70) = 76.0
    assert data["avg_idec"] == 76.0
    assert "Valoración y Diagnóstico" in data["avg_competencies"]
    assert data["avg_competencies"]["Valoración y Diagnóstico"] == 80.0
    # Students list
    assert len(data["students"]) == 2
    s_by_id = {s["user_id"]: s for s in data["students"]}
    assert s_by_id[analytics_seed["s1_uid"]]["simulations_count"] == 2
    assert s_by_id[analytics_seed["s1_uid"]]["evaluations_count"] == 1
    assert s_by_id[analytics_seed["s1_uid"]]["idec_score"] == 82.0


def test_overview_teacher_other_group_forbidden(analytics_seed):
    # Teacher A tries Teacher B's group
    r = requests.get(
        f"{API}/analytics/groups/{analytics_seed['g2_id']}/overview",
        headers=hdr(analytics_seed["t1_tok"]), timeout=15,
    )
    assert r.status_code == 403


def test_overview_admin_any_group_ok(analytics_seed):
    r = requests.get(
        f"{API}/analytics/groups/{analytics_seed['g2_id']}/overview",
        headers=hdr(analytics_seed["adm_tok"]), timeout=15,
    )
    assert r.status_code == 200
    assert r.json()["student_count"] == 1


def test_overview_group_not_found(analytics_seed):
    r = requests.get(
        f"{API}/analytics/groups/nope-xxx/overview",
        headers=hdr(analytics_seed["adm_tok"]), timeout=15,
    )
    assert r.status_code == 404


# ----------------- /analytics/students/{id} ---------------------------------

def test_student_analytics_unauth(analytics_seed):
    r = requests.get(f"{API}/analytics/students/{analytics_seed['s1_uid']}", timeout=15)
    assert r.status_code == 401


def test_student_analytics_student_forbidden(analytics_seed):
    r = requests.get(
        f"{API}/analytics/students/{analytics_seed['s1_uid']}",
        headers=hdr(analytics_seed["s1_tok"]), timeout=15,
    )
    assert r.status_code == 403


def test_student_analytics_teacher_own_student_ok(analytics_seed):
    r = requests.get(
        f"{API}/analytics/students/{analytics_seed['s1_uid']}",
        headers=hdr(analytics_seed["t1_tok"]), timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["student"]["user_id"] == analytics_seed["s1_uid"]
    assert data["summary"]["simulations_count"] == 2
    assert data["summary"]["completed_simulations"] == 1
    assert data["summary"]["evaluations_count"] == 1
    assert data["summary"]["idec_score"] == 82.0
    assert "Valoración y Diagnóstico" in data["competencies"]
    assert len(data["simulations"]) == 2
    assert len(data["evaluations"]) == 1
    # Trends populated
    assert "Valoración y Diagnóstico" in data["competency_trends"]
    assert len(data["competency_trends"]["Valoración y Diagnóstico"]) == 1


def test_student_analytics_teacher_other_student_forbidden(analytics_seed):
    # Teacher A tries to view Teacher B's student
    r = requests.get(
        f"{API}/analytics/students/{analytics_seed['s3_uid']}",
        headers=hdr(analytics_seed["t1_tok"]), timeout=15,
    )
    assert r.status_code == 403


def test_student_analytics_admin_any_ok(analytics_seed):
    r = requests.get(
        f"{API}/analytics/students/{analytics_seed['s3_uid']}",
        headers=hdr(analytics_seed["adm_tok"]), timeout=15,
    )
    assert r.status_code == 200
    assert r.json()["student"]["user_id"] == analytics_seed["s3_uid"]


def test_student_analytics_not_found(analytics_seed):
    r = requests.get(
        f"{API}/analytics/students/no-such-user",
        headers=hdr(analytics_seed["adm_tok"]), timeout=15,
    )
    assert r.status_code == 404


# ----------------- /analytics/groups/{id}/compare ---------------------------

def test_compare_unauth(analytics_seed):
    r = requests.get(f"{API}/analytics/groups/{analytics_seed['g1_id']}/compare", timeout=15)
    assert r.status_code == 401


def test_compare_student_forbidden(analytics_seed):
    r = requests.get(
        f"{API}/analytics/groups/{analytics_seed['g1_id']}/compare",
        headers=hdr(analytics_seed["s1_tok"]), timeout=15,
    )
    assert r.status_code == 403


def test_compare_teacher_own_group_ok(analytics_seed):
    r = requests.get(
        f"{API}/analytics/groups/{analytics_seed['g1_id']}/compare",
        headers=hdr(analytics_seed["t1_tok"]), timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["group_id"] == analytics_seed["g1_id"]
    assert data["student_count"] == 2
    comps = data["comparisons"]
    assert len(comps) == 2
    # Sorted desc by idec_score: s1 (82) before s2 (70)
    assert comps[0]["user_id"] == analytics_seed["s1_uid"]
    assert comps[0]["idec_score"] == 82.0
    assert comps[0]["simulations"] == 2
    assert comps[0]["completed_simulations"] == 1
    assert comps[0]["evaluations"] == 1
    assert comps[1]["user_id"] == analytics_seed["s2_uid"]


def test_compare_teacher_other_group_forbidden(analytics_seed):
    r = requests.get(
        f"{API}/analytics/groups/{analytics_seed['g2_id']}/compare",
        headers=hdr(analytics_seed["t1_tok"]), timeout=15,
    )
    assert r.status_code == 403


def test_compare_group_not_found(analytics_seed):
    r = requests.get(
        f"{API}/analytics/groups/nope-xxx/compare",
        headers=hdr(analytics_seed["adm_tok"]), timeout=15,
    )
    assert r.status_code == 404
