# main.py
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from models import ProductResponse, UserRegister, UserLogin, UserResponse, UserInDB
from database import (
    connect_to_mongo, 
    close_mongo_connection, 
    get_products_collection, 
    get_users_collection, 
    seed_data,
    seed_test_user
)
from auth import verify_password, get_password_hash, create_access_token, get_current_user_email
from datetime import timedelta
import re # Para búsqueda con regex

# --- CONFIGURACIÓN DE FASTAPI ---
app = FastAPI(
    title="Cervecería Craft & Beer API",
    version="1.0.0"
)

# Configurar CORS (ajustar a tu puerto real de frontend)
origins = [
    "http://localhost:5500",  
    "http://127.0.0.1:5500",  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- EVENTOS DE INICIO/CIERRE ---
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()
    await seed_data()
    await seed_test_user() # Para replicar el usuario de prueba del JS

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# --- 🍺 ENDPOINTS DE PRODUCTOS (Catálogo, Búsqueda y Filtros) ---

@app.get("/api/products", response_model=List[ProductResponse])
async def read_products(
    type: Optional[str] = None, 
    max_price: Optional[int] = None,
    search: Optional[str] = None
):
    """Obtiene una lista filtrada y buscada de productos."""
    collection = get_products_collection()
    query = {}
    
    # 1. Filtro por Tipo
    if type:
        query["type"] = type
    
    # 2. Filtro por Precio Máximo
    if max_price is not None and max_price > 0:
        query["price"] = {"$lte": max_price}
        
    # 3. Búsqueda por texto (case-insensitive search en nombre, tipo o descripción)
    if search:
        if len(search) < 3 and len(search) > 0:
             # Retorna todos los productos si la búsqueda es muy corta, o puedes levantar un HTTPException
             pass
        else:
            search_pattern = re.escape(search) # Escapar caracteres especiales
            text_query = {
                "$or": [
                    {"name": {"$regex": search_pattern, "$options": "i"}},
                    {"type": {"$regex": search_pattern, "$options": "i"}},
                    {"description": {"$regex": search_pattern, "$options": "i"}},
                ]
            }
            # Combinar filtros existentes con la búsqueda
            if query:
                query = {"$and": [query, text_query]}
            else:
                query = text_query

    products_cursor = collection.find(query)
    products_list = await products_cursor.to_list(length=100) # Máximo 100 resultados

    if not products_list and search:
        # Esto ayuda al frontend a mostrar el mensaje "No se encontraron productos"
        return []
        
    return products_list


# --- 🔑 ENDPOINTS DE AUTENTICACIÓN (Cuenta) ---

@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserRegister):
    """Escenario: Registro exitoso y con errores."""
    collection = get_users_collection()
    
    if await collection.find_one({"email": user_data.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="❌ Este email ya está registrado"
        )
    
    hashed_password = get_password_hash(user_data.password)
    user_in_db = UserInDB(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_password
    )
    
    result = await collection.insert_one(user_in_db.dict(exclude_none=True, by_alias=True))
    
    response_data = user_in_db.dict(exclude={"hashed_password", "login_attempts", "blocked"})
    response_data["id"] = str(result.inserted_id)
    
    return response_data

@app.post("/api/auth/login")
async def login_user(user_data: UserLogin):
    """Escenario: Login exitoso, fallido y bloqueo."""
    collection = get_users_collection()
    user_db = await collection.find_one({"email": user_data.email})
    
    if not user_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="❌ El usuario no existe"
        )

    user = UserInDB(**user_db) # Convierte el diccionario de Mongo en el modelo Pydantic
    
    # 1. Bloqueo por intentos fallidos
    if user.blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="🚫 Cuenta temporalmente bloqueada. Intenta nuevamente más tarde."
        )

    # 2. Validación de Contraseña
    if not verify_password(user_data.password, user.hashed_password):
        user.login_attempts += 1
        
        if user.login_attempts >= 3:
            user.blocked = True
            detail_msg = "🚫 Demasiados intentos fallidos. Cuenta bloqueada."
        else:
            detail_msg = f"❌ Contraseña incorrecta. Te quedan {3 - user.login_attempts} intentos."
            
        await collection.update_one(
            {"_id": user.id},
            {"$set": {"login_attempts": user.login_attempts, "blocked": user.blocked}}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail_msg
        )

    # 3. Login exitoso
    user.login_attempts = 0 # Resetear intentos
    await collection.update_one(
        {"_id": user.id},
        {"$set": {"login_attempts": 0}}
    )
    
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=30)
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": UserResponse(id=user.id, name=user.name, email=user.email).dict()
    }

@app.post("/api/auth/recover")
async def recover_password(email: str):
    """Escenario: Recuperación de contraseña (Simulación)."""
    collection = get_users_collection()
    if not await collection.find_one({"email": email}):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="❌ No existe una cuenta con este email"
        )
        
    return {"message": "📧 ¡Enlace de recuperación enviado! Revisa tu bandeja de entrada."}

# --- 🛒 ENDPOINT PROTEGIDO (Checkout) ---

# Para que el checkout funcione, el frontend debe enviar el token JWT en el header Authorization
@app.post("/api/checkout")
async def proceed_to_checkout(current_user_email: str = Depends(get_current_user_email)):
    """Simula el proceso de pago, requiriendo autenticación JWT."""
    
    # Aquí puedes buscar el usuario completo en la DB si lo necesitas
    collection = get_users_collection()
    user_db = await collection.find_one({"email": current_user_email})
    if not user_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    user = UserInDB(**user_db)
    
    # ⚠️ Nota: En un sistema real, aquí recibirías los ítems del carrito en el body
    # y aplicarías la lógica de pago.
    
    return {
        "message": f"🚀 Compra simulada exitosamente para {user.name} ({user.email}). Redirigiendo a Webpay...",
        "total": "Simulado"
    }
