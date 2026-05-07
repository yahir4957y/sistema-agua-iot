from core.db import obtener_conexion

def obtener_todos_los_hogares():
    """Obtiene la lista de hogares de la base de datos"""
    conn = None
    cur = None
    try:
        conn = obtener_conexion()
        if conn:
            cur = conn.cursor()
            # Traemos id_hogar, nombre y descripcion según tu tabla
            cur.execute("SELECT id_hogar, nombre, descripcion FROM hogares ORDER BY id_hogar ASC")
            filas = cur.fetchall()
            
            hogares = []
            for f in filas:
                hogares.append({
                    "id": f[0],
                    "nombre": f[1],
                    "descripcion": f[2]
                })
            return hogares
    except Exception as e:
        print(f"🚨 Error al obtener lista de hogares: {str(e)}")
        return None
    finally:
        if cur: cur.close()
        if conn: conn.close()