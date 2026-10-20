from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import AuditLog, User
from app.api.deps import get_current_super_admin

router = APIRouter(prefix="/admin/audit-logs", tags=["Audit Logs"])

@router.get("")
def list_audit_logs(
    limit: int = 50,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "user_name": l.user.name if l.user else "System",
            "user_role": l.user.role if l.user else "System",
            "action": l.action,
            "entity": l.entity,
            "entity_id": l.entity_id,
            "details": l.details,
            "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else "N/A"
        })
    return results
