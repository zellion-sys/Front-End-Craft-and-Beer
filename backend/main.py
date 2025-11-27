# main.py
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from models import ProductResponse, UserRegister, UserLogin, UserResponse, UserInDB, Order
from database import connect_to_mongo, close_mongo_connection, get_products_collection, get_users_collection, get_orders_collection, seed_data, seed_test_user
from auth import verify_password, get_password_hash, create_access_token, get_current_user_email
from datetime import timedelta
import re 
from bson import ObjectId

# --- CONFIGURACIÓN DE FASTAPI ---
app = FastAPI(title="Cervecería Craft & Beer API", version="2.0.0")

# Configurar CORS 
# Configurar CORS (MODO PERMISIVO PARA QUE FUNCIONE YA)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # <--- ESTO ES LA CLAVE: El asterisco permite todo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()
    await seed_data()
    await seed_test_user()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# ----------------------------------------------------
# 🔑 ENDPOINTS DE AUTENTICACIÓN (DB 1: Users)
# ----------------------------------------------------

@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserRegister):
    collection = get_users_collection()
    if await collection.find_one({"email": user_data.email}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="❌ Este email ya está registrado")
    
    hashed_password = get_password_hash(user_data.password)
    user_in_db = UserInDB(name=user_data.name, email=user_data.email, hashed_password=hashed_password)
    result = await collection.insert_one(user_in_db.dict(exclude_none=True, by_alias=True))
    
    response_data = user_in_db.dict(exclude={"hashed_password", "login_attempts", "blocked"})
    response_data["id"] = str(result.inserted_id)
    return response_data

@app.post("/api/auth/login")
async def login_user(user_data: UserLogin):
    collection = get_users_collection()
    user_db = await collection.find_one({"email": user_data.email})
    
    if not user_db or not verify_password(user_data.password, user_db["hashed_password"]):
        # Lógica de intentos fallidos simplificada: solo levanta error
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="❌ Email o contraseña incorrectos")

    user = UserInDB(**user_db)
    
    # Restablecer intentos al login exitoso
    await collection.update_one({"_id": user.id}, {"$set": {"login_attempts": 0}})
    
    # Crear token JWT
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=30)
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": UserResponse(id=user.id, name=user.name, email=user.email).dict(by_alias=True)
    }

# ----------------------------------------------------
# 🍺 ENDPOINT DE PRODUCTOS (DB 2: Products)
# ----------------------------------------------------

@app.get("/api/products", response_model=List[ProductResponse])
async def read_products(
    type: Optional[str] = None, 
    max_price: Optional[int] = None,
    search: Optional[str] = None
):
    """Obtiene el catálogo de cervezas con filtros."""
    collection = get_products_collection()
    query = {}
    
    if type: query["type"] = type
    if max_price is not None: query["price"] = {"$lte": max_price}
        
    if search:
        search_pattern = re.escape(search)
        text_query = {"$or": [ {"name": {"$regex": search_pattern, "$options": "i"}}, {"type": {"$regex": search_pattern, "$options": "i"}}, {"description": {"$regex": search_pattern, "$options": "i"}} ]}
        query = {"$and": [query, text_query]} if query else text_query

    products_cursor = collection.find(query)
    products_list = await products_cursor.to_list(length=100)
    return products_list

# ----------------------------------------------------
# 🛒 ENDPOINT PROTEGIDO DE PEDIDOS (DB 3: Orders)
# ----------------------------------------------------

@app.post("/api/checkout", status_code=status.HTTP_201_CREATED)
async def proceed_to_checkout(
    order_data: Order,
    current_user_email: str = Depends(get_current_user_email) # ⬅️ RUTA PROTEGIDA
):
    """Guarda un pedido en la base de datos y simula el pago, requiere token JWT."""
    orders_collection = get_orders_collection()
    
    # Aseguramos que el pedido se asocie al usuario que está logueado
    order_data.user_email = current_user_email
    
    # 1. Guardar el pedido en la DB
    order_dict = order_data.dict(by_alias=True)
    result = await orders_collection.insert_one(order_dict)
    
    # 2. Simulación de pago
    
    return {
        "message": "✅ Compra exitosa! Pedido guardado en DB (requirió login).",
        "order_id": str(result.inserted_id),
        "total": order_data.total_amount,
        "user": current_user_email
    }
