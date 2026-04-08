from models.rol_model import listar_roles, crear_rol, editar_rol, eliminar_rol

def gestionar_roles_request(metodo, datos=None, id_rol=None):
    if metodo == 'GET':
        return {"status": 200, "body": listar_roles()}
    
    if metodo == 'POST':
        if not datos or 'nombre' not in datos:
            return {"status": 400, "body": {"error": "El nombre del rol es obligatorio"}}
        if crear_rol(datos):
            return {"status": 201, "body": {"mensaje": "Rol creado con éxito"}}
        return {"status": 500, "body": {"error": "Error al crear el rol"}}

    if metodo == 'PUT':
        if editar_rol(id_rol, datos):
            return {"status": 200, "body": {"mensaje": "Rol actualizado"}}
        return {"status": 500, "body": {"error": "Error al actualizar"}}

    if metodo == 'DELETE':
        if eliminar_rol(id_rol):
            return {"status": 200, "body": {"mensaje": "Rol eliminado"}}
        return {"status": 500, "body": {"error": "Error al eliminar"}}

    return {"status": 405, "body": {"error": "Método no permitido"}}