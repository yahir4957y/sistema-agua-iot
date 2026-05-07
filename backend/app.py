import json
import threading
import time
import datetime

from http.server import BaseHTTPRequestHandler, HTTPServer

from core.db import obtener_conexion

from controllers.auth_controller import procesar_login
from controllers.usuario_controller import gestionar_usuarios_request
from controllers.rol_controller import gestionar_roles_request
from controllers.hogares_controller import gestionar_hogares_get
from controllers.consumo_controller import (
    obtener_historial_consumo,
    procesar_cierre_manual,
)

from models.sensores_model import (
    guardar_multiples_lecturas,
    obtener_resumen_dashboard
)

from services.agregacion_service import generar_cierre_diario


class EnrutadorPrincipal(BaseHTTPRequestHandler):

    # para que el frontend no moleste con cors xd
    def do_OPTIONS(self):

        self.send_response(200, "ok")

        self.send_header('Access-Control-Allow-Origin', '*')

        self.send_header(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS'
        )

        self.send_header(
            "Access-Control-Allow-Headers",
            "X-Requested-With, Content-type, Authorization"
        )

        self.end_headers()

    # helper para responder json
    def _enviar_respuesta(self, respuesta):

        self.send_response(respuesta["status"])

        self.send_header('Content-type', 'application/json')

        self.send_header('Access-Control-Allow-Origin', '*')

        self.end_headers()

        self.wfile.write(
            json.dumps(
                respuesta["body"],
                default=str
            ).encode('utf-8')
        )

    # =========================
    # GET
    # =========================
    def do_GET(self):

        # probar si la bd sigue viva jeje
        if self.path == '/api/test-db':

            conexion = obtener_conexion()

            if conexion:

                respuesta = {
                    "status": 200,
                    "body": {
                        "mensaje": "todo fino con la BD 😎"
                    }
                }

                conexion.close()

            else:

                respuesta = {
                    "status": 500,
                    "body": {
                        "error": "algo murio en la BD"
                    }
                }

            self._enviar_respuesta(respuesta)

        # stats del dashboard
        elif self.path == '/api/dashboard/stats':

            resumen = obtener_resumen_dashboard()

            if resumen is not None:

                self._enviar_respuesta({
                    "status": 200,
                    "body": resumen
                })

            else:

                self._enviar_respuesta({
                    "status": 500,
                    "body": {
                        "error": "error cargando stats"
                    }
                })

        # traer todos los usuarios
        elif self.path == '/api/usuarios':

            resp = gestionar_usuarios_request('GET')

            self._enviar_respuesta(resp)

        # traer usuario por id
        elif self.path.startswith('/api/usuarios/'):

            id_usuario = self.path.split('/')[-1]

            resp = gestionar_usuarios_request(
                'GET',
                id_usuario=id_usuario
            )

            self._enviar_respuesta(resp)

        # traer roles
        elif self.path == '/api/roles':

            resp = gestionar_roles_request('GET')

            self._enviar_respuesta(resp)

        # 🔥 NUEVA RUTA: traer la lista de hogares para el frontend
        elif self.path == '/api/hogares':

            resp = obtener_lista_hogares()

            self._enviar_respuesta(resp)

        # historial de consumo
        elif self.path.startswith('/api/consumo/historial/'):

            id_hogar = self.path.split('/')[-1]

            resp = obtener_historial_consumo(id_hogar)

            self._enviar_respuesta(resp)

        else:

            self.send_response(404)
            self.end_headers()

    # =========================
    # POST
    # =========================
    def do_POST(self):

        content_length = int(
            self.headers.get('Content-Length', 0)
        )

        try:

            datos = (
                json.loads(
                    self.rfile.read(content_length).decode('utf-8')
                )
                if content_length > 0
                else {}
            )

        except json.JSONDecodeError:

            self._enviar_respuesta({
                "status": 400,
                "body": {
                    "error": "json invalido bro"
                }
            })

            return

        # login
        if self.path == '/api/login':

            resp = procesar_login(datos)

            self._enviar_respuesta(resp)

        # crear usuario
        elif self.path == '/api/usuarios':

            resp = gestionar_usuarios_request(
                'POST',
                datos
            )

            self._enviar_respuesta(resp)

        # crear rol
        elif self.path == '/api/roles':

            resp = gestionar_roles_request(
                'POST',
                datos
            )

            self._enviar_respuesta(resp)

        # ejecutar cierre manual
        elif self.path == '/api/consumo/cierre':

            resp = procesar_cierre_manual(datos)

            self._enviar_respuesta(resp)

        # lecturas del esp32
        elif self.path == '/api/iot/lecturas':

            lecturas = datos.get('lecturas', [])

            if not lecturas:

                self._enviar_respuesta({
                    "status": 400,
                    "body": {
                        "error": "no mandaste nada bro"
                    }
                })

                return

            if guardar_multiples_lecturas(lecturas):

                print(
                    f"📡 llegaron {len(lecturas)} "
                    f"lecturas y se guardaron chill"
                )

                self._enviar_respuesta({
                    "status": 201,
                    "body": {
                        "mensaje": "todo guardado"
                    }
                })

            else:

                self._enviar_respuesta({
                    "status": 500,
                    "body": {
                        "error": "fallo guardando en bd"
                    }
                })

        else:

            self.send_response(404)
            self.end_headers()

    # =========================
    # PUT
    # =========================
    def do_PUT(self):

        content_length = int(
            self.headers.get('Content-Length', 0)
        )

        try:

            datos = json.loads(
                self.rfile.read(content_length).decode('utf-8')
            )

        except Exception:

            self._enviar_respuesta({
                "status": 400,
                "body": {
                    "error": "json invalido"
                }
            })

            return

        # actualizar usuario
        if self.path.startswith('/api/usuarios/'):

            id_usuario = self.path.split('/')[-1]

            resp = gestionar_usuarios_request(
                'PUT',
                datos=datos,
                id_usuario=id_usuario
            )

            self._enviar_respuesta(resp)

        # actualizar rol
        elif self.path.startswith('/api/roles/'):

            id_rol = self.path.split('/')[-1]

            resp = gestionar_roles_request(
                'PUT',
                datos=datos,
                id_rol=id_rol
            )

            self._enviar_respuesta(resp)

        else:

            self.send_response(404)
            self.end_headers()

    # =========================
    # DELETE
    # =========================
    def do_DELETE(self):

        # eliminar usuario
        if self.path.startswith('/api/usuarios/'):

            id_usuario = self.path.split('/')[-1]

            resp = gestionar_usuarios_request(
                'DELETE',
                id_usuario=id_usuario
            )

            self._enviar_respuesta(resp)

        # eliminar rol
        elif self.path.startswith('/api/roles/'):

            id_rol = self.path.split('/')[-1]

            resp = gestionar_roles_request(
                'DELETE',
                id_rol=id_rol
            )

            self._enviar_respuesta(resp)

        else:

            self.send_response(404)
            self.end_headers()


