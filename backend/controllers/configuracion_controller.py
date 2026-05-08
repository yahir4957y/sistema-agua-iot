from models.configuracion_model import obtener_configuracion_db, actualizar_configuracion_db

def gestionar_configuracion_get(id_hogar):
    config = obtener_configuracion_db(id_hogar)
    if config:
        return {"status": 200, "body": {"mensaje": "Éxito", "configuracion": config}}
    else:
        # Si no existe, devolvemos un 404 manejable
        return {"status": 404, "body": {"error": "Configuración no encontrada para este hogar."}}

def gestionar_configuracion_put(id_hogar, datos):
    if not datos:
        return {"status": 400, "body": {"error": "No se enviaron datos para actualizar."}}
        
    exito = actualizar_configuracion_db(id_hogar, datos)
    if exito:
        return {"status": 200, "body": {"mensaje": "Configuración actualizada correctamente."}}
    else:
        return {"status": 500, "body": {"error": "Error interno al guardar la configuración."}}