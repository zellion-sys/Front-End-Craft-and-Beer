# backend/models.py
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from typing import Optional, List, Annotated
from bson import ObjectId
from datetime import datetime

# --- Ayudante ObjectId ---
PyObjectId = Annotated[str, BeforeValidator(str)]

# --- Modelos de Usuario ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    email: EmailStr
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class UserInDB(UserResponse):
    hashed_password: str
    login_attempts: int = 0
    blocked: bool = False

# --- Modelos de Producto ---
class ProductBase(BaseModel):
    name: str
    type: str
    price: int = Field(..., gt=0)
    description: str
    image: str
    alcohol: float

# Modelo para CREAR (Lo que mandas desde el frontend/postman)
class ProductCreate(ProductBase):
    pass

# Modelo para LEER (Lo que devuelve la API con ID)
class ProductResponse(ProductBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# --- Modelos de Pedido ---
class OrderItem(BaseModel):
    product_id: str
    name: str
    price: int
    quantity: int = Field(1, gt=0)

class Order(BaseModel):
    user_email: str
    total_amount: int
    items: List[OrderItem]
    status: str = "PAGADO" # Simulamos que ya pasó por Webpay
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class OrderResponse(Order):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)