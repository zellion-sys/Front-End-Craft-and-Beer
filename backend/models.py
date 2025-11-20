# models.py
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from bson import ObjectId
from datetime import datetime

# --- Ayudante ObjectId ---
class CustomObjectId(str):
    @classmethod
    def __get_validators__(cls): yield cls.validate
    @classmethod
    def validate(cls, v):
        if not isinstance(v, str): raise TypeError('String required')
        try: ObjectId(v); return v
        except: raise ValueError('Invalid ObjectId')

# --- Modelos de Usuario (Seguridad) ---
class UserLogin(BaseModel): email: EmailStr; password: str
class UserRegister(BaseModel): name: str; email: EmailStr; password: str = Field(..., min_length=8)

class UserResponse(BaseModel):
    id: CustomObjectId = Field(None, alias="_id")
    name: str; email: EmailStr
    class Config: allow_population_by_field_name = True; json_encoders = {ObjectId: str}

class UserInDB(UserResponse):
    hashed_password: str
    login_attempts: int = 0
    blocked: bool = False

# --- Modelo Producto ---
class ProductBase(BaseModel):
    name: str; type: str; price: int = Field(..., gt=0); description: str; image: str; alcohol: float
class ProductResponse(ProductBase):
    id: CustomObjectId
    class Config: json_encoders = {ObjectId: str}; allow_population_by_field_name = True

# --- Modelo Pedido ---
class OrderItem(BaseModel):
    product_id: CustomObjectId; name: str; price: int; quantity: int = Field(1, gt=0)

class Order(BaseModel):
    user_email: str
    total_amount: int
    items: List[OrderItem]
    status: str = "PENDING"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    class Config: json_encoders = {ObjectId: str}; allow_population_by_field_name = True