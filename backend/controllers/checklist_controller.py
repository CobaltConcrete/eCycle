from fastapi import APIRouter
from fastapi.responses import JSONResponse

from auth import CurrentUser, require_owner
from database import Database
from models import ChecklistOptionTable, UserChecklistTable
from schemas import ChecklistInput

router = APIRouter()


@router.get("/checklist-options")
def get_checklist_options(session: Database):
    options = session.query(ChecklistOptionTable).all()
    return JSONResponse(
        [
            {
                "checklistoptionid": option.checklistoptionid,
                "checklistoptiontype": option.checklistoptiontype,
            }
            for option in options
        ],
        status_code=200,
    )


@router.post("/user-checklist", status_code=201)
def save_user_checklist(user: CurrentUser, payload: ChecklistInput, session: Database):
    require_owner(user, payload.userid)
    data = payload.model_dump()
    userid = data["userid"]
    checklistoptionids = data["checklistoptionids"]
    session.query(UserChecklistTable).filter_by(userid=userid).delete()
    for checklistoptionid in checklistoptionids:
        user_checklist = UserChecklistTable(
            userid=userid, checklistoptionid=checklistoptionid
        )
        session.add(user_checklist)
    session.commit()
    return JSONResponse(
        {"message": "Checklist options saved successfully"}, status_code=201
    )
