# database.py
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional
from datetime import datetime
import os
from dotenv import load_dotenv
from auth import get_password_hash # Importamos para el seeding de usuario de prueba

load_dotenv() 
MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://maxdiaz120_db_user:xuUmQ9Bwo0pOtt0x@cluster0.nj4nrpp.mongodb.net/?appName=Cluster0") 
DATABASE_NAME = os.getenv("DATABASE_NAME", "craft_beer_db")

client: Optional[AsyncIOMotorClient] = None
db = None

async def connect_to_mongo():
    global client, db
    print(f"🔗 Intentando conectar a la base de datos: {DATABASE_NAME}...") 
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client[DATABASE_NAME]
    try:
        await client.admin.command('ping')
        print("✅ Conexión exitosa a MongoDB Atlas.")
    except Exception as e:
        print(f"❌ Error al conectar a la DB: {e}. ¿Cadena de Atlas o IP incorrecta?")

async def close_mongo_connection():
    global client
    if client: client.close(); print("🔌 Conexión a MongoDB cerrada.")

# ... (Definición de CustomObjectId - se mantiene igual)

def get_products_collection(): return db.products
def get_users_collection(): return db.users # Colección de usuarios
def get_orders_collection(): return db.orders

async def seed_data():
    products_collection = get_products_collection()
    if await products_collection.count_documents({}) == 0:
        print("⚠️ Insertando datos de prueba en 'products'...")
        test_products = [
            {"name": "IPA Artesanal", "type": "IPA", "price": 5500, "description": "IPA con intenso aroma a lúpulo. Notas cítricas.", "image": "img/ipa-artesanal.jpg", "alcohol": 6.5},
            {"name": "Stout Imperial", "type": "Stout", "price": 6200, "description": "Robusta con notas de café tostado y chocolate negro.", "image": "img/stout-imperial.jpg", "alcohol": 8.2},
            {"name": "Lager Premium", "type": "Lager", "price": 4800, "description": "Suave y refrescante, sabor limpio.", "image": "img/lager-premium.jpg", "alcohol": 5.0},
            {"name": "Porter Achocolatada", "type": "Porter", "price": 5800, "description": "Porter con fuertes notas de chocolate amargo.", "image": "img/porter-achocolatada.jpg", "alcohol": 6.8},
        ]
        await products_collection.insert_many(test_products)
        print("✅ Datos de prueba insertados.")

async def seed_test_user():
    users_collection = get_users_collection()
    test_email = "cliente@ejemplo.cl"
    if await users_collection.count_documents({"email": test_email}) == 0:
        print("⚠️ Insertando usuario de prueba: cliente@ejemplo.cl / Clave2025")
        hashed_pw = get_password_hash("Clave2025") 
        test_user = {"name": "Cliente de Prueba", "email": test_email, "hashed_password": hashed_pw}
        await users_collection.insert_one(test_user)
        print("✅ Usuario de prueba insertado.")