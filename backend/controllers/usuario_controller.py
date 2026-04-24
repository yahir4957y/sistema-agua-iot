from models.usuario_model import (
    listar_todos_usuarios,
    crear_nuevo_usuario,
    editar_usuario,
    eliminar_usuario_logico,
    obtener_usuario_por_id  
)

from core.db import obtener_conexion
from psycopg2.extras import RealDictCursor


def gestionar_usuarios_request(metodo, datos=None, id_usuario=None):
    print(f"--- Solicitud {metodo} recibida para ID: {id_usuario} ---")


    if metodo == 'GET':
        if id_usuario:
            usuario = obtener_usuario_por_id(id_usuario)

            if not usuario:
                return {"status": 404, "body": {"error": "Usuario no encontrado"}}

            usuario['accesos'] = obtener_accesos(id_usuario)
            return {"status": 200, "body": usuario}

        return {"status": 200, "body": listar_todos_usuarios()}


    if metodo == 'POST':
        if not datos or 'email' not in datos:
            return {
                "status": 400,
                "body": {"error": "Datos incompletos para crear"}
            }

        if crear_nuevo_usuario(datos):
            return {
                "status": 201,
                "body": {"mensaje": "Usuario creado con éxito"}
            }

        return {
            "status": 500,
            "body": {"error": "Error en base de datos al crear"}
        }

    if metodo == 'PUT':
        try:
            id_int = int(id_usuario)

            if editar_usuario(id_int, datos):
                return {
                    "status": 200,
                    "body": {"mensaje": "Usuario actualizado correctamente"}
                }

            return {
                "status": 500,
                "body": {"error": "No se pudo actualizar en la base de datos"}
            }

        except Exception as e:
            print(f"Error en Controlador PUT: {e}")
            return {
                "status": 400,
                "body": {"error": "ID de usuario no válido"}
            }


    if metodo == 'DELETE':
        try:
            id_int = int(id_usuario)

            if eliminar_usuario_logico(id_int):
                return {
                    "status": 200,
                    "body": {"mensaje": "Usuario inactivado correctamente"}
                }

            return {
                "status": 500,
                "body": {"error": "Error al eliminar en la base de datos"}
            }

        except Exception as e:
            print(f"Error en DELETE: {e}")
            return {
                "status": 400,
                "body": {"error": "ID no válido para eliminar"}
            }

   
    return {
        "status": 405,
        "body": {"error": "Método no permitido"}
    }


def obtener_accesos(id_usuario):
    conn = obtener_conexion()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT fecha_hora
        FROM log_accesos
        WHERE id_usuario = %s
        ORDER BY fecha_hora DESC
        LIMIT 5
    """, (id_usuario,))

    logs = cur.fetchall()
    conn.close()

    return [
        l['fecha_hora'].strftime("%Y-%m-%d %H:%M:%S")
        for l in logs
    ]