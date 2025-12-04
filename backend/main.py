# backend/main.py - VERSIÓN CORREGIDA (FIX REGISTRO)
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
from bson import ObjectId
from models import *
from database import connect_to_mongo, close_mongo_connection, get_products_collection, get_users_collection, get_orders_collection, seed_data
from auth import verify_password, get_password_hash, create_access_token, get_current_user_email
from datetime import timedelta
import re

app = FastAPI(title="Craft Beer API", version="Final Fixed")

# Montar imágenes
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS
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

# --- AUTH (AQUÍ ESTABA EL ERROR) ---
@app.post("/api/auth/register", response_model=UserResponse)
async def register(user: UserRegister):
    coll = get_users_collection()
    if await coll.find_one({"email": user.email}):
        raise HTTPException(400, "Email ya registrado")
    
    # Preparar el usuario
    user_dict = UserInDB(
        **user.dict(), 
        hashed_password=get_password_hash(user.password)
    ).dict(by_alias=True)
    
    # --- CORRECCIÓN CRÍTICA: BORRAR EL ID NULO ---
    # Esto deja que MongoDB genere un ID único automáticamente
    if "_id" in user_dict:
        del user_dict["_id"]
    
    res = await coll.insert_one(user_dict)
    
    # Devolver respuesta con el ID nuevo
    return {**user.dict(), "id": str(res.inserted_id)}

@app.post("/api/auth/login")
async def login(user_data: UserLogin):
    coll = get_users_collection()
    user_db = await coll.find_one({"email": user_data.email})
    
    if not user_db:
        raise HTTPException(401, "Usuario no encontrado")
    if not verify_password(user_data.password, user_db["hashed_password"]):
        raise HTTPException(401, "Contraseña incorrecta")
    
    token = create_access_token({"sub": user_db["email"]}, timedelta(minutes=60))
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "name": user_db["name"],
            "email": user_db["email"],
            "id": str(user_db["_id"])
        }
    }

# --- PRODUCTOS ---
@app.get("/api/products", response_model=List[ProductResponse])
async def get_products(type: str = None, search: str = None):
    query = {}
    if type: query["type"] = type
    if search:
        regex = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [{"name": regex}, {"description": regex}]
    return await get_products_collection().find(query).to_list(100)

@app.post("/api/products", status_code=201)
async def create_product(product: ProductCreate):
    prod_dict = product.dict()
    res = await get_products_collection().insert_one(prod_dict)
    return {"id": str(res.inserted_id), "message": "Creado"}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str):
    try:
        res = await get_products_collection().delete_one({"_id": ObjectId(product_id)})
        if res.deleted_count == 0: raise HTTPException(404, "No existe")
        return {"message": "Eliminado"}
    except:
        raise HTTPException(400, "ID inválido")

# --- PEDIDOS ---
@app.post("/api/checkout", status_code=201)
async def checkout(order: Order, email: str = Depends(get_current_user_email)):
    order.user_email = email
    
    # También limpiamos el ID del pedido por si acaso
    order_dict = order.dict(by_alias=True)
    if "_id" in order_dict: del order_dict["_id"]
    
    res = await get_orders_collection().insert_one(order_dict)
    return {"order_id": str(res.inserted_id), "message": "Pago Aprobado"}

@app.get("/api/orders/me", response_model=List[OrderResponse])
async def my_orders(email: str = Depends(get_current_user_email)):
    return await get_orders_collection().find({"user_email": email}).to_list(100)