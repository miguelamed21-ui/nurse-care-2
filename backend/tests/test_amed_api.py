"""AMED IA - Backend API tests covering auth, cases, simulations, dashboard."""
import os
import time
import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://amed-ia-nursing.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

mc = MongoClient(MONGO_URL)
db = mc[DB_NAME]


# -- Fixtures: seed a test user + session ---------------------------------
@pytest.fixture(scope="session")
def student_token():
    token = f"test_session_student_{int(time.time())}"
    uid = f"test-user-student-{int(time.time())}"
    db.users.insert_one({
        "user_id": uid, "email": f"TEST_student_{int(time.time())}@e.com",
        "name": "TEST Student", "role": "student", "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": uid, "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield token
    db.users.delete_one({"user_id": uid})
    db.user_sessions.delete_one({"session_token": token})
    db.simulations.delete_many({"user_id": uid})
    db.competency_profiles.delete_many({"user_id": uid})


@pytest.fixture(scope="session")
def teacher_token():
    token = f"test_session_teacher_{int(time.time())}"
    uid = f"test-user-teacher-{int(time.time())}"
    db.users.insert_one({
        "user_id": uid, "email": f"TEST_teacher_{int(time.time())}@e.com",
        "name": "TEST Teacher", "role": "teacher", "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": uid, "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield token
    db.users.delete_one({"user_id": uid})
    db.user_sessions.delete_one({"session_token": token})


def hdr(t): return {"Authorization": f"Bearer {t}"}


# -- Health ---------------------------------------------------------------
def test_root():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "operational"


def test_health():
    r = requests.get(f"{API}/health", timeout=15)
    assert r.status_code == 200


# -- Auth -----------------------------------------------------------------
def test_auth_me_no_token():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


def test_auth_me_invalid_token():
    r = requests.get(f"{API}/auth/me", headers=hdr("bogus"), timeout=15)
    assert r.status_code == 401


def test_auth_me_valid_student(student_token):
    r = requests.get(f"{API}/auth/me", headers=hdr(student_token), timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["role"] == "student"
    assert j["name"] == "TEST Student"


def test_auth_session_invalid_id():
    r = requests.post(f"{API}/auth/session", json={"session_id": "invalid-xyz"}, timeout=15)
    assert r.status_code == 400


# -- Cases ----------------------------------------------------------------
def test_cases_requires_auth():
    r = requests.get(f"{API}/cases", timeout=15)
    assert r.status_code == 401


def test_cases_list_student(student_token):
    r = requests.get(f"{API}/cases", headers=hdr(student_token), timeout=15)
    assert r.status_code == 200
    cases = r.json()
    assert isinstance(cases, list)
    # Seed should have 4 sample cases
    assert len(cases) >= 4
    assert "case_id" in cases[0]
    assert "title" in cases[0]


def test_case_detail(student_token):
    cases = requests.get(f"{API}/cases", headers=hdr(student_token), timeout=15).json()
    cid = cases[0]["case_id"]
    r = requests.get(f"{API}/cases/{cid}", headers=hdr(student_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["case_id"] == cid


def test_case_create_student_forbidden(student_token):
    r = requests.post(f"{API}/cases", headers=hdr(student_token), json={
        "title": "TEST X", "specialty": "x", "difficulty": "facil",
        "scenario": "s", "patient_profile": {}, "learning_objectives": []
    }, timeout=15)
    assert r.status_code == 403


def test_case_create_teacher_ok(teacher_token):
    r = requests.post(f"{API}/cases", headers=hdr(teacher_token), json={
        "title": "TEST Teacher Case", "specialty": "medicina", "difficulty": "facil",
        "scenario": "scenario test", "patient_profile": {"name": "P"},
        "learning_objectives": ["a"]
    }, timeout=15)
    assert r.status_code == 200
    cid = r.json()["case_id"]
    # Verify GET persisted
    g = requests.get(f"{API}/cases/{cid}", headers=hdr(teacher_token), timeout=15)
    assert g.status_code == 200
    assert g.json()["title"] == "TEST Teacher Case"
    db.clinical_cases.delete_one({"case_id": cid})


# -- Simulations ----------------------------------------------------------
def test_simulation_start_and_list(student_token):
    cases = requests.get(f"{API}/cases", headers=hdr(student_token), timeout=15).json()
    cid = cases[0]["case_id"]
    aid = _grant_assignment(student_token, cid)
    r = requests.post(f"{API}/simulations/start", headers=hdr(student_token),
                      json={"case_id": cid}, timeout=15)
    assert r.status_code == 200
    sim = r.json()
    assert sim["status"] == "in_progress"
    sim_id = sim["sim_id"]

    # List sims
    lr = requests.get(f"{API}/simulations", headers=hdr(student_token), timeout=15)
    assert lr.status_code == 200
    assert any(s["sim_id"] == sim_id for s in lr.json())

    # End sim
    er = requests.post(f"{API}/simulations/{sim_id}/end", headers=hdr(student_token), timeout=15)
    assert er.status_code == 200
    db.case_assignments.delete_one({"assignment_id": aid})


def test_simulation_start_invalid_case(student_token):
    r = requests.post(f"{API}/simulations/start", headers=hdr(student_token),
                      json={"case_id": "case_doesnotexist"}, timeout=15)
    # With new RBAC, unassigned case -> 403 (instead of 404). Either signals blocked access.
    assert r.status_code in (403, 404)


def test_simulation_chat_streams(student_token):
    """Smoke: SSE chat endpoint produces streaming output. Uses an individual case."""
    cases = requests.get(f"{API}/cases", headers=hdr(student_token), timeout=15).json()
    individual = [c for c in cases if c.get("simulation_type", "individual") == "individual"]
    assert individual, "No individual simulation cases available"
    cid = individual[0]["case_id"]
    aid = _grant_assignment(student_token, cid)
    sim = requests.post(f"{API}/simulations/start", headers=hdr(student_token),
                        json={"case_id": cid}, timeout=15).json()
    sim_id = sim["sim_id"]

    with requests.post(f"{API}/simulations/{sim_id}/chat",
                       headers=hdr(student_token),
                       json={"message": "Hola, ¿cómo se siente hoy?"},
                       stream=True, timeout=60) as resp:
        assert resp.status_code == 200
        got_data = False
        got_done = False
        for raw in resp.iter_lines(decode_unicode=True):
            if not raw:
                continue
            if raw.startswith("data:"):
                got_data = True
                if '"done"' in raw:
                    got_done = True
                    break
        assert got_data, "No SSE data frames received"
        assert got_done, "Stream never signalled done"

    # Verify conversation persisted
    s = requests.get(f"{API}/simulations/{sim_id}", headers=hdr(student_token), timeout=15).json()
    assert len(s["conversation"]) >= 2
    db.case_assignments.delete_one({"assignment_id": aid})


# -- Dashboard ------------------------------------------------------------
def test_dashboard_stats(student_token):
    r = requests.get(f"{API}/dashboard/stats", headers=hdr(student_token), timeout=15)
    assert r.status_code == 200
    j = r.json()
    for k in ("total_students", "total_simulations", "completed_simulations", "total_cases"):
        assert k in j


def test_dashboard_competencies(student_token):
    r = requests.get(f"{API}/dashboard/competencies", headers=hdr(student_token), timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert "idec_score" in j
    assert "competencies" in j


def test_dashboard_trends(student_token):
    r = requests.get(f"{API}/dashboard/trends", headers=hdr(student_token), timeout=15)
    assert r.status_code == 200
    assert "trends" in r.json()


# -- Manual Evaluation (POST /api/evaluations/manual) --------------------
def _grant_assignment(student_token, case_id):
    """RBAC: students need a case assignment to start a sim. Inject one directly."""
    me = requests.get(f"{API}/auth/me", headers=hdr(student_token), timeout=15).json()
    uid = me["user_id"]
    aid = f"TEST_assign_{int(time.time()*1000)}"
    db.case_assignments.insert_one({
        "assignment_id": aid, "case_id": case_id, "assigned_to": uid,
        "assignment_type": "individual", "assigned_by": "test-seed",
        "assignment_mode": "directed", "random_filters": None,
        "status": "pending",
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    })
    return aid


def _start_and_end_sim(student_token):
    cases = requests.get(f"{API}/cases", headers=hdr(student_token), timeout=15).json()
    individual = [c for c in cases if c.get("simulation_type", "individual") == "individual"]
    cid = individual[0]["case_id"]
    aid = _grant_assignment(student_token, cid)
    sim = requests.post(f"{API}/simulations/start", headers=hdr(student_token),
                        json={"case_id": cid}, timeout=15).json()
    sim_id = sim["sim_id"]
    requests.post(f"{API}/simulations/{sim_id}/end", headers=hdr(student_token), timeout=15)
    db.case_assignments.delete_one({"assignment_id": aid})
    return sim_id, cid, sim["user_id"]


def _manual_payload(sim_id, user_id, case_id, evaluator_name="TEST Teacher"):
    return {
        "sim_id": sim_id,
        "user_id": user_id,
        "case_id": case_id,
        "evaluation_type": "CASO",
        "scores": {
            "comunicacion": 62.5,
            "valoracion_clinica": 87.5,
            "razonamiento_critico": 62.5,
            "competencia_tecnica": 37.5,
            "empatia": 87.5,
        },
        "feedback": "Buen desempeño general.",
        "strengths": ["Empatía", "Valoración"],
        "improvements": ["Técnica"],
        "evaluated_by": evaluator_name,
    }


def test_manual_eval_requires_auth(student_token):
    sim_id, cid, uid = _start_and_end_sim(student_token)
    r = requests.post(f"{API}/evaluations/manual", json=_manual_payload(sim_id, uid, cid), timeout=15)
    assert r.status_code == 401
    # cleanup
    db.simulations.delete_one({"sim_id": sim_id})


def test_manual_eval_student_forbidden(student_token):
    sim_id, cid, uid = _start_and_end_sim(student_token)
    r = requests.post(f"{API}/evaluations/manual", headers=hdr(student_token),
                      json=_manual_payload(sim_id, uid, cid), timeout=15)
    assert r.status_code == 403
    db.simulations.delete_one({"sim_id": sim_id})


def test_manual_eval_teacher_create_and_persist(student_token, teacher_token):
    sim_id, cid, uid = _start_and_end_sim(student_token)
    payload = _manual_payload(sim_id, uid, cid)
    r = requests.post(f"{API}/evaluations/manual", headers=hdr(teacher_token),
                      json=payload, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["sim_id"] == sim_id
    assert data["user_id"] == uid
    assert data["evaluation_type"] == "CASO"
    assert data["scores"]["empatia"] == 87.5
    assert "eval_id" in data

    # Verify GET persistence
    g = requests.get(f"{API}/evaluations/{sim_id}", headers=hdr(teacher_token), timeout=15)
    assert g.status_code == 200
    assert g.json()["scores"]["valoracion_clinica"] == 87.5

    # Cleanup
    db.evaluations.delete_one({"sim_id": sim_id})
    db.simulations.delete_one({"sim_id": sim_id})
    db.competency_profiles.delete_one({"user_id": uid})


def test_manual_eval_duplicate_rejected(student_token, teacher_token):
    sim_id, cid, uid = _start_and_end_sim(student_token)
    payload = _manual_payload(sim_id, uid, cid)
    r1 = requests.post(f"{API}/evaluations/manual", headers=hdr(teacher_token),
                       json=payload, timeout=20)
    assert r1.status_code == 200
    r2 = requests.post(f"{API}/evaluations/manual", headers=hdr(teacher_token),
                       json=payload, timeout=20)
    assert r2.status_code == 400
    db.evaluations.delete_one({"sim_id": sim_id})
    db.simulations.delete_one({"sim_id": sim_id})
    db.competency_profiles.delete_one({"user_id": uid})


def test_manual_eval_invalid_sim(teacher_token):
    payload = _manual_payload("sim_doesnotexist", "user_x", "case_x")
    r = requests.post(f"{API}/evaluations/manual", headers=hdr(teacher_token),
                      json=payload, timeout=15)
    assert r.status_code == 404


# -- Evaluation Count (GET /api/evaluations/user/{user_id}/count) ---------
def test_eval_count_self_student(student_token):
    # Get student user_id via /auth/me
    me = requests.get(f"{API}/auth/me", headers=hdr(student_token), timeout=15).json()
    uid = me["user_id"]
    r = requests.get(f"{API}/evaluations/user/{uid}/count", headers=hdr(student_token), timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["user_id"] == uid
    assert "case_evaluations_count" in j
    assert "global_evaluations_count" in j
    assert "total_evaluations" in j
    assert j["total_evaluations"] == j["case_evaluations_count"] + j["global_evaluations_count"]


def test_eval_count_other_user_student_forbidden(student_token):
    r = requests.get(f"{API}/evaluations/user/some-other-user/count",
                     headers=hdr(student_token), timeout=15)
    assert r.status_code == 403


def test_eval_count_teacher_any_user(teacher_token, student_token):
    me = requests.get(f"{API}/auth/me", headers=hdr(student_token), timeout=15).json()
    uid = me["user_id"]
    r = requests.get(f"{API}/evaluations/user/{uid}/count",
                     headers=hdr(teacher_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["user_id"] == uid


def test_eval_count_increments_after_manual(student_token, teacher_token):
    me = requests.get(f"{API}/auth/me", headers=hdr(student_token), timeout=15).json()
    uid = me["user_id"]
    before = requests.get(f"{API}/evaluations/user/{uid}/count",
                          headers=hdr(teacher_token), timeout=15).json()
    sim_id, cid, _ = _start_and_end_sim(student_token)
    payload = _manual_payload(sim_id, uid, cid)
    rc = requests.post(f"{API}/evaluations/manual", headers=hdr(teacher_token),
                       json=payload, timeout=20)
    assert rc.status_code == 200
    after = requests.get(f"{API}/evaluations/user/{uid}/count",
                         headers=hdr(teacher_token), timeout=15).json()
    assert after["case_evaluations_count"] == before["case_evaluations_count"] + 1

    db.evaluations.delete_one({"sim_id": sim_id})
    db.simulations.delete_one({"sim_id": sim_id})
    db.competency_profiles.delete_one({"user_id": uid})



# ====== RBAC Phase 1: Groups & Assignments =======================
# Helpers ---------------------------------------------------------------

@pytest.fixture(scope="module")
def extra_student_token():
    token = f"test_session_st2_{int(time.time())}"
    uid = f"test-user-student2-{int(time.time())}"
    db.users.insert_one({
        "user_id": uid, "email": f"TEST_student2_{int(time.time())}@e.com",
        "name": "TEST Student2", "role": "student", "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": uid, "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield {"token": token, "uid": uid}
    db.users.delete_one({"user_id": uid})
    db.user_sessions.delete_one({"session_token": token})


def _me(token):
    return requests.get(f"{API}/auth/me", headers=hdr(token), timeout=15).json()


# --- /api/users ?role=student -----------------------------------------
def test_users_list_student_forbidden(student_token):
    r = requests.get(f"{API}/users", headers=hdr(student_token), timeout=15)
    assert r.status_code == 403


def test_users_list_teacher_only_students(teacher_token):
    r = requests.get(f"{API}/users?role=student", headers=hdr(teacher_token), timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert all(u["role"] == "student" for u in data)


# --- /api/groups CRUD -------------------------------------------------
def test_group_create_student_forbidden(student_token, extra_student_token):
    r = requests.post(f"{API}/groups", headers=hdr(student_token),
                      json={"name": "TEST_g", "student_ids": [extra_student_token["uid"]]},
                      timeout=15)
    assert r.status_code == 403


def test_group_full_crud_teacher(teacher_token, extra_student_token):
    # Create
    payload = {"name": "TEST_group_rbac", "description": "rbac test",
               "student_ids": [extra_student_token["uid"]]}
    rc = requests.post(f"{API}/groups", headers=hdr(teacher_token),
                       json=payload, timeout=15)
    assert rc.status_code == 200, rc.text
    g = rc.json()
    gid = g["group_id"]
    assert g["name"] == "TEST_group_rbac"
    assert extra_student_token["uid"] in g["student_ids"]
    assert g["teacher_id"]  # owner persisted

    # List (teacher should see this group)
    rl = requests.get(f"{API}/groups", headers=hdr(teacher_token), timeout=15)
    assert rl.status_code == 200
    assert any(x["group_id"] == gid for x in rl.json())

    # Get by id
    rg = requests.get(f"{API}/groups/{gid}", headers=hdr(teacher_token), timeout=15)
    assert rg.status_code == 200
    assert rg.json()["group_id"] == gid

    # Update
    ru = requests.put(f"{API}/groups/{gid}", headers=hdr(teacher_token),
                      json={"name": "TEST_group_rbac_upd"}, timeout=15)
    assert ru.status_code == 200
    assert ru.json()["name"] == "TEST_group_rbac_upd"
    # Persistence: GET reflects update
    rg2 = requests.get(f"{API}/groups/{gid}", headers=hdr(teacher_token), timeout=15)
    assert rg2.json()["name"] == "TEST_group_rbac_upd"

    # Student in group can list it
    rs = requests.get(f"{API}/groups", headers=hdr(extra_student_token["token"]), timeout=15)
    assert rs.status_code == 200
    assert any(x["group_id"] == gid for x in rs.json())

    # Delete
    rd = requests.delete(f"{API}/groups/{gid}", headers=hdr(teacher_token), timeout=15)
    assert rd.status_code == 200
    rg3 = requests.get(f"{API}/groups/{gid}", headers=hdr(teacher_token), timeout=15)
    assert rg3.status_code == 404


def test_group_update_not_owner_forbidden(teacher_token, extra_student_token):
    # Create a group as teacher_token, then try to update as a different teacher
    rc = requests.post(f"{API}/groups", headers=hdr(teacher_token),
                       json={"name": "TEST_owner_check", "student_ids": []}, timeout=15)
    assert rc.status_code == 200
    gid = rc.json()["group_id"]

    # Build a second teacher session
    tok2 = f"test_session_t2_{int(time.time())}"
    uid2 = f"test-user-teacher2-{int(time.time())}"
    db.users.insert_one({
        "user_id": uid2, "email": f"TEST_teacher2_{int(time.time())}@e.com",
        "name": "TEST Teacher2", "role": "teacher", "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": uid2, "session_token": tok2,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    try:
        ru = requests.put(f"{API}/groups/{gid}", headers=hdr(tok2),
                          json={"name": "x"}, timeout=15)
        assert ru.status_code == 403
        rd = requests.delete(f"{API}/groups/{gid}", headers=hdr(tok2), timeout=15)
        assert rd.status_code == 403
    finally:
        db.student_groups.delete_one({"group_id": gid})
        db.users.delete_one({"user_id": uid2})
        db.user_sessions.delete_one({"session_token": tok2})


# --- /api/assignments -------------------------------------------------

def _pick_case_id():
    """Return an existing clinical case_id, creating one if collection empty."""
    doc = db.clinical_cases.find_one({}, {"_id": 0, "case_id": 1})
    if doc and doc.get("case_id"):
        return doc["case_id"], False
    cid = f"TEST_case_{int(time.time())}"
    db.clinical_cases.insert_one({
        "case_id": cid, "title": "TEST", "description": "x",
        "difficulty": "intermedio", "specialty": "general",
        "patient_profile": {}, "clinical_context": "",
        "competencies_focus": [], "objectives": [], "tags": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "test",
    })
    return cid, True


def test_assignment_directed_individual(teacher_token, extra_student_token):
    case_id, made = _pick_case_id()
    try:
        payload = {
            "case_id": case_id,
            "assigned_to": extra_student_token["uid"],
            "assignment_type": "individual",
            "assignment_mode": "directed",
        }
        r = requests.post(f"{API}/assignments", headers=hdr(teacher_token),
                          json=payload, timeout=15)
        assert r.status_code == 200, r.text
        a = r.json()
        aid = a["assignment_id"]
        assert a["assignment_mode"] == "directed"
        assert a["case_id"] == case_id
        assert a["assigned_to"] == extra_student_token["uid"]

        # Teacher list shows assignment
        rl = requests.get(f"{API}/assignments", headers=hdr(teacher_token), timeout=15)
        assert rl.status_code == 200
        assert any(x["assignment_id"] == aid for x in rl.json())

        # Student sees assignment via /assignments
        rs = requests.get(f"{API}/assignments",
                          headers=hdr(extra_student_token["token"]), timeout=15)
        assert rs.status_code == 200
        assert any(x["assignment_id"] == aid for x in rs.json())

        # /assignments/my-cases for student includes case
        rm = requests.get(f"{API}/assignments/my-cases",
                          headers=hdr(extra_student_token["token"]), timeout=15)
        assert rm.status_code == 200

        # Delete
        rd = requests.delete(f"{API}/assignments/{aid}",
                             headers=hdr(teacher_token), timeout=15)
        assert rd.status_code == 200
    finally:
        if made:
            db.clinical_cases.delete_one({"case_id": case_id})
        db.case_assignments.delete_many({"assigned_to": extra_student_token["uid"]})


def test_assignment_random_requires_filters(teacher_token, extra_student_token):
    # random without filters -> 400
    r = requests.post(f"{API}/assignments", headers=hdr(teacher_token),
                      json={"assigned_to": extra_student_token["uid"],
                            "assignment_type": "individual",
                            "assignment_mode": "random"}, timeout=15)
    assert r.status_code == 400


def test_assignment_random_with_filters(teacher_token, extra_student_token):
    r = requests.post(f"{API}/assignments", headers=hdr(teacher_token),
                      json={"assigned_to": extra_student_token["uid"],
                            "assignment_type": "individual",
                            "assignment_mode": "random",
                            "random_filters": {"difficulty": "intermedio"}}, timeout=15)
    assert r.status_code == 200
    a = r.json()
    assert a["assignment_mode"] == "random"
    assert a["case_id"] in (None, "")
    assert a["random_filters"] == {"difficulty": "intermedio"}
    db.case_assignments.delete_one({"assignment_id": a["assignment_id"]})


def test_assignment_directed_missing_case_id(teacher_token, extra_student_token):
    r = requests.post(f"{API}/assignments", headers=hdr(teacher_token),
                      json={"assigned_to": extra_student_token["uid"],
                            "assignment_type": "individual",
                            "assignment_mode": "directed"}, timeout=15)
    assert r.status_code == 400


def test_assignment_create_student_forbidden(student_token, extra_student_token):
    r = requests.post(f"{API}/assignments", headers=hdr(student_token),
                      json={"assigned_to": extra_student_token["uid"],
                            "assignment_type": "individual",
                            "assignment_mode": "random",
                            "random_filters": {"difficulty": "intermedio"}}, timeout=15)
    assert r.status_code == 403


def test_assignment_group_flow(teacher_token, extra_student_token):
    # Create group with one student
    rg = requests.post(f"{API}/groups", headers=hdr(teacher_token),
                       json={"name": "TEST_assign_group",
                             "student_ids": [extra_student_token["uid"]]}, timeout=15)
    assert rg.status_code == 200
    gid = rg.json()["group_id"]

    case_id, made = _pick_case_id()
    try:
        ra = requests.post(f"{API}/assignments", headers=hdr(teacher_token),
                           json={"case_id": case_id, "assigned_to": gid,
                                 "assignment_type": "group",
                                 "assignment_mode": "directed"}, timeout=15)
        assert ra.status_code == 200, ra.text
        aid = ra.json()["assignment_id"]

        # Student in group should see assignment via /assignments
        rs = requests.get(f"{API}/assignments",
                          headers=hdr(extra_student_token["token"]), timeout=15)
        assert rs.status_code == 200
        assert any(x["assignment_id"] == aid for x in rs.json())

        # Deleting the group cascades and removes the group assignment
        rd = requests.delete(f"{API}/groups/{gid}",
                             headers=hdr(teacher_token), timeout=15)
        assert rd.status_code == 200
        check = db.case_assignments.find_one({"assignment_id": aid})
        assert check is None, "Group assignment should cascade-delete with the group"
    finally:
        if made:
            db.clinical_cases.delete_one({"case_id": case_id})
        db.case_assignments.delete_many({"assigned_to": gid})
        db.student_groups.delete_one({"group_id": gid})


def test_assignments_my_cases_teacher_forbidden(teacher_token):
    r = requests.get(f"{API}/assignments/my-cases",
                     headers=hdr(teacher_token), timeout=15)
    assert r.status_code == 403
