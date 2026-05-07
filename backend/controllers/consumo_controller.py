from services.agregacion_service import generar_cierre_diario
from models.consumo_model import obtener_resumenes_bd



def obtener_historial_consumo(id_hogar):
    """
    Controlador para manejar la petición GET de React.
    Devuelve la data lista para ser graficada.
    """
    if not id_hogar:
        return {
            "status": 400,
            "body": {"error": "Se requiere el ID del hogar para buscar el historial."},
        }

    historial = obtener_resumenes_bd(id_hogar)

    if historial is not None:  
        return {
            "status": 200,
            "body": {"mensaje": "Historial recuperado con éxito.", "datos": historial},
        }
    else:
        return {
            "status": 500,
            "body": {"error": "Error interno al conectar con la base de datos."},
        }


def procesar_cierre_manual(datos_peticion):
    """
    Controlador para manejar la petición POST de React.
    Ejecuta el cálculo matemático y lo guarda.
    """
    id_hogar = datos_peticion.get("id_hogar")
    fecha = datos_peticion.get("fecha")  

    if not id_hogar:
        return {
            "status": 400,
            "body": {"error": "Por favor, envía el id_hogar para generar el cierre."},
        }

    resultado = generar_cierre_diario(id_hogar, fecha)

    return {
        "status": resultado["status"],
        "body": {
            "mensaje": resultado.get("mensaje"),
            "datos": resultado.get("datos"),
            "error": resultado.get("error"),
        },
    }
