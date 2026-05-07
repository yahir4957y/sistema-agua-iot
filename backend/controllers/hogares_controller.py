from models.hogares_model import obtener_todos_los_hogares

def gestionar_hogares_get():
    """Devuelve los hogares disponibles para el frontend"""
    lista = obtener_todos_los_hogares()
    
    if lista is not None:
        return {
            "status": 200,
            "body": {
                "mensaje": "Hogares recuperados con éxito.",
                "hogares": lista
            }
        }
    else:
        return {
            "status": 500,
            "body": {"error": "Error interno al conectar con la base de datos."}
        }