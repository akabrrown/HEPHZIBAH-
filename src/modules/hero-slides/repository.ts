import type { DbTx } from "@/lib/db";
import type { HeroSlide } from "./schema";

const HERO_SLIDE_COLUMNS = `
  id,
  image_public_id,
  alt_text,
  focal_x,
  focal_y,
  eyebrow_left,
  eyebrow_right,
  headline,
  subcopy,
  sort_order,
  is_active,
  created_at::text as created_at,
  updated_at::text as updated_at
`;

export async function findActiveHeroSlides(tx: DbTx): Promise<HeroSlide[]> {
  const res = await tx.query<HeroSlide>(
    `select ${HERO_SLIDE_COLUMNS}
       from hero_slides
      where is_active
      order by sort_order asc, created_at asc
      limit 12`
  );
  return res.rows;
}

export async function findAllHeroSlidesAdmin(tx: DbTx): Promise<HeroSlide[]> {
  const res = await tx.query<HeroSlide>(
    `select ${HERO_SLIDE_COLUMNS}
       from hero_slides
      order by sort_order asc, created_at asc
      limit 50`
  );
  return res.rows;
}
