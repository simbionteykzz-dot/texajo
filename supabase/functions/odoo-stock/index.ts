import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ODOO_URL  = Deno.env.get('ODOO_URL')      ?? 'https://zazuexpress2.odoo.com';
const ODOO_DB   = Deno.env.get('ODOO_DB')       ?? 'zazuexpress2-prod-27700346';
const ODOO_USER = Deno.env.get('ODOO_USER')     ?? 'overshark08@gmail.com';
const ODOO_KEY  = Deno.env.get('ODOO_API_KEY')  ?? '5f57c210c5c4aa3aa697093e00a8d3d29319e698';

const COMPANY_IDS = [5, 8, 11];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── XML-RPC helpers ──────────────────────────────────────────────────────────

function xmlValue(val: unknown): string {
  if (val === null || val === undefined) return '<value><boolean>0</boolean></value>';
  if (typeof val === 'boolean') return `<value><boolean>${val ? 1 : 0}</boolean></value>`;
  if (typeof val === 'number') return Number.isInteger(val)
    ? `<value><int>${val}</int></value>`
    : `<value><double>${val}</double></value>`;
  if (typeof val === 'string') return `<value><string>${val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</string></value>`;
  if (Array.isArray(val)) return `<value><array><data>${val.map(xmlValue).join('')}</data></array></value>`;
  if (typeof val === 'object') {
    const members = Object.entries(val as Record<string,unknown>)
      .map(([k,v]) => `<member><name>${k}</name>${xmlValue(v)}</member>`)
      .join('');
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${String(val)}</string></value>`;
}

function buildCall(method: string, params: unknown[]): string {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${
    params.map(p => `<param>${xmlValue(p)}</param>`).join('')
  }</params></methodCall>`;
}

function parseXmlValue(node: Element): unknown {
  const child = node.firstElementChild;
  if (!child) return node.textContent?.trim() ?? '';
  const tag = child.tagName.toLowerCase();
  if (tag === 'string') return child.textContent ?? '';
  if (tag === 'int' || tag === 'i4' || tag === 'i8') return parseInt(child.textContent ?? '0', 10);
  if (tag === 'double') return parseFloat(child.textContent ?? '0');
  if (tag === 'boolean') return child.textContent?.trim() === '1';
  if (tag === 'nil') return null;
  if (tag === 'array') {
    const data = child.querySelector('data');
    if (!data) return [];
    return Array.from(data.children).map(v => parseXmlValue(v));
  }
  if (tag === 'struct') {
    const obj: Record<string, unknown> = {};
    child.querySelectorAll(':scope > member').forEach(m => {
      const name = m.querySelector(':scope > name')?.textContent ?? '';
      const val  = m.querySelector(':scope > value');
      obj[name] = val ? parseXmlValue(val) : null;
    });
    return obj;
  }
  return child.textContent ?? '';
}

function parseXmlRpcResponse(xml: string): unknown {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const fault = doc.querySelector('fault');
  if (fault) {
    const v = fault.querySelector('value');
    const err = v ? parseXmlValue(v) as Record<string,unknown> : {};
    throw new Error(`Odoo fault ${err.faultCode}: ${err.faultString}`);
  }
  const param = doc.querySelector('params > param > value');
  if (!param) throw new Error('Empty XML-RPC response');
  return parseXmlValue(param);
}

async function xmlRpc(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const body = buildCall(method, params);
  const res = await fetch(`${ODOO_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} calling ${endpoint}`);
  const text = await res.text();
  return parseXmlRpcResponse(text);
}

// ── Odoo calls ───────────────────────────────────────────────────────────────

async function authenticate(): Promise<number> {
  const uid = await xmlRpc('/web/xmlrpc/2/common', 'authenticate', [
    ODOO_DB, ODOO_USER, ODOO_KEY, {},
  ]);
  if (typeof uid !== 'number' || uid === 0) throw new Error('Autenticación Odoo fallida');
  return uid;
}

async function searchRead(
  uid: number,
  model: string,
  domain: unknown[],
  fields: string[],
  limit = 0,
): Promise<unknown[]> {
  const kwargs: Record<string, unknown> = { fields };
  if (limit > 0) kwargs.limit = limit;
  const result = await xmlRpc('/web/xmlrpc/2/object', 'execute_kw', [
    ODOO_DB, uid, ODOO_KEY,
    model, 'search_read',
    [domain],
    kwargs,
  ]);
  return result as unknown[];
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const uid = await authenticate();

    const companyFilter = ['company_id', 'in', COMPANY_IDS];

    const [templates, variants, attrValues, quants, locations, moves] = await Promise.all([
      searchRead(uid, 'product.template', [companyFilter], [
        'id', 'name', 'default_code', 'categ_id', 'company_id', 'active',
      ]),
      searchRead(uid, 'product.product', [companyFilter], [
        'id', 'product_tmpl_id', 'default_code', 'combination_indices',
        'product_template_attribute_value_ids', 'company_id', 'active',
      ]),
      searchRead(uid, 'product.template.attribute.value', [], [
        'id', 'name', 'attribute_id', 'product_attribute_value_id',
      ]),
      searchRead(uid, 'stock.quant', [companyFilter, ['location_id.usage', '=', 'internal']], [
        'id', 'product_id', 'location_id', 'quantity', 'reserved_quantity', 'company_id',
      ]),
      searchRead(uid, 'stock.location', [['usage', '=', 'internal'], companyFilter], [
        'id', 'name', 'complete_name', 'company_id',
      ]),
      searchRead(uid, 'stock.move', [
        companyFilter, ['state', '=', 'done'],
      ], [
        'id', 'product_id', 'product_qty', 'date', 'location_id',
        'location_dest_id', 'origin', 'state', 'company_id',
      ], 150),
    ]);

    const payload = { templates, variants, attrValues, quants, locations, moves };

    return new Response(JSON.stringify(payload), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
