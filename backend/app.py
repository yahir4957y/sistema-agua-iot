import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from core.db import obtener_conexion
from controllers.auth_controller import procesar_login
from controllers.usuario_controller import gestionar_usuarios_request
from controllers.rol_controller import gestionar_roles_request
from models.sensores_model import guardar_multiples_lecturas, obtener_resumen_dashboard 


class EnrutadorPrincipal(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-type, Authorization")
        self.end_headers()

    def _enviar_respuesta(self, respuesta):
        self.send_response(respuesta["status"])
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(respuesta["body"], default=str).encode('utf-8'))


    def do_GET(self):

        # probando si la bd esta viva xd
        if self.path == '/api/test-db':
            conexion = obtener_conexion()
            if conexion:
                respuesta = {"status": 200, "body": {"mensaje": "todo fino con la BD 😎"}}
                conexion.close()
            else:
                respuesta = {"status": 500, "body": {"error": "algo murio en la BD"}}
            self._enviar_respuesta(respuesta)

        elif self.path == '/api/dashboard/stats':
            resumen = obtener_resumen_dashboard()
            if resumen is not None:
                self._enviar_respuesta({"status": 200, "body": resumen})
            else:
                self._enviar_respuesta({"status": 500, "body": {"error": "Error al cargar stats"}})

        # usuarios
        elif self.path == '/api/usuarios':
            resp = gestionar_usuarios_request('GET')
            self._enviar_respuesta(resp)

        elif self.path.startswith('/api/usuarios/'):
            id_usuario = self.path.split('/')[-1]
            resp = gestionar_usuarios_request('GET', id_usuario=id_usuario)
            self._enviar_respuesta(resp)

        # roles
        elif self.path == '/api/roles':
            resp = gestionar_roles_request('GET')
            self._enviar_respuesta(resp)

        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        
        try:
            datos = json.loads(self.rfile.read(content_length).decode('utf-8')) if content_length > 0 else {}
        except json.JSONDecodeError:
            self._enviar_respuesta({"status": 400, "body": {"error": "JSON inválido o corrupto bro"}})
            return

        # login 
        if self.path == '/api/login':
            resp = procesar_login(datos)
            self._enviar_respuesta(resp)

        # crear 
        elif self.path == '/api/usuarios':
            resp = gestionar_usuarios_request('POST', datos)
            self._enviar_respuesta(resp)


        elif self.path == '/api/roles':
            resp = gestionar_roles_request('POST', datos)
            self._enviar_respuesta(resp)


        elif self.path == '/api/iot/lecturas':
            lecturas = datos.get('lecturas', [])

            if not lecturas:
                self._enviar_respuesta({"status": 400, "body": {"error": "no mandaste nada bro"}})
                return

            if guardar_multiples_lecturas(lecturas):
                print(f"📡 llegaron {len(lecturas)} lecturas y se guardaron chill")
                self._enviar_respuesta({"status": 201, "body": {"mensaje": "todo guardado"}})
            else:
                self._enviar_respuesta({"status": 500, "body": {"error": "fallo guardando en BD"}})

        else:
            self.send_response(404)
            self.end_headers()

    def do_PUT(self):
        content_length = int(self.headers.get('Content-Length', 0))
        try:
            datos = json.loads(self.rfile.read(content_length).decode('utf-8'))
        except:
            self._enviar_respuesta({"status": 400, "body": {"error": "JSON inválido"}})
            return

        # actualizar usuario
        if self.path.startswith('/api/usuarios/'):
            id_usuario = self.path.split('/')[-1]
            resp = gestionar_usuarios_request('PUT', datos=datos, id_usuario=id_usuario)
            self._enviar_respuesta(resp)

        # actualizar rol
        elif self.path.startswith('/api/roles/'):
            id_rol = self.path.split('/')[-1]
            resp = gestionar_roles_request('PUT', datos=datos, id_rol=id_rol)
            self._enviar_respuesta(resp)

        else:
            self.send_response(404)
            self.end_headers()

    def do_DELETE(self):

        # eliminar usuario
        if self.path.startswith('/api/usuarios/'):
            id_usuario = self.path.split('/')[-1]
            resp = gestionar_usuarios_request('DELETE', id_usuario=id_usuario)
            self._enviar_respuesta(resp)

        # eliminar rol
        elif self.path.startswith('/api/roles/'):
            id_rol = self.path.split('/')[-1]
            resp = gestionar_roles_request('DELETE', id_rol=id_rol)
            self._enviar_respuesta(resp)

        else:
            self.send_response(404)
            self.end_headers()



def iniciar_servidor(puerto=8000):
    direccion_servidor = ('', puerto)
    httpd = HTTPServer(direccion_servidor, EnrutadorPrincipal)
    print(f"backend corriendo en http://localhost:{puerto}")
    httpd.serve_forever()


if __name__ == '__main__':
    iniciar_servidor()