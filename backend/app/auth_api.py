"""SIH PS 26014 — RBAC: Citizen / Government Officer / Administrator, JWT-based.

Three fixed demo accounts for the prototype (see docs/SIH_PS_26014.md demo
credentials). Not a real user-management system — passwords are plaintext
constants for demo purposes only, never do this in production.
"""
from __future__ import annotations

import datetime
import os

import jwt
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.environ.get("JWT_SECRET", "landstack-prototype-secret-do-not-use-in-production")
JWT_ALGO = "HS256"
TOKEN_TTL_HOURS = 8

DEMO_USERS = {
    "citizen": {"password": "citizen123", "role": "citizen", "name": "Rahul Sharma"},
    "officer": {"password": "officer123", "role": "officer", "name": "Amit Sharma (Revenue Dept.)"},
    "admin": {"password": "admin123", "role": "admin", "name": "System Administrator"},
}


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: LoginRequest):
    user = DEMO_USERS.get(body.username)
    if not user or user["password"] != body.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    payload = {
        "sub": body.username,
        "role": user["role"],
        "name": user["name"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_TTL_HOURS),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
    return {"access_token": token, "token_type": "bearer", "username": body.username,
            "role": user["role"], "name": user["name"]}


@router.get("/demo-accounts")
def demo_accounts():
    """So the login screen can show available demo credentials without hardcoding them twice."""
    return {u: {"password": v["password"], "role": v["role"], "name": v["name"]} for u, v in DEMO_USERS.items()}


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def require_role(*allowed_roles: str):
    def _dependency(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail=f"Requires one of roles: {', '.join(allowed_roles)}")
        return user
    return _dependency
