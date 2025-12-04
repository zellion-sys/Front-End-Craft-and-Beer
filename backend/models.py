from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from typing import Optional, List, Annotated
from bson import ObjectId
from datetime import datetime

PyObjectId = Annotated[str, BeforeValidator(str)]

# --- AUTH ---
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

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# --- PRODUCTOS ---
class ProductBase(BaseModel):
    name: str
    type: str
    price: int = Field(..., gt=0)
    description: str
    image: str
    alcohol: float
    rating: float = Field(5.0)
    reviews: int = Field(0)

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# --- PEDIDOS (CON DIRECCIÓN) ---
class OrderItem(BaseModel):
    product_id: str
    name: str
    price: int
    quantity: int = Field(1, gt=0)

class Order(BaseModel):
    user_email: str
    address: str = Field("Retiro en tienda") # <--- CAMPO CRÍTICO AGREGADO
    total_amount: int
    items: List[OrderItem]
    status: str = "PAGADO"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class OrderResponse(Order):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)