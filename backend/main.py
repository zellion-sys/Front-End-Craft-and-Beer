# backend/main.py
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from models import ProductResponse, ProductCreate, UserRegister, UserLogin, UserResponse, UserInDB, Order, OrderResponse
from database import connect_to_mongo, close_mongo_connection, get_products_collection, get_users_collection, get_orders_collection, seed_data
from auth import verify_password, get_password_hash, create_access_token, get_current_user_email
from datetime import timedelta
import re

app = FastAPI(title="Cervecería Craft API", version="3.0.0")

# CORS: Permitir todo para evitar problemas en la demo
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await connect_to_mongo()
    await seed_data()

@app.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()

# --- AUTH ---
@app.post("/api/auth/register", response_model=UserResponse)
async def register(user: UserRegister):
    coll = get_users_collection()
    if await coll.find_one({"email": user.email}):
        raise HTTPException(400, "Email ya registrado")
    user_dict = UserInDB(**user.dict(), hashed_password=get_password_hash(user.password)).dict(by_alias=True)
    res = await coll.insert_one(user_dict)
    return {**user.dict(), "id": str(res.inserted_id)}

@app.post("/api/auth/login")
async def login(user: UserLogin):
    coll = get_users_collection()
    db_user = await coll.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(401, "Credenciales inválidas")
    
    token = create_access_token({"sub": user.email}, timedelta(minutes=60))
    return {"access_token": token, "user": {"name": db_user["name"], "email": db_user["email"]}}

# --- PRODUCTOS ---
@app.get("/api/products", response_model=List[ProductResponse])
async def get_products(type: str = None, max_price: int = None, search: str = None):
    query = {}
    if type: query["type"] = type
    if max_price: query["price"] = {"$lte": max_price}
    if search:
        regex = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [{"name": regex}, {"description": regex}]
    
    return await get_products_collection().find(query).to_list(100)

# NUEVO: Endpoint para CREAR productos (Para que llenes tu DB)
@app.post("/api/products", status_code=201)
async def create_product(product: ProductCreate):
    res = await get_products_collection().insert_one(product.dict())
    return {"id": str(res.inserted_id), "message": "Producto creado"}

# --- PEDIDOS ---
@app.post("/api/checkout", status_code=201)
async def checkout(order: Order, email: str = Depends(get_current_user_email)):
    order.user_email = email # Asegurar que el pedido sea del usuario logueado
    res = await get_orders_collection().insert_one(order.dict(by_alias=True))
    return {"order_id": str(res.inserted_id), "message": "Pedido guardado"}

# NUEVO: Endpoint para VER MIS PEDIDOS (Para demostrar integración en el video)
@app.get("/api/orders/me", response_model=List[OrderResponse])
async def my_orders(email: str = Depends(get_current_user_email)):
    return await get_orders_collection().find({"user_email": email}).to_list(100)