# robotcito para hacer el cierre diario automatico
def programar_cierre_diario():

    def tarea_programada():

        while True:

            ahora = datetime.datetime.now()

            # hora objetivo
            objetivo = ahora.replace(
                hour=23,
                minute=59,
                second=0,
                microsecond=0
            )

            # si ya paso esa hora pues mañana xd
            if ahora >= objetivo:
                objetivo += datetime.timedelta(days=1)

            segundos_espera = (
                objetivo - ahora
            ).total_seconds()

            print(
                f"⏰ robot durmiendo "
                f"{segundos_espera / 3600:.1f} horas"
            )

            # el hilo duerme aqui
            time.sleep(segundos_espera)

            print("\n🌙 ejecutando cierre diario...")

            # procesar resumen diario
            generar_cierre_diario(1)

            # mini pausa para evitar doble ejecucion
            time.sleep(60)

    # hilo en segundo plano
    hilo = threading.Thread(
        target=tarea_programada,
        daemon=True
    )

    hilo.start()


# iniciar servidor
def iniciar_servidor(puerto=8000):

    direccion_servidor = ('', puerto)

    httpd = HTTPServer(
        direccion_servidor,
        EnrutadorPrincipal
    )

    # prender robot nocturno
    programar_cierre_diario()

    print(f" backend corriendo en:")
    print(f"http://localhost:{puerto}")

    httpd.serve_forever()


if __name__ == '__main__':

    iniciar_servidor()