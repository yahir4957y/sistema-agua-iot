from models.consumo_model import calcular_metricas_brutas_db, guardar_resumen_diario, guardar_desglose_ml
import datetime
from core.db import obtener_conexion

def generar_cierre_diario(id_hogar, fecha_str=None):
    """
    Orquesta el proceso de cerrar el día:
    1. Calcula el total diario para el Dashboard.
    2. Desglosa el consumo por hora para entrenar la IA (Random Forest).
    3. Registra todo en las tablas correspondientes.
    """
    
    # 1. Validaciones y Manejo de Fecha (Por defecto: Ayer)
    if not fecha_str:
        fecha_obj = datetime.date.today() - datetime.timedelta(days=1)
        fecha_str = fecha_obj.strftime('%Y-%m-%d')
        
    print(f"🔄 [CIERRE] Iniciando procesamiento: Hogar #{id_hogar} | Fecha: {fecha_str}")
    
    # 2. CAPA DE PRESENTACIÓN: Resumen General (Total y Promedio)
    metricas = calcular_metricas_brutas_db(id_hogar, fecha_str)
    
    if not metricas or metricas["total_consumo"] == 0:
        print(f"⚠️ Aviso: No se encontraron lecturas para el día {fecha_str}")
        # No retornamos error necesariamente, solo registramos un día en 0
        total_consumo = 0.0
        promedio = 0.0
    else:
        total_consumo = metricas["total_consumo"]
        promedio = metricas["promedio"]
    
    # Guardamos en consumo_resumen para los gráficos de React
    exito_resumen = guardar_resumen_diario(id_hogar, fecha_str, total_consumo, promedio)

    # 3. CAPA ANALÍTICA: Desglose por Horas (Para alimentar datos_ml)
    conn = None
    try:
        conn = obtener_conexion()
        if conn:
            cur = conn.cursor()
            # Esta query suma el volumen hora por hora directo en PostgreSQL
            cur.execute("""
                SELECT 
                    EXTRACT(HOUR FROM l.fecha_hora) as hora, 
                    COALESCE(SUM(l.volumen), 0) as consumo_hora
                FROM lecturas l
                JOIN sensores s ON l.id_sensor = s.id_sensor
                JOIN dispositivos d ON s.id_dispositivo = d.id_dispositivo
                WHERE d.id_hogar = %s AND DATE(l.fecha_hora) = %s
                GROUP BY hora
                ORDER BY hora ASC
            """, (id_hogar, fecha_str))
            
            filas = cur.fetchall()
            
            # Inicializamos un diccionario con las 24 horas en 0.0
            desglose_horario = {h: 0.0 for h in range(24)}
            for fila in filas:
                hora_int = int(fila[0])
                consumo_val = float(fila[1])
                desglose_horario[hora_int] = consumo_val
            
            # Guardamos el pack de 24 horas en la tabla de Machine Learning
            guardar_desglose_ml(id_hogar, fecha_str, desglose_horario)
            
    except Exception as e:
        print(f"🚨 Error procesando desglose para datos_ml: {str(e)}")
    finally:
        if conn: conn.close()

    if exito_resumen:
        print(f"✅ Cierre exitoso: Dashboard y Dataset de ML actualizados.")
        return {
            "status": 200, 
            "mensaje": "Cierre completado y datos de IA generados.",
            "datos": {"fecha": fecha_str, "total_litros": total_consumo}
        }
    else:
        return {"status": 500, "error": "Fallo al guardar el resumen oficial."}