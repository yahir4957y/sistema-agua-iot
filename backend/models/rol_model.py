from core.db import obtener_conexion
from psycopg2.extras import RealDictCursor

def listar_roles():
    conexion = obtener_conexion()
    try:
        cursor = conexion.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT id_rol, nombre, descripcion FROM roles ORDER BY id_rol ASC")
        return cursor.fetchall()
    except Exception as e:
        print(f"Error listar roles: {e}")
        return []
    finally:
        if conexion: conexion.close()

def crear_rol(datos):
    conexion = obtener_conexion()
    try:
        cursor = conexion.cursor()
        cursor.execute("INSERT INTO roles (nombre, descripcion) VALUES (%s, %s)", 
                      (datos['nombre'], datos.get('descripcion', '')))
        conexion.commit()
        return True
    except Exception as e:
        print(f"Error crear rol: {e}")
        return False
    finally:
        if conexion: conexion.close()

def editar_rol(id_rol, datos):
    conexion = obtener_conexion()
    try:
        cursor = conexion.cursor()
        cursor.execute("UPDATE roles SET nombre=%s, descripcion=%s WHERE id_rol=%s", 
                      (datos['nombre'], datos.get('descripcion', ''), id_rol))
        conexion.commit()
        return True
    except Exception as e:
        print(f"Error editar rol: {e}")
        return False
    finally:
        if conexion: conexion.close()

def eliminar_rol(id_rol):
    conexion = obtener_conexion()
    try:
        cursor = conexion.cursor()
        # Primero borramos las relaciones en usuario_rol por integridad referencial
        cursor.execute("DELETE FROM usuario_rol WHERE id_rol=%s", (id_rol,))
        # Luego borramos el rol
        cursor.execute("DELETE FROM roles WHERE id_rol=%s", (id_rol,))
        conexion.commit()
        return True
    except Exception as e:
        print(f"Error eliminar rol: {e}")
        return False
    finally:
        if conexion: conexion.close()