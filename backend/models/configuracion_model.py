from core.db import obtener_conexion

def obtener_configuracion_db(id_hogar):
    conn = None
    cur = None
    try:
        conn = obtener_conexion()
        if conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT meta_diaria, meta_mensual, notificaciones_web, 
                       notificaciones_email, alerta_fugas
                FROM configuracion_hogar
                WHERE id_hogar = %s
            """, (id_hogar,))
            row = cur.fetchone()
            
            if row:
                return {
                    "meta_diaria": float(row[0]),
                    "meta_mensual": float(row[1]),
                    "notificaciones_web": bool(row[2]),
                    "notificaciones_email": bool(row[3]),
                    "alerta_fugas": bool(row[4])
                }
            return None
    except Exception as e:
        print(f"🚨 Error BD obteniendo config: {str(e)}")
        return None
    finally:
        if cur: cur.close()
        if conn: conn.close()

def actualizar_configuracion_db(id_hogar, datos):
    conn = None
    cur = None
    try:
        conn = obtener_conexion()
        if conn:
            cur = conn.cursor()
            # Actualizamos o insertamos si no existe (Upsert)
            cur.execute("""
                INSERT INTO configuracion_hogar 
                (id_hogar, meta_diaria, meta_mensual, notificaciones_web, notificaciones_email, alerta_fugas, fecha_actualizacion)
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (id_hogar) 
                DO UPDATE SET 
                    meta_diaria = EXCLUDED.meta_diaria,
                    meta_mensual = EXCLUDED.meta_mensual,
                    notificaciones_web = EXCLUDED.notificaciones_web,
                    notificaciones_email = EXCLUDED.notificaciones_email,
                    alerta_fugas = EXCLUDED.alerta_fugas,
                    fecha_actualizacion = CURRENT_TIMESTAMP;
            """, (
                id_hogar, 
                datos.get('meta_diaria', 400.0), 
                datos.get('meta_mensual', 12000.0), 
                datos.get('notificaciones_web', True), 
                datos.get('notificaciones_email', False), 
                datos.get('alerta_fugas', True)
            ))
            conn.commit()
            return True
    except Exception as e:
        if conn: conn.rollback()
        print(f"Error BD actualizando config: {str(e)}")
        return False
    finally:
        if cur: cur.close()
        if conn: conn.close()