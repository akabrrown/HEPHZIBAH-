import type { DbTx } from "@/lib/db";
import type { Occasion, PackageItem, Service, ServiceKind, SiteSettings } from "./schema";

export async function findActiveOccasions(tx: DbTx, kind?: ServiceKind): Promise<Occasion[]> {
  if (kind) {
    const res = await tx.query<Occasion>(
      `select id, slug, name, applies_to, sort_order, is_active
         from occasions
        where is_active and $1::service_kind = any(applies_to)
        order by sort_order asc, name asc`,
      [kind]
    );
    return res.rows;
  }
  const res = await tx.query<Occasion>(
    `select id, slug, name, applies_to, sort_order, is_active
       from occasions
      where is_active
      order by sort_order asc, name asc`
  );
  return res.rows;
}

export async function findActiveServices(tx: DbTx, kind?: ServiceKind): Promise<Service[]> {
  if (kind) {
    const res = await tx.query<Service>(
      `select id, kind, slug, name, summary, description_md, starting_price_minor, currency, sort_order, is_active, created_at::text, updated_at::text
         from services
        where is_active and kind = $1::service_kind
        order by sort_order asc, name asc`,
      [kind]
    );
    return res.rows;
  }
  const res = await tx.query<Service>(
    `select id, kind, slug, name, summary, description_md, starting_price_minor, currency, sort_order, is_active, created_at::text, updated_at::text
       from services
      where is_active
      order by kind asc, sort_order asc, name asc`
  );
  return res.rows;
}

export async function findAllServicesAdmin(tx: DbTx): Promise<Service[]> {
  const res = await tx.query<Service>(
    `select id, kind, slug, name, summary, description_md, starting_price_minor, currency, sort_order, is_active, created_at::text, updated_at::text
       from services
      order by kind asc, sort_order asc, name asc`
  );
  return res.rows;
}

export async function findActivePackages(
  tx: DbTx,
  filters?: { kind?: ServiceKind; serviceId?: string }
): Promise<PackageItem[]> {
  const clauses = ["p.is_active", "s.is_active"];
  const params: unknown[] = [];

  if (filters?.kind) {
    params.push(filters.kind);
    clauses.push(`s.kind = $${params.length}::service_kind`);
  }
  if (filters?.serviceId) {
    params.push(filters.serviceId);
    clauses.push(`p.service_id = $${params.length}::uuid`);
  }

  const res = await tx.query<PackageItem>(
    `select p.id, p.service_id, s.name as service_name, s.slug as service_slug, s.kind as service_kind,
            p.name, p.summary, p.price_minor, p.currency, p.duration_hours::float8 as duration_hours,
            p.deliverables, p.is_featured, p.sort_order, p.is_active,
            p.created_at::text, p.updated_at::text
       from packages p
       join services s on s.id = p.service_id
      where ${clauses.join(" and ")}
      order by s.kind asc, s.sort_order asc, p.sort_order asc, p.price_minor asc`,
    params
  );
  return res.rows;
}

export async function findAllPackagesAdmin(tx: DbTx): Promise<PackageItem[]> {
  const res = await tx.query<PackageItem>(
    `select p.id, p.service_id, s.name as service_name, s.slug as service_slug, s.kind as service_kind,
            p.name, p.summary, p.price_minor, p.currency, p.duration_hours::float8 as duration_hours,
            p.deliverables, p.is_featured, p.sort_order, p.is_active,
            p.created_at::text, p.updated_at::text
       from packages p
       join services s on s.id = p.service_id
      order by s.kind asc, p.sort_order asc, p.name asc`
  );
  return res.rows;
}

export async function findSiteSettings(tx: DbTx): Promise<SiteSettings> {
  const res = await tx.query<SiteSettings>(
    `select id, business_name, contact_email::text as contact_email, whatsapp_e164, phone_e164,
            address_text, social, min_lead_days, max_advance_days, quote_validity_days,
            budget_bands, updated_at::text
       from site_settings
      where id = 1`
  );
  const row = res.rows[0];
  if (!row) {
    throw new Error("site_settings singleton row (id=1) is missing");
  }
  return row;
}
