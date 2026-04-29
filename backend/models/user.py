import re
from pydantic import BaseModel, EmailStr, field_validator


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required.")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_rules(cls, v: str) -> str:
        if len(v) < 4:
            raise ValueError("Password must be at least 4 characters.")
        if not re.match(r"^[\x20-\x7E]+$", v):
            raise ValueError("Password must contain English characters only.")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    access_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr
    redirect_to: str = ""


class PasswordChange(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_rules(cls, v: str) -> str:
        if len(v) < 4:
            raise ValueError("Password must be at least 4 characters.")
        if not re.match(r"^[\x20-\x7E]+$", v):
            raise ValueError("Password must contain English characters only.")
        return v
