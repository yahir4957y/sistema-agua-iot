import random
from datetime import datetime, timedelta
from core.db import obtener_conexion

def generar_datos_entrenamiento(id_hogar=1, dias_atras=90):
    """
    Simula 90 días de historial de consumo de agua.
    Crea patrones realistas para que el modelo de ML pueda aprender.
    """
    print(f"🚀 Iniciando simulación de {dias_atras} días de datos...")
    
    conn = obtener_conexion()
    if not conn:
        print("🚨 Error: No se pudo conectar a la base de datos.")
        return
        
    cur = conn.cursor()
    fecha_actual = datetime.now().date()
    
    # Patrones de consumo base por hora (Litros promedio por hora)
    # Madrugada (0-5): Poco uso, Mañana (6-9): Duchas/Desayuno, Tarde (13-15): Almuerzo, Noche (19-22): Cena/Aseo
    patron_horas = [
        2, 1, 1, 1, 2, 5,       # 00:00 - 05:00
        25, 35, 20, 15, 10, 15, # 06:00 - 11:00
        20, 30, 25, 15, 10, 12, # 12:00 - 17:00
        15, 25, 30, 20, 10, 5   # 18:00 - 23:00
    ]

    try:
        # Limpiamos datos viejos generados por simulaciones anteriores (opcional, para no duplicar)
        cur.execute("DELETE FROM datos_ml WHERE id_hogar = %s", (id_hogar,))
        cur.execute("DELETE FROM consumo_resumen WHERE id_hogar = %s AND tipo_periodo = 'diario'", (id_hogar,))
        
        total_registros_ml = 0
        
        for i in range(dias_atras, 0, -1):
            fecha_simulada = fecha_actual - timedelta(days=i)
            dia_semana = fecha_simulada.weekday() # 0 = Lunes, 6 = Domingo
            
            # Los fines de semana (5 y 6) se gasta un poco más de agua (factor 1.2)
            factor_dia = 1.2 if dia_semana >= 5 else 1.0
            
            total_dia_litros = 0
            
            # Simulamos posibles "fugas" aleatorias (10% de probabilidad por día)
            hay_fuga = random.random() < 0.10 
            
            for hora in range(24):
                # Calculamos el consumo con un poco de aleatoriedad (ruido estadístico)
                consumo_base = patron_horas[hora] * factor_dia
                variacion = random.uniform(0.8, 1.2) # Variación del 20%
                consumo_hora = round(consumo_base * variacion, 3)
                
                # Si hay fuga, agregamos consumo anormal en la madrugada (2 AM a 5 AM)
                if hay_fuga and 2 <= hora <= 5:
                    consumo_hora += random.uniform(30, 50) 
                
                total_dia_litros += consumo_hora
                
                # 1. Insertar en la tabla para Machine Learning
                cur.execute(
                    """INSERT INTO datos_ml (id_hogar, fecha, consumo, hora, dia_semana) 
                       VALUES (%s, %s, %s, %s, %s)""",
                    (id_hogar, fecha_simulada, consumo_hora, hora, dia_semana)
                )
                total_registros_ml += 1
            
            # 2. Insertar el total del día en consumo_resumen (Para tu gráfico de React)
            promedio_hora = round(total_dia_litros / 24, 3)
            cur.execute(
                """INSERT INTO consumo_resumen 
                   (id_hogar, tipo_periodo, fecha_inicio, fecha_fin, total_consumo, promedio) 
                   VALUES (%s, 'diario', %s, %s, %s, %s)""",
                (id_hogar, fecha_simulada, fecha_simulada, round(total_dia_litros, 3), promedio_hora)
            )
            
            # Pequeño log visual en la consola
            if i % 10 == 0:
                print(f"⏳ Procesando datos del {fecha_simulada}... (Faltan {i} días)")

        conn.commit()
        print(f"✅ ¡Simulación exitosa! Se generaron {total_registros_ml} registros para ML y {dias_atras} resúmenes diarios.")

    except Exception as e:
        conn.rollback()
        print(f"🚨 Error durante la simulación: {str(e)}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    # Ejecutamos la simulación para el hogar 1, 90 días atrás
    generar_datos_entrenamiento(1, 90)