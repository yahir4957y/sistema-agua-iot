import bcrypt
from core.db import obtener_conexion
from psycopg2.extras import RealDictCursor

# ==========================================
# FUNCIONES DE SEGURIDAD (HASHEO BCRYPT)
# ==========================================
def hashear_password(password_plana):
    salt = bcrypt.gensalt()
    # Hasheamos y convertimos a string para guardarlo en la BD
    hashed = bcrypt.hashpw(password_plana.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def comprobar_password(password_plana, password_hash):
    # Compara la contraseña que entra con el hash de la BD
    return bcrypt.checkpw(password_plana.encode('utf-8'), password_hash.encode('utf-8'))

# ==========================================
# MODELOS DE USUARIO
# ==========================================

# 1. VERIFICAR LOGIN
def verificar_credenciales(email, password):
    conexion = obtener_conexion()
    if not conexion: return None
    try:
        cursor = conexion.cursor(cursor_factory=RealDictCursor)
        # Solo entran los activos. OJO: Traemos el password_hash para verificarlo en Python
        consulta = """
            SELECT id_usuario, nombre, apellido_p, apellido_m, email, password_hash, estado 
            FROM usuarios 
            WHERE email = %s AND estado = 'activo'
        """
        cursor.execute(consulta, (email,))
        usuario = cursor.fetchone()
        
        # Si el usuario existe, verificamos que el hash coincida
        if usuario and comprobar_password(password, usuario['password_hash']):
            # Por pura calidad de seguridad, borramos el hash antes de mandarlo al frontend
            del usuario['password_hash']
            return usuario
            
        return None # Credenciales incorrectas
    except Exception as e:
        print(f"Error Login Model: {e}")
        return None
    finally:
        if conexion: conexion.close()

# 2. LISTAR TODOS (Para la tabla)
def listar_todos_usuarios():
    conexion = obtener_conexion()
    if not conexion: return []
    try:
        cursor = conexion.cursor(cursor_factory=RealDictCursor)
        # Añadido apellido_m al SELECT
        cursor.execute("SELECT id_usuario, nombre, apellido_p, apellido_m, email, estado FROM usuarios ORDER BY id_usuario DESC")
        usuarios = cursor.fetchall()
        return usuarios
    except Exception as e:
        print(f"Error Listar: {e}")
        return []
    finally:
        if conexion: conexion.close()

# 3. OBTENER UNO SOLO (Para el botón "Ver" y "Editar")
def obtener_usuario_por_id(id_usuario):
    conexion = obtener_conexion()
    if not conexion: return None
    try:
        cursor = conexion.cursor(cursor_factory=RealDictCursor)
        # Añadido apellido_m al SELECT
        cursor.execute("SELECT id_usuario, nombre, apellido_p, apellido_m, email, estado FROM usuarios WHERE id_usuario = %s", (id_usuario,))
        usuario = cursor.fetchone()
        return usuario
    except Exception as e:
        print(f"Error Obtener ID: {e}")
        return None
    finally:
        if conexion: conexion.close()

# 4. OBTENER HISTORIAL DE ACCESOS (Audit Trail)
def obtener_accesos(id_usuario):
    conexion = obtener_conexion()
    if not conexion: return []
    try:
        cursor = conexion.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT fecha_hora FROM log_accesos 
            WHERE id_usuario = %s 
            ORDER BY fecha_hora DESC LIMIT 5
        """, (id_usuario,))
        logs = cursor.fetchall()
        # Formateamos la fecha para que React la lea fácil
        return [l['fecha_hora'].strftime("%Y-%m-%d %H:%M:%S") for l in logs]
    except Exception as e:
        print(f"Error Logs: {e}")
        return []
    finally:
        if conexion: conexion.close()

# 5. CREAR NUEVO
def crear_nuevo_usuario(u):
    conexion = obtener_conexion()
    if not conexion: return False
    try:
        cursor = conexion.cursor()
        password_segura = hashear_password(u['password'])
        
        sql = """
            INSERT INTO usuarios (nombre, apellido_p, apellido_m, email, password_hash, estado) 
            VALUES (%s, %s, %s, %s, %s, 'activo')
        """
        cursor.execute(sql, (u['nombre'], u['apellido_p'], u.get('apellido_m', ''), u['email'], password_segura))
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

def eliminar_usuario_logico(id_usuario):
    conexion = obtener_conexion()
    try:
        cursor = conexion.cursor()
        cursor.execute("UPDATE usuarios SET estado = 'inactivo' WHERE id_usuario = %s", (id_usuario,))
        conexion.commit()
        return True
    except Exception as e:
        print(f"Error Eliminar: {e}")
        return False
    finally:
        if conexion: conexion.close()