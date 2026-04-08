# backend/models/db.py
import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_CONFIG

def obtener_conexion():
    """
    Establece y devuelve la conexión a PostgreSQL.
    Si hay un error, lo atrapa y no deja que el servidor se caiga.
    """
    try:
        conexion = psycopg2.connect(**DB_CONFIG)
        return conexion
    except Exception as e:
        print(f"❌ Error crítico conectando a PostgreSQL: {e}")
        return None