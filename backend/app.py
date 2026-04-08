import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from core.db import obtener_conexion

# Controladores
from controllers.auth_controller import procesar_login
from controllers.usuario_controller import gestionar_usuarios_request
from controllers.rol_controller import gestionar_roles_request  # ¡NUEVO IMPORT PARA ROLES!

class EnrutadorPrincipal(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        # Añadimos PUT y DELETE a los métodos permitidos
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-type, Authorization")
        self.end_headers()

    # Respuestas
    def _enviar_respuesta(self, respuesta):
        self.send_response(respuesta["status"])
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(respuesta["body"]).encode('utf-8'))

    # =========================
    # PETICIONES GET (Leer)
    # =========================
    def do_GET(self):
        if self.path == '/api/test-db':
            conexion = obtener_conexion()
            if conexion:
                respuesta = {"status": 200, "body": {"mensaje": "¡Conexión impecable, bro!"}}
                conexion.close()
            else:
                respuesta = {"status": 500, "body": {"error": "Fallo la conexión"}}
            self._enviar_respuesta(respuesta)

        # --- Rutas de Usuarios ---
        elif self.path == '/api/usuarios':
            resp = gestionar_usuarios_request('GET')
            self._enviar_respuesta(resp)

        elif self.path.startswith('/api/usuarios/'):
            id_usuario = self.path.split('/')[-1]
            resp = gestionar_usuarios_request('GET', id_usuario=id_usuario)
            self._enviar_respuesta(resp)

        # --- Rutas de Roles (¡NUEVO!) ---
        elif self.path == '/api/roles':
            resp = gestionar_roles_request('GET')
            self._enviar_respuesta(resp)

        else:
            self.send_response(404)
            self.end_headers()

    # =========================
    # PETICIONES POST (Crear)
    # =========================
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        datos = json.loads(self.rfile.read(content_length).decode('utf-8')) if content_length > 0 else {}

        if self.path == '/api/login':
            resp = procesar_login(datos)
            self._enviar_respuesta(resp)

        # --- Rutas de Usuarios ---
        elif self.path == '/api/usuarios':
            resp = gestionar_usuarios_request('POST', datos)
            self._enviar_respuesta(resp)

        # --- Rutas de Roles (¡NUEVO!) ---
        elif self.path == '/api/roles':
            resp = gestionar_roles_request('POST', datos)
            self._enviar_respuesta(resp)

        else:
            self.send_response(404)
            self.end_headers()

    # =========================
    # PETICIONES PUT (Editar)
    # =========================
    def do_PUT(self):
        # --- Rutas de Usuarios ---
        if self.path.startswith('/api/usuarios/'):
            id_usuario = self.path.split('/')[-1] 
            content_length = int(self.headers.get('Content-Length', 0))
            datos = json.loads(self.rfile.read(content_length).decode('utf-8'))
            
            resp = gestionar_usuarios_request('PUT', datos=datos, id_usuario=id_usuario)
            self._enviar_respuesta(resp)

        # --- Rutas de Roles (¡NUEVO!) ---
        elif self.path.startswith('/api/roles/'):
            id_rol = self.path.split('/')[-1]
            content_length = int(self.headers.get('Content-Length', 0))
            datos = json.loads(self.rfile.read(content_length).decode('utf-8'))
            
            resp = gestionar_roles_request('PUT', datos=datos, id_rol=id_rol)
            self._enviar_respuesta(resp)

        else:
            self.send_response(404)
            self.end_headers()

    # =========================
    # PETICIONES DELETE (Eliminar)
    # =========================
    def do_DELETE(self):
        # --- Rutas de Usuarios ---
        if self.path.startswith('/api/usuarios/'):
            id_usuario = self.path.split('/')[-1]
            resp = gestionar_usuarios_request('DELETE', id_usuario=id_usuario)
            self._enviar_respuesta(resp)

        # --- Rutas de Roles (¡NUEVO!) ---
        elif self.path.startswith('/api/roles/'):
            id_rol = self.path.split('/')[-1]
            resp = gestionar_roles_request('DELETE', id_rol=id_rol)
            self._enviar_respuesta(resp)

        else:
            self.send_response(404)
            self.end_headers()

# Iniciar servidor
def iniciar_servidor(puerto=8000):
    direccion_servidor = ('', puerto)
    httpd = HTTPServer(direccion_servidor, EnrutadorPrincipal)
    print(f"Backend Pro corriendo en http://localhost:{puerto}")
    httpd.serve_forever()

if __name__ == '__main__':
    iniciar_servidor()