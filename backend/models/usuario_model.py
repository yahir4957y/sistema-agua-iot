from core.db import obtener_conexion
from psycopg2.extras import RealDictCursor

# 1. VERIFICAR LOGIN
def verificar_credenciales(email, password):
    conexion = obtener_conexion()
    if not conexion: return None
    try:
        cursor = conexion.cursor(cursor_factory=RealDictCursor)
        # Solo entran los activos
        consulta = "SELECT id_usuario, nombre, email, estado FROM usuarios WHERE email = %s AND password_hash = %s AND estado = 'activo'"
        cursor.execute(consulta, (email, password))
        usuario = cursor.fetchone()
        cursor.close()
        conexion.close()
        return usuario
    except Exception as e:
        print(f"Error Login Model: {e}")
        return None

# 2. LISTAR TODOS (Para la tabla)
def listar_todos_usuarios():
    conexion = obtener_conexion()
    if not conexion: return []
    try:
        cursor = conexion.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT id_usuario, nombre, apellido_p, email, estado FROM usuarios ORDER BY id_usuario DESC")
        usuarios = cursor.fetchall()
        cursor.close()
        conexion.close()
        return usuarios
    except Exception as e:
        print(f"Error Listar: {e}")
        return []

# 3. OBTENER UNO SOLO (Para el botón "Ver" y "Editar")
def obtener_usuario_por_id(id_usuario):
    conexion = obtener_conexion()
    if not conexion: return None
    try:
        cursor = conexion.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT id_usuario, nombre, apellido_p, email, estado FROM usuarios WHERE id_usuario = %s", (id_usuario,))
        usuario = cursor.fetchone()
        cursor.close()
        conexion.close()
        return usuario
    except Exception as e:
        print(f"Error Obtener ID: {e}")
        return None

# 4. OBTENER HISTORIAL DE ACCESOS (Audit Trail)
def obtener_accesos(id_usuario):
    conexion = obtener_conexion()
    if not conexion: return []
    try:
        cursor = conexion.cursor(cursor_factory=RealDictCursor)
        # Traemos los últimos 5 ingresos
        cursor.execute("""
            SELECT fecha_hora FROM log_accesos 
            WHERE id_usuario = %s 
            ORDER BY fecha_hora DESC LIMIT 5
        """, (id_usuario,))
        logs = cursor.fetchall()
        cursor.close()
        conexion.close()
        # Formateamos la fecha para que React la lea fácil
        return [l['fecha_hora'].strftime("%Y-%m-%d %H:%M:%S") for l in logs]
    except Exception as e:
        print(f"Error Logs: {e}")
        return []

# 5. CREAR NUEVO
def crear_nuevo_usuario(u):
    conexion = obtener_conexion()
    if not conexion: return False
    try:
        cursor = conexion.cursor()
        sql = """
            INSERT INTO usuarios (nombre, apellido_p, apellido_m, email, password_hash, estado) 
            VALUES (%s, %s, %s, %s, %s, 'activo')
        """
        # Usamos u.get('apellido_m', '') por si en React lo dejan vacío
        cursor.execute(sql, (u['nombre'], u['apellido_p'], u.get('apellido_m', ''), u['email'], u['password']))
        conexion.commit()
        return True
    except Exception as e:
        print(f"Error Crear: {e}")
        return False
    finally:
        if conexion: conexion.close()

def editar_usuario(id_usuario, u):
    conexion = obtener_conexion()
    if not conexion: return False
    try:
        cursor = conexion.cursor()
        sql = """
            UPDATE usuarios 
            SET nombre=%s, apellido_p=%s, apellido_m=%s, email=%s, estado=%s 
            WHERE id_usuario=%s
        """
        cursor.execute(sql, (u['nombre'], u['apellido_p'], u.get('apellido_m', ''), u['email'], u['estado'], id_usuario))
        conexion.commit()
        return True
    except Exception as e:
        print(f"Error Editar: {e}")
        return False
    finally:
        if conexion: conexion.close()

# 7. ELIMINAR LÓGICO
def eliminar_usuario_logico(id_usuario):
    conexion = obtener_conexion()
    try:
        cursor = conexion.cursor()
        cursor.execute("UPDATE usuarios SET estado = 'inactivo' WHERE id_usuario = %s", (id_usuario,))
        conexion.commit()
        cursor.close()
        conexion.close()
        return True
    except Exception as e:
        print(f"Error Eliminar: {e}")
        return False