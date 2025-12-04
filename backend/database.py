# backend/database.py
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional
import certifi  # <--- 1. IMPORTANTE: Importar certifi
import os
from dotenv import load_dotenv

load_dotenv()

# --- 2. CONFIGURACIÓN DE LA URL ---
# Pega aquí tu cadena REAL de Atlas (la que no tiene xxxxx)
# Asegúrate de que tenga tu contraseña (xuUmQ9Bwo0pOtt0x)
MONGO_URL = "mongodb+srv://maxdiaz120_db_user:xuUmQ9Bwo0pOtt0x@cluster0.nj4nrpp.mongodb.net/?retryWrites=true&w=majority"

DATABASE_NAME = "craft_beer_db"

client: Optional[AsyncIOMotorClient] = None
db = None

async def connect_to_mongo():
    global client, db
    print(f"🔗 Intentando conectar a la base de datos: {DATABASE_NAME}...")
    
    try:
        # --- 3. EL ARREGLO MÁGICO PARA SSL ---
        client = AsyncIOMotorClient(
            MONGO_URL, 
            serverSelectionTimeoutMS=5000,
            tlsCAFile=certifi.where() # <--- ESTO ARREGLA EL ERROR SSL EN WINDOWS
        )
        db = client[DATABASE_NAME]
        
        # Ping para verificar conexión
        await client.admin.command('ping')
        print("✅ Conexión exitosa a MongoDB Atlas.")
    except Exception as e:
        print(f"❌ Error al conectar a la DB: {e}")

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("🔌 Conexión a MongoDB cerrada.")

# --- Helpers ---
def get_products_collection(): return db.products
def get_users_collection(): return db.users
def get_orders_collection(): return db.orders

async def seed_data():
    try:
        if await get_products_collection().count_documents({}) == 0:
            print("⚠️ Insertando datos de prueba en 'products'...")
            test_products = [
                {"name": "IPA Artesanal", "type": "IPA", "price": 5500, "description": "IPA con intenso aroma a lúpulo.", "image": "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=400&q=80", "alcohol": 6.5},
                {"name": "Stout Imperial", "type": "Stout", "price": 6200, "description": "Robusta con notas de café.", "image": "https://images.unsplash.com/photo-1535958636474-b021ee8876a3?auto=format&fit=crop&w=400&q=80", "alcohol": 8.2},
                {"name": "Lager Premium", "type": "Lager", "price": 4800, "description": "Suave y refrescante.", "image": "https://images.unsplash.com/photo-1586996292898-71f4036c4e07?auto=format&fit=crop&w=400&q=80", "alcohol": 5.0},
            ]
            await get_products_collection().insert_many(test_products)
            print("✅ Datos de prueba insertados.")
    except Exception as e:
        print(f"⚠️ Nota: DB lista o error menor en seed: {e}")