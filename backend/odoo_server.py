# -*- coding: utf-8 -*-
"""
Mini servidor Flask que actúa de proxy entre el frontend React y Odoo XML-RPC.
Ejecutar: python backend/odoo_server.py
Escucha en: http://localhost:5001
"""
import os
import time
import xmlrpc.client
from flask import Flask, jsonify, request
from flask_cors import CORS

ODOO_URL  = os.environ.get('ODOO_URL',  'https://zazuexpress2.odoo.com')
ODOO_DB   = os.environ.get('ODOO_DB',   'zazuexpress2-prod-27700346')
ODOO_USER = os.environ.get('ODOO_USER', 'overshark08@gmail.com')
ODOO_PASS = os.environ.get('ODOO_PASS', '')

_COMPANY_IDS_RAW = os.environ.get('ODOO_COMPANY_IDS', '8,11')
COMPANY_IDS = [int(x.strip()) for x in _COMPANY_IDS_RAW.split(',') if x.strip()]

app = Flask(__name__)
CORS(app)  # permite llamadas desde localhost:3002 (Vite dev server)

API_SECRET = os.environ.get('ODOO_API_SECRET', '')


def _check_api_key() -> bool:
    if not API_SECRET:
        return True  # sin clave configurada, se permite en desarrollo local
    return request.headers.get('X-Api-Key') == API_SECRET


_uid_cache: int | None = None
_uid_ts: float = 0.0
_UID_TTL = 300.0  # 5 minutos


def _authenticate() -> int:
    global _uid_cache, _uid_ts
    if _uid_cache and (time.monotonic() - _uid_ts) < _UID_TTL:
        return _uid_cache
    common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
    uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASS, {})
    if not uid:
        raise RuntimeError('Autenticación Odoo fallida')
    _uid_cache = uid
    _uid_ts = time.monotonic()
    return uid


def _search_read(models, uid: int, model: str, domain: list, fields: list, limit: int = 0) -> list:
    kwargs = {'fields': fields}
    if limit:
        kwargs['limit'] = limit
    return models.execute_kw(ODOO_DB, uid, ODOO_PASS, model, 'search_read', [domain], kwargs)


@app.route('/api/odoo-stock')
def odoo_stock():
    if not _check_api_key():
        return jsonify({'error': 'No autorizado'}), 401
    try:
        uid = _authenticate()
        models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')

        company_filter = ('company_id', 'in', COMPANY_IDS)

        templates = _search_read(models, uid, 'product.template', [
            company_filter,
            ('name', 'not ilike', 'collar'),
            ('name', 'not ilike', 'producto gratis'),
            ('name', 'not ilike', 'de descuento'),
        ], [
            'id', 'name', 'default_code', 'categ_id', 'company_id', 'active',
        ])
        variants = _search_read(models, uid, 'product.product', [company_filter], [
            'id', 'product_tmpl_id', 'default_code',
            'product_template_attribute_value_ids', 'company_id', 'active',
        ])
        attr_values = _search_read(models, uid, 'product.template.attribute.value', [], [
            'id', 'name', 'attribute_id', 'product_attribute_value_id',
        ])
        quants = _search_read(models, uid, 'stock.quant',
            [company_filter, ('location_id.usage', '=', 'internal')], [
            'id', 'product_id', 'location_id', 'quantity', 'reserved_quantity', 'company_id',
        ])
        locations = _search_read(models, uid, 'stock.location',
            [('usage', '=', 'internal'), ('company_id', 'in', COMPANY_IDS)], [
            'id', 'name', 'complete_name', 'company_id',
        ])
        moves = _search_read(models, uid, 'stock.move',
            [company_filter, ('state', '=', 'done')], [
            'id', 'product_id', 'product_qty', 'date',
            'location_id', 'location_dest_id', 'origin', 'state', 'company_id',
        ], limit=150)

        return jsonify({
            'templates':  templates,
            'variants':   variants,
            'attrValues': attr_values,
            'quants':     quants,
            'locations':  locations,
            'moves':      moves,
        })

    except xmlrpc.client.Fault as e:
        if 'AccessDenied' in e.faultString or 'SessionExpired' in e.faultString:
            global _uid_cache
            _uid_cache = None
        return jsonify({'error': f'Odoo fault: {e.faultString}'}), 502
    except OSError as e:
        return jsonify({'error': f'Red / conexión: {e}'}), 502
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print('Servidor Odoo proxy corriendo en http://localhost:5001')
    app.run(host='127.0.0.1', port=5001, debug=True)
