"""SIH PS 26014 — workflow / service-request tracking + audit trail (sections 13-14)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth_api import get_current_user, require_role
from app.db import get_connection

router = APIRouter(prefix="/api/workflows", tags=["workflow"])

STEP_NAMES = ["Land Records Verification", "Registration Verification", "Planning Verification", "Final Review"]


class CreateWorkflowRequest(BaseModel):
    ulpin: str
    citizen_name: str | None = None
    request_type: str = "Property Verification Request"


def _parcel_id_for_ulpin(cur, ulpin: str) -> int:
    cur.execute("SELECT internal_parcel_id FROM parcels WHERE ulpin = %(u)s", {"u": ulpin})
    row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=f"No parcel found with ULPIN {ulpin}")
    return row[0]


@router.post("")
def create_workflow(body: CreateWorkflowRequest, user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            parcel_id = _parcel_id_for_ulpin(cur, body.ulpin)
            cur.execute(
                """
                INSERT INTO workflows (parcel_id, request_type, status, citizen_name)
                VALUES (%(parcel_id)s, %(request_type)s, 'submitted', %(citizen_name)s)
                RETURNING workflow_id, created_at
                """,
                {"parcel_id": parcel_id, "request_type": body.request_type,
                 "citizen_name": body.citizen_name or user.get("name")},
            )
            workflow_id, created_at = cur.fetchone()
            for i, step_name in enumerate(STEP_NAMES):
                cur.execute(
                    "INSERT INTO workflow_steps (workflow_id, step_name, status) VALUES (%(wid)s, %(name)s, %(status)s)",
                    {"wid": workflow_id, "name": step_name, "status": "in_progress" if i == 0 else "pending"},
                )
            cur.execute(
                "INSERT INTO audit_log (parcel_id, officer_name, department, action, reason) "
                "VALUES (%(pid)s, %(name)s, 'Citizen Service', 'Workflow created', %(reason)s)",
                {"pid": parcel_id, "name": user.get("name", user.get("sub")),
                 "reason": f"{body.request_type} submitted"},
            )
        conn.commit()
    return get_workflow(workflow_id)


@router.get("")
def list_workflows(ulpin: str | None = Query(default=None), user: dict = Depends(get_current_user)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            if ulpin:
                parcel_id = _parcel_id_for_ulpin(cur, ulpin)
                cur.execute(
                    "SELECT workflow_id FROM workflows WHERE parcel_id = %(pid)s ORDER BY created_at DESC",
                    {"pid": parcel_id},
                )
            else:
                cur.execute("SELECT workflow_id FROM workflows ORDER BY created_at DESC LIMIT 50")
            ids = [r[0] for r in cur.fetchall()]
    return {"workflows": [get_workflow(i) for i in ids]}


@router.get("/{workflow_id}")
def get_workflow(workflow_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT w.workflow_id, w.parcel_id, p.ulpin, w.request_type, w.status,
                       w.citizen_name, w.created_at, w.updated_at
                FROM workflows w JOIN parcels p ON p.internal_parcel_id = w.parcel_id
                WHERE w.workflow_id = %(id)s
                """,
                {"id": workflow_id},
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="workflow not found")
            cur.execute(
                "SELECT step_id, step_name, status, updated_by, updated_at FROM workflow_steps "
                "WHERE workflow_id = %(id)s ORDER BY step_id",
                {"id": workflow_id},
            )
            steps = cur.fetchall()
    (wid, parcel_id, ulpin, request_type, status, citizen_name, created_at, updated_at) = row
    return {
        "workflow_id": wid, "ulpin": ulpin, "request_type": request_type, "status": status,
        "citizen_name": citizen_name, "created_at": created_at.isoformat(), "updated_at": updated_at.isoformat(),
        "steps": [
            {"step_id": s[0], "step_name": s[1], "status": s[2], "updated_by": s[3],
             "updated_at": s[4].isoformat() if s[4] else None}
            for s in steps
        ],
    }


class UpdateStepRequest(BaseModel):
    status: str  # pending | in_progress | completed


@router.patch("/{workflow_id}/steps/{step_id}")
def update_step(workflow_id: int, step_id: int, body: UpdateStepRequest,
                 user: dict = Depends(require_role("officer", "admin"))):
    if body.status not in ("pending", "in_progress", "completed"):
        raise HTTPException(status_code=400, detail="status must be pending, in_progress, or completed")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT step_name, status FROM workflow_steps WHERE step_id = %(sid)s AND workflow_id = %(wid)s",
                {"sid": step_id, "wid": workflow_id},
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="step not found")
            old_status = row[1]
            cur.execute(
                "UPDATE workflow_steps SET status = %(status)s, updated_by = %(by)s, updated_at = now() "
                "WHERE step_id = %(sid)s",
                {"status": body.status, "by": user.get("name", user.get("sub")), "sid": step_id},
            )
            # advance the next step to in_progress if this one was just completed
            if body.status == "completed":
                cur.execute(
                    "SELECT step_id FROM workflow_steps WHERE workflow_id = %(wid)s AND status = 'pending' "
                    "ORDER BY step_id LIMIT 1",
                    {"wid": workflow_id},
                )
                nxt = cur.fetchone()
                if nxt:
                    cur.execute("UPDATE workflow_steps SET status = 'in_progress' WHERE step_id = %(sid)s", {"sid": nxt[0]})
                else:
                    cur.execute("UPDATE workflows SET status = 'resolved', updated_at = now() WHERE workflow_id = %(wid)s",
                                {"wid": workflow_id})
            cur.execute("SELECT parcel_id FROM workflows WHERE workflow_id = %(wid)s", {"wid": workflow_id})
            parcel_id = cur.fetchone()[0]
            cur.execute(
                "INSERT INTO audit_log (parcel_id, officer_name, department, action, field_name, previous_value, new_value) "
                "VALUES (%(pid)s, %(name)s, 'Workflow', 'Step status updated', %(field)s, %(old)s, %(new)s)",
                {"pid": parcel_id, "name": user.get("name", user.get("sub")), "field": row[0],
                 "old": old_status, "new": body.status},
            )
        conn.commit()
    return get_workflow(workflow_id)
