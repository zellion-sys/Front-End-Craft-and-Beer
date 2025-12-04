# backend/database.py - VERSIÓN FINAL CON USUARIO ADMIN
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
from dotenv import load_dotenv
from auth import get_password_hash # Necesitamos esto para crear el usuario
import os

load_dotenv()

MONGO_URL = "mongodb+srv://maxdiaz120_db_user:xuUmQ9Bwo0pOtt0x@cluster0.nj4nrpp.mongodb.net/?retryWrites=true&w=majority"
DATABASE_NAME = "craft_beer_db"

client = None
db = None

async def connect_to_mongo():
    global client, db
    print(f"🔗 Conectando a: {DATABASE_NAME}...")
    try:
        client = AsyncIOMotorClient(
            MONGO_URL, 
            serverSelectionTimeoutMS=5000,
            tls=True,
            tlsCAFile=certifi.where(),
            tlsAllowInvalidCertificates=True 
        )
        db = client[DATABASE_NAME]
        await client.admin.command('ping')
        print("✅ Conexión a Atlas: EXITOSA")
    except Exception as e:
        print(f"❌ Error DB: {e}")

async def close_mongo_connection():
    if client: client.close()

def get_products_collection(): return db.products
def get_users_collection(): return db.users
def get_orders_collection(): return db.orders

async def seed_data():
    try:
        # 1. CATALOGO (Solo si está vacío o quieres resetearlo siempre, descomenta la linea de delete)
        # await get_products_collection().delete_many({}) # <--- Descomenta si quieres borrar todo al iniciar
        
        if await get_products_collection().count_documents({}) == 0:
            print("♻️  Cargando catálogo inicial...")
            base_img = "http://127.0.0.1:8000/static"
            products = [
                {"name": "IPA Legendaria", "type": "IPA", "price": 4500, "alcohol": 6.5, "rating": 4.8, "reviews": 120, "description": "Nuestra IPA insignia. Explosión de lúpulo.", "image": f"{base_img}/ipa.jpg"},
                {"name": "Stout Volcánica", "type": "Stout", "price": 5200, "alcohol": 8.0, "rating": 4.7, "reviews": 90, "description": "Negra profunda. Café y chocolate.", "image": f"{base_img}/stout.jpg"},
                {"name": "Golden Summer", "type": "Lager", "price": 3900, "alcohol": 4.8, "rating": 4.4, "reviews": 300, "description": "Rubia y refrescante.", "image": f"{base_img}/lager.jpg"},
                {"name": "Red Ale Fuego", "type": "Ale", "price": 4800, "alcohol": 5.5, "rating": 4.7, "reviews": 80, "description": "Color cobrizo intenso.", "image": f"{base_img}/ale.jpg"},
            ]
            await get_products_collection().insert_many(products)
            print("✅ Productos creados.")

        # 2. USUARIO ADMIN DE RESPALDO (Para que siempre puedas entrar)
        admin_email = "admin@craft.cl"
        if await get_users_collection().count_documents({"email": admin_email}) == 0:
            print("👤 Creando usuario Admin de respaldo...")
            admin_user = {
                "name": "Administrador",
                "email": admin_email,
                "hashed_password": get_password_hash("admin123"), # Contraseña: admin123
                "login_attempts": 0,
                "blocked": False
            }
            await get_users_collection().insert_one(admin_user)
            print("✅ Usuario Admin listo: admin@craft.cl / admin123")

    except Exception as e:
        print(f"⚠️ Error seed: {e}")