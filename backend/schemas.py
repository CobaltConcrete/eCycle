"""Validated API inputs. Numeric ID strings remain accepted for the React client."""

from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    BeforeValidator,
    Field,
    StringConstraints,
    field_validator,
)


def numeric(value):
    if isinstance(value, bool):
        raise ValueError("Boolean values are not coordinates or IDs")
    return value


def integer_id(value):
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        raise ValueError("An integer ID is required")
    return value


ID = Annotated[int, BeforeValidator(integer_id), Field(gt=0, le=2147483647)]
Latitude = Annotated[
    float, BeforeValidator(numeric), Field(ge=-90, le=90, allow_inf_nan=False)
]
Longitude = Annotated[
    float, BeforeValidator(numeric), Field(ge=-180, le=180, allow_inf_nan=False)
]
Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
ShortText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
]
DiscussionText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=10, max_length=255)
]
Action = Literal["repair", "dispose", "general"]


class UsernameInput(BaseModel):
    username: Name


class ChecklistInput(BaseModel):
    userid: ID
    checklistoptionids: list[ID] = Field(max_length=100)

    @field_validator("checklistoptionids")
    @classmethod
    def unique_options(cls, value):
        if len(value) != len(set(value)):
            raise ValueError("Checklist options must be unique")
        return value


class CoordinatesInput(BaseModel):
    lat: Latitude
    lon: Longitude


class NearbyInput(CoordinatesInput):
    userid: ID
    actiontype: Action


class AddressInput(BaseModel):
    address: ShortText


class DirectionsInput(BaseModel):
    user_location: CoordinatesInput
    destination: CoordinatesInput
    mode: Literal[
        "DRIVING",
        "WALKING",
        "BICYCLING",
        "TRANSIT",
        "driving",
        "walking",
        "bicycling",
        "transit",
    ] = "DRIVING"


class DirectionsResponse(BaseModel):
    directions: list[str]
    encodedPolyline: str = Field(min_length=1)
    distanceMeters: int = Field(ge=0, strict=True)
    duration: str = Field(pattern=r"^\d+(?:\.\d+)?s$")
    warnings: list[str] = Field(default_factory=list)
    description: str = ""


class ShopInput(BaseModel):
    userid: ID
    shopname: ShortText
    addressname: ShortText
    website: str | None = Field(default=None, max_length=255)
    actiontype: Action
    latitude: Latitude
    longtitude: Longitude  # Preserve the existing database/frontend spelling.


class ShopIdInput(BaseModel):
    shopid: ID


class HistoryInput(ShopIdInput):
    userid: ID


class ForumTextInput(BaseModel):
    forumtext: DiscussionText


class ForumInput(ForumTextInput):
    shopid: ID
    posterid: ID


class CommentTextInput(BaseModel):
    commenttext: DiscussionText


class CommentInput(CommentTextInput):
    forumid: ID
    posterid: ID
    encodedimage: str | None = Field(default=None, max_length=2_000_000)


class ReportInput(BaseModel):
    reporterid: ID


class ClassificationInput(BaseModel):
    commenttext: ShortText


class NearbyLocation(BaseModel):
    shopid: int
    shopname: str
    latitude: float
    longitude: float
    addressname: str
    website: str | None
    distance: float
