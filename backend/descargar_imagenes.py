import os
import requests
import urllib3

# Desactivar advertencias de seguridad SSL para que Windows no bloquee la descarga
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 1. Asegurar carpeta
if not os.path.exists("static"):
    os.makedirs("static")

# 2. Lista de imágenes con RESPALDOS (Si falla una, prueba la siguiente)
# Formato: "nombre_archivo": ["url_principal", "url_respaldo_1", "url_respaldo_2"]
banco_imagenes = {
    "portada.jpg": [
        "https://images.pexels.com/photos/1267369/pexels-photo-1267369.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "https://images.unsplash.com/photo-1575482326776-324d27ce6532?w=800",
        "https://upload.wikimedia.org/wikipedia/commons/4/4c/Oktoberfest-2012-01.jpg"
    ],
    "ipa.jpg": [
        "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.unsplash.com/photo-1615332579037-3c44b3660b53?w=600",
        "https://upload.wikimedia.org/wikipedia/commons/c/c6/Glass_of_Beer_%281%29.jpg"
    ],
    "stout.jpg": [
        "https://images.pexels.com/photos/3294248/pexels-photo-3294248.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.unsplash.com/photo-1582234372132-75d38c33973c?w=600",
        "https://upload.wikimedia.org/wikipedia/commons/4/4f/Stout.jpg"
    ],
    "lager.jpg": [
        "https://images.pexels.com/photos/5530170/pexels-photo-5530170.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=600",
        "https://upload.wikimedia.org/wikipedia/commons/0/05/Helles_Gralsburg.jpg"
    ],
    "ale.jpg": [
        "https://images.pexels.com/photos/1267697/pexels-photo-1267697.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.unsplash.com/photo-1559526323-cb2f2fe2591b?w=600",
        "https://upload.wikimedia.org/wikipedia/commons/e/e0/Red_Stripe_Lager.jpg"
    ]
}

# Headers para parecer un humano
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36'
}

print("⬇️  Iniciando descarga ROBUSTA de imágenes...")

for nombre_archivo, urls in banco_imagenes.items():
    descargado = False
    print(f"\n   Intentando descargar {nombre_archivo}...")
    
    for i, url in enumerate(urls):
        try:
            print(f"      🔸 Probando opción {i+1}...")
            # verify=False salta errores de SSL de tu antivirus/firewall
            respuesta = requests.get(url, headers=headers, timeout=15, verify=False)
            
            if respuesta.status_code == 200:
                with open(f"static/{nombre_archivo}", "wb") as f:
                    f.write(respuesta.content)
                print(f"      ✅ ¡ÉXITO! Guardada.")
                descargado = True
                break # Salir del bucle de opciones si ya funcionó
            else:
                print(f"      ❌ Falló opción {i+1} (Status: {respuesta.status_code})")
        except Exception as e:
            print(f"      ❌ Falló opción {i+1} (Error de red)")
            
    if not descargado:
        print(f"   ⚠️ ALERTA: No se pudo descargar {nombre_archivo} con ninguna opción.")

print("\n🚀 PROCESO TERMINADO. Verifica tu carpeta 'backend/static'.")