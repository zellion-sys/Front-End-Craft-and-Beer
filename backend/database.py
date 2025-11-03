# database.py
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional
from datetime import datetime, timedelta

# Configuración de la base de datos
MONGO_URL = "mongodb://localhost:27017"  # ⚠️ ¡RECUERDA CAMBIAR ESTO!
DATABASE_NAME = "craft_beer_db"

client: Optional[AsyncIOMotorClient] = None
db = None

async def connect_to_mongo():
    """Establece la conexión con MongoDB."""
    global client, db
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client[DATABASE_NAME]
    
    try:
        await client.admin.command('ping')
        print("✅ Conexión exitosa a MongoDB.")
    except Exception as e:
        print(f"❌ No se pudo conectar a MongoDB: {e}")

async def close_mongo_connection():
    """Cierra la conexión con MongoDB."""
    global client
    if client:
        client.close()
        print("🔌 Conexión a MongoDB cerrada.")

# Ayudante para convertir ObjectId a str en los diccionarios (para JSON)
class CustomObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not isinstance(v, str):
            raise TypeError('String required')
        try:
            ObjectId(v)
            return v
        except:
            raise ValueError('Invalid ObjectId')

# Obtenedores de Colección
def get_products_collection():
    return db.products

def get_users_collection():
    return db.users

# Inserción de datos de prueba
async def seed_data():
    products_collection = get_products_collection()
    if await products_collection.count_documents({}) == 0:
        print("⚠️ Insertando datos de prueba en 'products'...")
        test_products = [
            # ... (productos definidos en tu JS/respuesta anterior) ...
            {
                "name": "IPA Artesanal", "type": "IPA", "price": 5500,
                "description": "Cerveza IPA con intenso aroma a lúpulo y notas cítricas. Elaborada con maltas premium y lúpulos americanos.",
                "image": "img/ipa-artesanal.jpg", "alcohol": 6.5
            },
            {
                "name": "Stout Imperial", "type": "Stout", "price": 6200,
                "description": "Stout robusta con notas de café tostado, chocolate negro y un final cremoso. Alta graduación alcohólica.",
                "image": "img/stout-imperial.jpg", "alcohol": 8.2
            },
            {
                "name": "Lager Premium", "type": "Lager", "price": 4800,
                "description": "Lager suave y refrescante, perfecta para cualquier ocasión. Fermentación baja y sabor limpio.",
                "image": "img/lager-premium.jpg", "alcohol": 5.0
            },
            {
                "name": "Porter Achocolatada", "type": "Porter", "price": 5800,
                "description": "Porter con fuertes notas de chocolate amargo y café. Cuerpo medio y final sedoso.",
                "image": "img/porter-achocolatada.jpg", "alcohol": 6.8
            },
            {
                "name": "Wheat Beer", "type": "Wheat", "price": 5200,
                "description": "Cerveza de trigo con notas cítricas y especiadas. Refrescante con un característico turbio.",
                "image": "img/wheat-beer.jpg", "alcohol": 5.2
            },
            {
                "name": "Pale Ale", "type": "Pale Ale", "price": 5100,
                "description": "Pale Ale equilibrada con aroma a lúpulo y maltas caramelizadas. Amargor medio y sabor complejo.",
                "image": "img/pale-ale.jpg", "alcohol": 5.5
            }
        ]
        await products_collection.insert_many(test_products)
        print("✅ Datos de prueba insertados.")

# Simulación de usuario para pruebas (Cliente ya registrado con hash)
async def seed_test_user():
    users_collection = get_users_collection()
    from auth import get_password_hash # Importa aquí para evitar circular dependency
    
    test_email = "cliente@craftbeer.cl"
    if await users_collection.count_documents({"email": test_email}) == 0:
        print("⚠️ Insertando usuario de prueba 'cliente@craftbeer.cl'...")
        hashed_pw = get_password_hash("Clave2025") 
        test_user = {
            "name": "Juan Pérez",
            "email": test_email,
            "hashed_password": hashed_pw,
            "login_attempts": 0,
            "blocked": False
        }
        await users_collection.insert_one(test_user)
        print("✅ Usuario de prueba insertado.")