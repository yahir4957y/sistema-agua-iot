from core.db import obtener_conexion
from psycopg2.extras import RealDictCursor



def guardar_multiples_lecturas(lecturas):
    """
    Recibe un array de lecturas:
    [{'id_sensor': 1, 'valor': 2.5}, {'id_sensor': 2, 'valor': 0.0}]
    """
    conexion = obtener_conexion()
    if not conexion:
        return False

    try:
        cursor = conexion.cursor()

        sql = """
        INSERT INTO lecturas (id_sensor, valor, fecha_hora)
        VALUES (%s, %s, CURRENT_TIMESTAMP)
        """

        for lec in lecturas:
            cursor.execute(sql, (lec['id_sensor'], lec['valor']))

        conexion.commit()
        return True

    except Exception as e:
        print(f"❌ Error DB (IoT): {e}")
        return False

    finally:
        if conexion:
            conexion.close()  



def obtener_resumen_dashboard():
    conexion = obtener_conexion()
    if not conexion:
        return None

    try:
        cursor = conexion.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT COALESCE(SUM(valor), 0) AS total_hoy
            FROM lecturas
            WHERE fecha_hora::date = CURRENT_DATE
        """)
        total_hoy = cursor.fetchone()['total_hoy']

        cursor.execute("""
            SELECT 
                EXTRACT(HOUR FROM fecha_hora) AS hora,
                SUM(valor) AS litros
            FROM lecturas
            WHERE fecha_hora::date = CURRENT_DATE
            GROUP BY hora
            ORDER BY hora ASC
        """)
        por_horas = cursor.fetchall()


        cursor.execute("""
            SELECT s.nombre, SUM(l.valor) AS valor
            FROM lecturas l
            JOIN sensores s ON l.id_sensor = s.id_sensor
            WHERE l.fecha_hora::date = CURRENT_DATE
            GROUP BY s.nombre
        """)
        por_sensor = cursor.fetchall()

        return {
            "total_hoy": float(total_hoy),
            "grafico_barras": por_horas,
            "grafico_dona": por_sensor
        }

    except Exception as e:
        print(f"Error DB (Dashboard): {e}")
        return None

    finally:
        if conexion:
            conexion.close()