/**
 * Llamadas directas a Odoo XML-RPC desde el browser.
 * Funciona solo si Odoo tiene CORS habilitado para el dominio del frontend.
 */

const ODOO_URL  = import.meta.env.VITE_ODOO_URL  ?? 'https://zazuexpress2.odoo.com';
const ODOO_DB   = import.meta.env.VITE_ODOO_DB   ?? '';
const ODOO_USER = import.meta.env.VITE_ODOO_USER ?? '';
const ODOO_PASS = import.meta.env.VITE_ODOO_PASS ?? '';

const COMPANY_IDS = [8, 11];

// ── XML-RPC helpers ───────────────────────────────────────────────────────────

function xmlValue(val: unknown): string {
  if (val === null || val === undefined) return '<value><boolean>0</boolean></value>';
  if (typeof val === 'boolean') return `<value><boolean>${val ? 1 : 0}</boolean></value>`;
  if (typeof val === 'number') return Number.isInteger(val)
    ? `<value><int>${val}</int></value>`
    : `<value><double>${val}</double></value>`;
  if (typeof val === 'string') return `<value><string>${val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</string></value>`;
  if (Array.isArray(val)) return `<value><array><data>${val.map(xmlValue).join('')}</data></array></value>`;
  if (typeof val === 'object') {
    const members = Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `<member><name>${k}</name>${xmlValue(v)}</member>`)
      .join('');
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${String(val)}</string></value>`;
}

function buildXmlRpcCall(method: string, params: unknown[]): string {
  return `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>${params.map(p => `<param>${xmlValue(p)}</param>`).join('')}</params>
</methodCall>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseXmlRpcResponse(xml: string): any {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const fault = doc.querySelector('fault');
  if (fault) {
    const msg = fault.querySelector('string')?.textContent ?? 'Odoo XML-RPC fault';
    throw new Error(msg);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function parseValue(node: Element): any {
    const child = node.firstElementChild;
    if (!child) return node.textContent ?? '';

    switch (child.tagName) {
      case 'string':   return child.textContent ?? '';
      case 'int':
      case 'i4':       return parseInt(child.textContent ?? '0', 10);
      case 'double':   return parseFloat(child.textContent ?? '0');
      case 'boolean':  return child.textContent === '1';
      case 'nil':      return false;
      case 'array': {
        const data = child.querySelector('data');
        if (!data) return [];
        return Array.from(data.children).map(parseValue);
      }
      case 'struct': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: Record<string, any> = {};
        for (const member of Array.from(child.children)) {
          const name  = member.querySelector('name')?.textContent ?? '';
          const value = member.querySelector('value');
          obj[name] = value ? parseValue(value) : null;
        }
        return obj;
      }
      default: return child.textContent ?? '';
    }
  }

  const valueNode = doc.querySelector('methodResponse > params > param > value');
  if (!valueNode) throw new Error('Respuesta XML-RPC vacía');
  return parseValue(valueNode);
}

async function xmlrpc(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const body = buildXmlRpcCall(method, params);
  const res = await fetch(`${ODOO_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${endpoint}`);
  const text = await res.text();
  return parseXmlRpcResponse(text);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function authenticate(): Promise<number> {
  const uid = await xmlrpc('/xmlrpc/2/common', 'authenticate', [
    ODOO_DB, ODOO_USER, ODOO_PASS, {},
  ]);
  if (!uid || typeof uid !== 'number') throw new Error('Autenticación Odoo fallida');
  return uid;
}

// ── search_read ───────────────────────────────────────────────────────────────

async function searchRead(
  uid: number,
  model: string,
  domain: unknown[],
  fields: string[],
  limit = 0,
): Promise<unknown[]> {
  const kwargs: Record<string, unknown> = { fields };
  if (limit) kwargs['limit'] = limit;

  const result = await xmlrpc('/xmlrpc/2/object', 'execute_kw', [
    ODOO_DB, uid, ODOO_PASS,
    model, 'search_read',
    [domain],
    kwargs,
  ]);
  return result as unknown[];
}

// ── Main fetch ────────────────────────────────────────────────────────────────

import type { OdooAll } from './odooService';

export async function fetchOdooAllDirect(): Promise<OdooAll> {
  const uid = await authenticate();

  const companyFilter = ['company_id', 'in', COMPANY_IDS];

  const [templates, variants, attrValues, quants, locations, moves] = await Promise.all([
    searchRead(uid, 'product.template', [
      companyFilter,
      ['name', 'not ilike', 'collar'],
      ['name', 'not ilike', 'producto gratis'],
      ['name', 'not ilike', 'de descuento'],
    ], ['id', 'name', 'default_code', 'categ_id', 'company_id', 'active']),

    searchRead(uid, 'product.product', [companyFilter], [
      'id', 'product_tmpl_id', 'default_code',
      'product_template_attribute_value_ids', 'company_id', 'active',
    ]),

    searchRead(uid, 'product.template.attribute.value', [], [
      'id', 'name', 'attribute_id', 'product_attribute_value_id',
    ]),

    searchRead(uid, 'stock.quant', [
      companyFilter, ['location_id.usage', '=', 'internal'],
    ], ['id', 'product_id', 'location_id', 'quantity', 'reserved_quantity', 'company_id']),

    searchRead(uid, 'stock.location', [
      ['usage', '=', 'internal'], ['company_id', 'in', COMPANY_IDS],
    ], ['id', 'name', 'complete_name', 'company_id']),

    searchRead(uid, 'stock.move', [
      companyFilter, ['state', '=', 'done'],
    ], ['id', 'product_id', 'product_qty', 'date',
        'location_id', 'location_dest_id', 'origin', 'state', 'company_id'], 150),
  ]);

  return {
    templates:  templates  as OdooAll['templates'],
    variants:   variants   as OdooAll['variants'],
    attrValues: attrValues as OdooAll['attrValues'],
    quants:     quants     as OdooAll['quants'],
    locations:  locations  as OdooAll['locations'],
    moves:      moves      as OdooAll['moves'],
  };
}
