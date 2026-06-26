#!/usr/bin/env node
/**
 * Build the neutral starter content for a brand-new business.
 *
 *   node truck-site-kit/tools/make-starter.mjs
 *
 * Reads the placeholder SVGs in starter/assets/, inlines them as base64 data-URIs,
 * and writes starter/site.json. Inlining means the starter — and every site the
 * CMS exports from it — is fully self-contained: no asset paths to break, nothing
 * to host separately. Re-run this only if you change the placeholder art.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "..");
const assets = join(kit, "starter", "assets");

const dataUri = (file) =>
  "data:image/svg+xml;base64," +
  Buffer.from(readFileSync(join(assets, file), "utf8")).toString("base64");

const LOGO = dataUri("logo.svg");
const BG = dataUri("background.svg");
const POSTER = dataUri("poster.svg");
const FAVICON = dataUri("favicon.svg");
const G1 = dataUri("gallery-1.svg");
const G2 = dataUri("gallery-2.svg");
const G3 = dataUri("gallery-3.svg");

// Hours helper: same shape the renderer/editor expect (day -> [open, close] or null).
const days = (open, close, closedDays = []) => {
  const h = {};
  for (let i = 0; i < 7; i++) h[i] = closedDays.includes(i) ? null : [open, close];
  return h;
};

const site = {
  schemaVersion: 1,
  siteId: "starter",
  meta: {
    lang: "he",
    dir: "rtl",
    title: "פוד טראק | קפה ואוכל רחוב טוב",
    description: "פוד טראק עם קפה טרי, כריכים על לחם טרי, סלטים ומתוקים. בואו לטעום.",
    favicon: FAVICON,
    themeColor: "#F6F4EC",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700;900&family=Amatic+SC:wght@700&display=swap",
  },
  theme: {
    colors: {
      bg: "#F6F4EC",
      bgDeep: "#EEEBDD",
      surface: "#FFFFFF",
      ink: "#26312B",
      inkSoft: "#54625B",
      sage: "#79A5A7",
      sageDeep: "#49777A",
      sageDark: "#33585B",
      olive: "#7C8A62",
      line: "#DDD8C6",
    },
    radius: "14px",
    fonts: { head: '"Frank Ruhl Libre",serif', body: '"Assistant",sans-serif' },
  },
  brand: { name: "פוד טראק", logo: LOGO },
  nav: {
    links: [
      { label: "הסיפור", href: "#story" },
      { label: "התפריט", href: "#menu" },
      { label: "גלריה", href: "#gallery" },
      { label: "סניפים ושעות", href: "#locations" },
      { label: "צרו קשר", href: "#contact" },
    ],
    cta: { label: "לתפריט המלא", href: "#menu" },
  },
  sections: [
    {
      id: "top",
      type: "hero",
      visible: true,
      data: {
        logo: LOGO,
        logoAlt: "הלוגו של העסק",
        background: BG,
        headline: "האוכל הכי טוב,\nבצד הדרך.",
        lead: "קפה טרי, אוכל רחוב משובח ואווירה טובה. החליפו את הטקסט הזה בסיפור שלכם.",
        ctas: [
          { label: "לתפריט המלא", href: "#menu", style: "primary" },
          { label: "איך מגיעים אלינו", href: "#locations", style: "ghost" },
        ],
      },
    },
    {
      id: "story",
      type: "richtext",
      visible: true,
      data: {
        heading: "הסיפור שלנו",
        paragraphs: [
          "כאן מספרים איך הכול התחיל — מי אתם, מה אתם אוהבים להכין, ולמה דווקא פה. שני־שלושה משפטים חמים שגורמים לאנשים לרצות לעצור.",
          "אפשר להוסיף עוד פסקה על המנות, על חומרי הגלם, או על האווירה. את כל הטקסט הזה עורכים בקלות במערכת הניהול.",
        ],
      },
    },
    {
      id: "menu",
      type: "menu",
      visible: true,
      data: {
        heading: "מה אוכלים היום?",
        intro: "הכול טרי. ערכו את הקטגוריות, המנות והמחירים שלכם במערכת הניהול. טבעוני וללא גלוטן מסומנים ליד כל מנה.",
        currency: "₪",
        categories: [
          {
            id: "cat-sandwiches",
            navLabel: "כריכים",
            title: "כריכים",
            groups: [
              {
                items: [
                  { name: "כריך גבינות", price: "39", tags: [], desc: "מוצרלה, עגבנייה, בזיליקום ופסטו בלחם טרי." },
                  { name: "כריך טבעוני", price: "42", tags: ["vegan"], desc: "חציל שרוף, פלפל קלוי, טחינה וירקות העונה." },
                  { name: "כריך טונה", price: "44", tags: [], desc: "טונה, ביצה, חמוצים ובצל סגול." },
                ],
              },
            ],
          },
          {
            id: "cat-drinks",
            navLabel: "שתייה",
            title: "משקאות",
            groups: [
              {
                items: [
                  { name: "אספרסו", price: "9", tags: [] },
                  { name: "קפוצ'ינו", price: "14", tags: [] },
                  { name: "לימונדה", price: "16", tags: ["vegan"], desc: "נענע ולימון סחוט טרי." },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      id: "gallery",
      type: "gallery",
      visible: true,
      data: {
        heading: "רגעים מהדוכן",
        intro: "החליפו את התמונות האלה בתמונות אמיתיות של העסק — מנות, אנשים, אווירה.",
        images: [
          { src: G1, alt: "תמונה לדוגמה" },
          { src: G2, alt: "תמונה לדוגמה" },
          { src: G3, alt: "תמונה לדוגמה" },
        ],
      },
    },
    {
      id: "photo-band",
      type: "media",
      visible: true,
      data: {
        poster: POSTER,
        video: "",
        sectionLabel: "תמונת אווירה של העסק",
        videoLabel: "וידאו של העסק",
      },
    },
    {
      id: "locations",
      type: "locations",
      visible: true,
      data: {
        heading: "איפה תמצאו אותנו",
        intro: "בחרו סניף, לחצו על הוויז ויוצאים. עדכנו את הכתובת והשעות במערכת הניהול.",
        footnote: "לפעמים השעות משתנות. שווה להציץ באינסטגרם לפני שיוצאים.",
        branches: [
          {
            id: "main",
            name: "הסניף שלנו",
            desc: "כתבו כאן איפה אתם חונים ומה מסביב. לחיצה על הכפתור פותחת ניווט בוויז.",
            waze: { lat: 32.0853, lng: 34.7818 },
            hours: days(8, 17, [6]),
          },
        ],
      },
    },
    {
      id: "contact",
      type: "social",
      visible: true,
      data: {
        heading: "מתעדכנים אצלנו ברשתות",
        intro: "שינויים בשעות, מנות חדשות ואירועים — הכול מתפרסם קודם כאן.",
        links: [
          { network: "instagram", label: "@yourbusiness", url: "https://instagram.com/" },
          { network: "whatsapp", label: "שלחו הודעה", url: "https://wa.me/972500000000" },
        ],
      },
    },
  ],
  footer: {
    logo: LOGO,
    logoAlt: "פוד טראק",
    links: [
      { label: "התפריט", href: "#menu" },
      { label: "סניפים ושעות", href: "#locations" },
      { label: "אינסטגרם", href: "https://instagram.com/", external: true },
    ],
    copyright: "פוד טראק. כל הזכויות שמורות.",
    regions: "ערכו אותי במערכת הניהול",
  },
};

const out = join(kit, "starter", "site.json");
writeFileSync(out, JSON.stringify(site, null, 2) + "\n", "utf8");
console.log(`[make-starter] wrote ${out} (${JSON.stringify(site).length} bytes of JSON)`);
