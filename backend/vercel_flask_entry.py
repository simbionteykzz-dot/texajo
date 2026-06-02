from odoo_server import app as flask_application


class _VercelPathFix:
    """Normaliza PATH_INFO cuando Vercel entrega rutas como /api/index.py/..."""
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '')
        # Vercel puede entregar /api/index.py/odoo-stock → normalizar a /api/odoo-stock
        if '/index.py/' in path:
            environ['PATH_INFO'] = '/api/' + path.split('/index.py/', 1)[-1]
        elif path == '/index.py' or path == '/api/index.py':
            environ['PATH_INFO'] = '/api/'
        return self.wsgi_app(environ, start_response)


flask_application.wsgi_app = _VercelPathFix(flask_application.wsgi_app)
app = flask_application
