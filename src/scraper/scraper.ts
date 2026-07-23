import * as cheerio from "cheerio";
import type { ScrapedItem } from "./types";

/**
 * Scrape une page web et extrait les communiqués selon les sélecteurs CSS fournis.
 * Si aucun sélecteur n'est fourni, utilise des heuristiques par défaut
 * (balises <article>, liens dans des listes, etc.).
 */
export async function scrapePage(
  html: string,
  baseUrl: string,
  selectors?: {
    item?: string;
    title?: string;
    link?: string;
    date?: string;
    content?: string;
  }
): Promise<ScrapedItem[]> {
  const $ = cheerio.load(html);
  const items: ScrapedItem[] = [];

  // Stratégie 1 : sélecteurs personnalisés fournis
  if (selectors?.item) {
    $(selectors.item).each((_i, el) => {
      const title = selectors.title
        ? $(el).find(selectors.title).first().text().trim()
        : $(el).text().trim().slice(0, 200);

      let url = "";
      if (selectors.link) {
        const linkEl = $(el).find(selectors.link).first();
        url = linkEl.attr("href") ?? "";
      } else {
        const linkEl = $(el).find("a").first();
        url = linkEl.attr("href") ?? "";
      }
      url = resolveUrl(url, baseUrl);

      let publishedAt: Date | null = null;
      if (selectors.date) {
        const dateText = $(el).find(selectors.date).first().text().trim();
        publishedAt = parseDate(dateText);
      }

      const rawContent = selectors.content
        ? $(el).find(selectors.content).text().trim()
        : $(el).text().trim();

      if (title && url) {
        items.push({ title, url, publishedAt, rawContent: rawContent || null });
      }
    });
    return items;
  }

  // Stratégie 2 : heuristiques automatiques — cherche <article>, puis liens structurés
  const articles = $("article").toArray();
  if (articles.length > 0) {
    for (const el of articles) {
      const $el = $(el);
      const title =
        $el.find("h1, h2, h3, h4").first().text().trim() ||
        $el.find("a").first().text().trim();
      const linkEl = $el.find("a").first();
      const url = resolveUrl(linkEl.attr("href") ?? "", baseUrl);
      const dateEl = $el.find("time, .date, [datetime]").first();
      const publishedAt = parseDate(dateEl.text().trim() || (dateEl.attr("datetime") ?? ""));

      if (title && url) {
        items.push({
          title,
          url,
          publishedAt,
          rawContent: $el.text().trim(),
        });
      }
    }
    return items;
  }

  // Stratégie 3 : cherche toutes les listes de liens avec structure date+titre
  $("ul li, .post, .news-item, .entry").each((_i, el) => {
    const $el = $(el);
    const title =
      $el.find("h2, h3, h4, a").first().text().trim() || $el.text().trim().slice(0, 200);
    const linkEl = $el.find("a").first();
    const url = resolveUrl(linkEl.attr("href") ?? "", baseUrl);
    const dateEl = $el.find("time, .date, span").first();
    const publishedAt = parseDate(dateEl.text().trim());

    if (title && url) {
      items.push({
        title,
        url,
        publishedAt,
        rawContent: $el.text().trim(),
      });
    }
  });

  return items;
}

/**
 * Télécharge le HTML d'une page.
 */
export async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveUrl(href: string, baseUrl: string): string {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}

function parseDate(text: string): Date | null {
  if (!text) return null;

  // Formats français courants
  const patterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, // 31/12/2024 ou 31-12-2024
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, // 2024/12/31
    /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i,
  ];

  const months: Record<string, number> = {
    janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 12,
  };

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2] && isNaN(Number(match[2]))) {
        const monthIdx = months[match[2].toLowerCase()];
        if (monthIdx !== undefined) {
          return new Date(Number(match[3]), monthIdx, Number(match[1]));
        }
      } else if (match.length >= 4) {
        const d = Number(match[1]);
        const m = Number(match[2]);
        const y = Number(match[3]);
        if (d > 31) {
          // format YYYY-MM-DD
          return new Date(y, m - 1, d);
        }
        return new Date(y, m - 1, d);
      }
    }
  }

  const iso = new Date(text);
  return isNaN(iso.getTime()) ? null : iso;
}
