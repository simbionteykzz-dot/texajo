// URL del backend Flask local (python backend/odoo_server.py).
// Si no está definida, fetchOdooAll usará llamada directa a Odoo.
const ODOO_BACKEND_URL = import.meta.env.VITE_ODOO_BACKEND_URL ?? '';

// ── Types ────────────────────────────────────────────────────────────────────

export interface OdooTemplate {
  id: number;
  name: string;
  default_code: string | false;
  categ_id: [number, string] | false;
  company_id: [number, string] | false;
  active: boolean;
}

export interface OdooVariant {
  id: number;
  product_tmpl_id: [number, string];
  default_code: string | false;
  combination_indices: string;
  product_template_attribute_value_ids: number[];
  company_id: [number, string] | false;
  active: boolean;
}

export interface OdooAttributeValue {
  id: number;
  name: string;
  attribute_id: [number, string];
  product_attribute_value_id: [number, string] | false;
}

export interface OdooQuant {
  id: number;
  product_id: [number, string];
  location_id: [number, string];
  quantity: number;
  reserved_quantity: number;
  company_id: [number, string] | false;
}

export interface OdooLocation {
  id: number;
  name: string;
  complete_name: string;
  company_id: [number, string] | false;
}

export interface OdooMove {
  id: number;
  product_id: [number, string];
  product_qty: number;
  date: string;
  location_id: [number, string];
  location_dest_id: [number, string];
  origin: string | false;
  state: string;
  company_id: [number, string] | false;
}

export interface OdooAll {
  templates: OdooTemplate[];
  variants: OdooVariant[];
  attrValues: OdooAttributeValue[];
  quants: OdooQuant[];
  locations: OdooLocation[];
  moves: OdooMove[];
}

// ── Derived types ─────────────────────────────────────────────────────────────

export interface VariantRow {
  variantId: number;
  templateId: number;
  templateName: string;
  sku: string;
  color: string;
  talla: string;
  otrosAttr: string;
  stock: number;
  stockReservado: number;
  stockDisponible: number;
  empresa: string;
  locationBreakdown: { locationName: string; qty: number }[];
}

export interface ProductRow {
  templateId: number;
  templateName: string;
  empresa: string;
  variantes: VariantRow[];
  totalStock: number;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchOdooAll(): Promise<OdooAll> {
  // En producción (sin backend Flask), intentar llamada directa a Odoo.
  // En desarrollo con Flask corriendo, usar el proxy local.
  const backendUrl = import.meta.env.VITE_ODOO_BACKEND_URL ?? '';

  if (!backendUrl) {
    // Sin variable configurada → intentar directo a Odoo (producción Vercel)
    const { fetchOdooAllDirect } = await import('./odooDirectService');
    return fetchOdooAllDirect();
  }

  const res = await fetch(`${backendUrl}/api/odoo-stock`);
  const data = await res.json();
  if (!res.ok || data?.error) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as OdooAll;
}

// ── Build product rows ────────────────────────────────────────────────────────

const reColor = /color|colour|tono|color\s*tejido/i;
const reTalla = /talla|size|talle|talla\s*tejido/i;

export function buildProductRows(raw: OdooAll): ProductRow[] {
  const attrMap = new Map<number, OdooAttributeValue>(
    raw.attrValues.map(a => [a.id, a])
  );

  // quants agrupados por product.product id
  const quantByVariant = new Map<number, OdooQuant[]>();
  for (const q of raw.quants) {
    const pid = q.product_id[0];
    if (!quantByVariant.has(pid)) quantByVariant.set(pid, []);
    quantByVariant.get(pid)!.push(q);
  }

  // location name lookup
  const locMap = new Map<number, string>(
    raw.locations.map(l => [l.id, l.complete_name ?? l.name])
  );

  // templates lookup
  const tmplMap = new Map<number, OdooTemplate>(
    raw.templates.map(t => [t.id, t])
  );

  // group variants by template
  const varsByTmpl = new Map<number, OdooVariant[]>();
  for (const v of raw.variants) {
    const tid = v.product_tmpl_id[0];
    if (!varsByTmpl.has(tid)) varsByTmpl.set(tid, []);
    varsByTmpl.get(tid)!.push(v);
  }

  const rows: ProductRow[] = [];

  for (const [tid, variants] of varsByTmpl) {
    const tmpl = tmplMap.get(tid);
    if (!tmpl) continue;

    const variantRows: VariantRow[] = variants.map(v => {
      const qs = quantByVariant.get(v.id) ?? [];
      const stock = qs.reduce((s, q) => s + q.quantity, 0);
      const stockReservado = qs.reduce((s, q) => s + q.reserved_quantity, 0);
      const locationBreakdown = qs
        .filter(q => q.quantity !== 0)
        .map(q => ({ locationName: locMap.get(q.location_id[0]) ?? q.location_id[1], qty: q.quantity }));

      let color = '';
      let talla = '';
      const otros: string[] = [];

      for (const atid of v.product_template_attribute_value_ids) {
        const av = attrMap.get(atid);
        if (!av) continue;
        const attrName = av.attribute_id[1] ?? '';
        if (reColor.test(attrName)) color = av.name.trim();
        else if (reTalla.test(attrName)) talla = av.name.trim();
        else otros.push(`${attrName}: ${av.name.trim()}`);
      }

      return {
        variantId: v.id,
        templateId: tid,
        templateName: tmpl.name,
        sku: v.default_code || tmpl.default_code || '',
        color,
        talla,
        otrosAttr: otros.join(' | '),
        stock,
        stockReservado,
        stockDisponible: stock - stockReservado,
        empresa: Array.isArray(v.company_id) ? v.company_id[1] : (Array.isArray(tmpl.company_id) ? tmpl.company_id[1] : ''),
        locationBreakdown,
      };
    });

    const totalStock = variantRows.reduce((s, r) => s + r.stock, 0);

    rows.push({
      templateId: tid,
      templateName: tmpl.name,
      empresa: Array.isArray(tmpl.company_id) ? tmpl.company_id[1] : '',
      variantes: variantRows,
      totalStock,
    });
  }

  return rows.sort((a, b) => a.templateName.localeCompare(b.templateName));
}
