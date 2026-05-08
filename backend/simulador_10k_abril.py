import random
from datetime import datetime, timedelta
from core.db import obtener_conexion

def generar_dataset_10k_abril(id_hogar=1):
    """
    Genera ~10,000 registros desde el 24 de abril de 2026.
    Frecuencia: Cada 2 minutos (30 registros por hora).
    """
    # Fecha exacta de inicio de tu prototipo
    fecha_inicio = datetime(2026, 4, 24).date()
    fecha_actual = datetime.now().date()
    dias_totales = (fecha_actual - fecha_inicio).days
    
    print(f"🚀 Iniciando pre-entrenamiento ML: Recopilando desde el {fecha_inicio}...")
    
    conn = obtener_conexion()
    if not conn:
        print("🚨 Error: Base de datos no conectada.")
        return
        
    cur = conn.cursor()
    
    # Perfil base de consumo en Litros (por cada bloque de 2 minutos)
    perfil_horas = [
        0.05, 0.05, 0.05, 0.05, 0.1, 0.2,   # Madrugada (0-5)
        1.5, 2.0, 1.2, 0.8, 0.5, 0.5,       # Mañana (6-11)
        0.8, 1.5, 1.2, 0.8, 0.5, 0.5,       # Tarde (12-17)
        1.0, 1.5, 1.8, 1.2, 0.5, 0.1        # Noche (18-23)
    ]

    try:
        print("🧹 Limpiando historial previo para un corte limpio...")
        cur.execute("DELETE FROM datos_ml WHERE id_hogar = %s", (id_hogar,))
        cur.execute("DELETE FROM consumo_resumen WHERE id_hogar = %s AND tipo_periodo = 'diario'", (id_hogar,))
        
        registros_ml = 0
        
        for i in range(dias_totales + 1):
            fecha_sim = fecha_inicio + timedelta(days=i)
            dia_semana = fecha_sim.weekday() # 0 = Lunes, 6 = Domingo
            
            factor_fin_semana = 1.3 if dia_semana >= 5 else 1.0
            total_diario = 0
            
            # Fuga aleatoria para que el modelo aprenda a detectarlas (5% probabilidad)
            hay_fuga = random.random() < 0.05 
            
            for hora in range(24):
                # Generamos 30 registros por hora (cada 2 minutos)
                for bloque_2min in range(30):
                    ruido = random.uniform(0.8, 1.2)
                    consumo = round(perfil_horas[hora] * factor_fin_semana * ruido, 3)
                    
                    # Inyección de fuga en la madrugada
                    if hay_fuga and 2 <= hora <= 4:
                        consumo += random.uniform(2.0, 5.0)
                        
                    total_diario += consumo
                    
                    # Insertamos el bloque de 2 minutos en la tabla de la IA
                    cur.execute(
                        """INSERT INTO datos_ml (id_hogar, fecha, consumo, hora, dia_semana) 
                           VALUES (%s, %s, %s, %s, %s)""",
                        (id_hogar, fecha_sim, consumo, hora, dia_semana)
                    )
                    registros_ml += 1
            
            # Insertamos el total del día para tu React
            promedio_diario = round(total_diario / 24, 3)
            cur.execute(
                """INSERT INTO consumo_resumen 
                   (id_hogar, tipo_periodo, fecha_inicio, fecha_fin, total_consumo, promedio) 
                   VALUES (%s, 'diario', %s, %s, %s, %s)""",
                (id_hogar, fecha_sim, fecha_sim, round(total_diario, 3), promedio_diario)
            )
            print(f"✅ Día {fecha_sim} completado.")

        conn.commit()
        print(f"\n🎉 ¡ÉXITO! Se recopilaron {registros_ml} registros en 'datos_ml'.")
        print("Tus 10,000 datos exactos están listos para tu defensa de mañana.")

    except Exception as e:
        conn.rollback()
        print(f"🚨 Error: {str(e)}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    generar_dataset_10k_abril(id_hogar=1)