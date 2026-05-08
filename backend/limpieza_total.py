from datetime import datetime, timedelta
import random
from core.db import obtener_conexion

def reseteo_absoluto_y_recarga(id_hogar=1):
    print("🔥 INICIANDO PURGA TOTAL DE DATOS...")
    conn = obtener_conexion()
    cur = conn.cursor()
    
    try:
        cur.execute("DELETE FROM datos_ml WHERE id_hogar = %s", (id_hogar,))
        cur.execute("DELETE FROM consumo_resumen WHERE id_hogar = %s", (id_hogar,))
        print("✅ Base de datos limpia. Cero fantasmas.")
        
        fecha_inicio = datetime(2026, 4, 24).date()
        fecha_actual = datetime.now().date()
        dias_totales = (fecha_actual - fecha_inicio).days
        
        perfil_horas = [
            0.05, 0.05, 0.05, 0.05, 0.1, 0.2,   
            1.5, 2.0, 1.2, 0.8, 0.5, 0.5,       
            0.8, 1.5, 1.2, 0.8, 0.5, 0.5,       
            1.0, 1.5, 1.8, 1.2, 0.5, 0.1        
        ]
        
        datos_ml_bulk = []
        resumen_bulk = []
        
        print(f"🌱 Calculando 10,000+ datos en la memoria RAM...")
        
        for i in range(dias_totales + 1):
            fecha_sim = fecha_inicio + timedelta(days=i)
            dia_semana = fecha_sim.weekday()
            factor_fin_semana = 1.3 if dia_semana >= 5 else 1.0
            total_diario = 0
            hay_fuga = random.random() < 0.05 
            
            for hora in range(24):
                for bloque_2min in range(30):
                    ruido = random.uniform(0.8, 1.2)
                    consumo = round(perfil_horas[hora] * factor_fin_semana * ruido, 3)
                    
                    if hay_fuga and 2 <= hora <= 4:
                        consumo += random.uniform(2.0, 5.0)
                        
                    total_diario += consumo
                    datos_ml_bulk.append((id_hogar, fecha_sim, consumo, hora, dia_semana))
            
            promedio_diario = round(total_diario / 24, 3)
            resumen_bulk.append((id_hogar, 'diario', fecha_sim, fecha_sim, round(total_diario, 3), promedio_diario))
            
        print(f"🚀 Enviando {len(datos_ml_bulk)} registros a Supabase (en bloques de 1000)...")
        
        # Subiendo datos_ml en bloques con progreso
        tamaño_bloque = 1000
        for i in range(0, len(datos_ml_bulk), tamaño_bloque):
            bloque = datos_ml_bulk[i : i + tamaño_bloque]
            cur.executemany(
                "INSERT INTO datos_ml (id_hogar, fecha, consumo, hora, dia_semana) VALUES (%s, %s, %s, %s, %s)",
                bloque
            )
            print(f"   ⏳ Subidos {min(i + tamaño_bloque, len(datos_ml_bulk))} de {len(datos_ml_bulk)}...")
            
        # Subiendo consumo_resumen
        cur.executemany(
            "INSERT INTO consumo_resumen (id_hogar, tipo_periodo, fecha_inicio, fecha_fin, total_consumo, promedio) VALUES (%s, %s, %s, %s, %s, %s)",
            resumen_bulk
        )
            
        conn.commit()
        print(f"🎉 ¡PERFECTO! Misión cumplida.")

    except Exception as e:
        conn.rollback()
        print(f"🚨 Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    reseteo_absoluto_y_recarga(1)