# models.py
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from bson import ObjectId
from database import CustomObjectId # Importamos el ayudante

# Modelo Producto
class ProductBase(BaseModel):
    name: str
    type: str = Field(..., min_length=1)
    price: int = Field(..., gt=0)
    description: str
    image: str
    alcohol: float = Field(..., ge=0.0, le=20.0)

class ProductResponse(ProductBase):
    id: CustomObjectId
    
    class Config:
        json_encoders = {
            ObjectId: lambda oid: str(oid)
        }
        allow_population_by_field_name = True

class ProductCreate(ProductBase):
    pass

# --- Modelos de Autenticación ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserResponse(BaseModel):
    id: CustomObjectId
    name: str
    email: EmailStr
    
    class Config:
        json_encoders = {
            ObjectId: lambda oid: str(oid)
        }

class UserInDB(BaseModel):
    id: Optional[ObjectId] = Field(None, alias="_id")
    name: str
    email: EmailStr
    hashed_password: str
    login_attempts: int = 0
    blocked: bool = False
    
    class Config:
        json_encoders = {
            ObjectId: lambda oid: str(oid)
        }
        allow_population_by_field_name = True