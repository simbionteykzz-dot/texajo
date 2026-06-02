# -*- coding: utf-8 -*-
"""
Mini servidor Flask que actúa de proxy entre el frontend React y Odoo XML-RPC.
Ejecutar: python backend/odoo_server.py
Escucha en: http://localhost:5001
"""
import xmlrpc.client
from flask import Flask, jsonify
from flask_cors import CORS

ODOO_URL  = 'https://zazuexpress2.odoo.com'
ODOO_DB   = 'zazuexpress2-prod-27700346'
ODOO_USER = 'overshark08@gmail.com'
ODOO_PASS = 'Bv992282883@'

COMPANY_IDS = [5, 8]

app = Flask(__name__)
CORS(app)  # permite llamadas desde localhost:3002 (Vite dev server)


def _authenticate() -> int:
    common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
    uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASS, {})
    if not uid:
        raise RuntimeError('Autenticación Odoo fallida')
    return uid


def _search_read(models, uid: int, model: str, domain: list, fields: list, limit: int = 0) -> list:
    kwargs = {'fields': fields}
    if limit:
        kwargs['limit'] = limit
    return models.execute_kw(ODOO_DB, uid, ODOO_PASS, model, 'search_read', [domain], kwargs)


@app.route('/api/odoo-stock')
def odoo_stock():
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
