import datetime

from core.db import obtener_conexion


def calcular_metricas_brutas_db(id_hogar, fecha_objetivo):

    conn = None
    cur = None

    try:

        conn = obtener_conexion()

        if conn:

            cur = conn.cursor()

            query = """
                SELECT 
                    COALESCE(SUM(l.volumen), 0) AS total_consumo,
                    COALESCE(AVG(l.volumen), 0) AS promedio
                FROM lecturas l
                JOIN sensores s
                    ON l.id_sensor = s.id_sensor
                JOIN dispositivos d
                    ON s.id_dispositivo = d.id_dispositivo
                WHERE d.id_hogar = %s
                  AND DATE(l.fecha_hora) = %s
            """

            cur.execute(
                query,
                (id_hogar, fecha_objetivo)
            )

            resultado = cur.fetchone()

            return {
                "total_consumo": float(resultado[0]),
                "promedio": float(resultado[1])
            }

    except Exception as e:

        print(f"error calculando metricas: {str(e)}")

        return None

    finally:

        if cur:
            cur.close()

        if conn:
            conn.close()


def guardar_resumen_diario(
    id_hogar,
    fecha,
    total_consumo,
    promedio
):

    conn = None
    cur = None

    try:

        conn = obtener_conexion()

        if conn:

            cur = conn.cursor()

            # revisar si ya existe
            cur.execute(
                """
                SELECT id_resumen
                FROM consumo_resumen
                WHERE id_hogar = %s
                  AND fecha_inicio = %s
                  AND tipo_periodo = 'diario'
                """,
                (id_hogar, fecha)
            )

            registro = cur.fetchone()

            # update
            if registro:

                cur.execute(
                    """
                    UPDATE consumo_resumen
                    SET total_consumo = %s,
                        promedio = %s
                    WHERE id_resumen = %s
                    """,
                    (
                        total_consumo,
                        promedio,
                        registro[0]
                    )
                )

            # insert
            else:

                cur.execute(
                    """
                    INSERT INTO consumo_resumen (
                        id_hogar,
                        tipo_periodo,
                        fecha_inicio,
                        fecha_fin,
                        total_consumo,
                        promedio
                    )
                    VALUES (
                        %s,
                        'diario',
                        %s,
                        %s,
                        %s,
                        %s
                    )
                    """,
                    (
                        id_hogar,
                        fecha,
                        fecha,
                        total_consumo,
                        promedio
                    )
                )

            conn.commit()

            return True

    except Exception as e:

        if conn:
            conn.rollback()

        print(f"error guardando resumen: {str(e)}")

        return False

    finally:

        if cur:
            cur.close()

        if conn:
            conn.close()


def obtener_resumenes_bd(id_hogar, limite=30):
    conn = None
    cur = None
    try:
        conn = obtener_conexion()
        if conn:
            cur = conn.cursor()
            # Hacemos un JOIN para traer el nombre del hogar
            query = """
                SELECT r.id_resumen, r.fecha_inicio, r.total_consumo, r.promedio, h.nombre as nombre_hogar
                FROM consumo_resumen r
                JOIN hogares h ON r.id_hogar = h.id_hogar
                WHERE r.id_hogar = %s AND r.tipo_periodo = 'diario'
                ORDER BY r.fecha_inicio DESC 
                LIMIT %s
            """
            cur.execute(query, (id_hogar, limite))
            filas = cur.fetchall()
            
            resumenes = []
            for f in filas:
                resumenes.append({
                    "id_resumen": f[0],
                    "fecha": f[1].strftime('%Y-%m-%d') if f[1] else None,
                    "total_consumo": float(f[2]),
                    "promedio": float(f[3]),
                    "nombre_hogar": f[4] # <--- ¡Dato vital para el Admin!
                })
            return resumenes

    except Exception as e:

        print(f"error obteniendo resumenes: {str(e)}")

        return None

    finally:

        if cur:
            cur.close()

        if conn:
            conn.close()


def guardar_desglose_ml(
    id_hogar,
    fecha,
    datos_por_hora
):

    conn = None
    cur = None

    try:

        conn = obtener_conexion()

        if conn:

            cur = conn.cursor()

            fecha_obj = datetime.datetime.strptime(
                fecha,
                '%Y-%m-%d'
            )

            dia_semana = fecha_obj.weekday()

            for hora, consumo in datos_por_hora.items():

                cur.execute(
                    """
                    INSERT INTO datos_ml (
                        id_hogar,
                        fecha,
                        consumo,
                        hora,
                        dia_semana
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        id_hogar,
                        fecha,
                        consumo,
                        hora,
                        dia_semana
                    )
                )

            conn.commit()

            return True

    except Exception as e:

        if conn:
            conn.rollback()

        print(f"error guardando datos ml: {str(e)}")

        return False

    finally:

        if cur:
            cur.close()

        if conn:
            conn.close()