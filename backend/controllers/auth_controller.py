import jwt
import datetime
from models.usuario_model import verificar_credenciales
from config import SECRET_KEY  # Llave secreta
from core.db import obtener_conexion  # Mejor importar arriba


def procesar_login(datos_peticion):
    email = datos_peticion.get('email')
    password = datos_peticion.get('password')
    
    # Validación de datos
    if not email or not password:
        return {
            "status": 400,
            "body": {"error": "Por favor, ingresa correo y contraseña."}
        }
    
    usuario = verificar_credenciales(email, password)
    
    if usuario:
        # Crear payload del token
        payload = {
            "id_usuario": usuario["id_usuario"],
            "email": usuario["email"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }
        
        # Encriptación del token
        token_seguro = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        conn = None
        cur = None
        try:
            conn = obtener_conexion()
            if conn:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO log_accesos (id_usuario) VALUES (%s)",
                    (usuario['id_usuario'],)
                )
                conn.commit()
        except Exception as e:
            if conn:
                conn.rollback() 
            print(f"Error Crítico en BD al guardar log_accesos: {str(e)}")
        finally:
            if cur:
                cur.close()
            if conn:
                conn.close()
        
        return {
            "status": 200,
            "body": {
                "mensaje": "¡Login exitoso!",
                "usuario": usuario,
                "token": token_seguro
            }
        }
    
    else:
        return {
            "status": 401,
            "body": {"error": "Credenciales incorrectas o usuario inactivo."}
        }