/**
 * Schema metadata for the editor: Hebrew labels, the curated font list, the
 * theme-color labels, dietary-tag options, social networks, and the menu of
 * section types the owner can add. Keeping this declarative makes the editor easy
 * to extend — add an entry here and a case in app.js's sectionEditor().
 */

// Curated Google Fonts offered in the theme editor. `family` is the CSS value
// (with a generic fallback); `href` loads it. All carry Hebrew glyphs.
export const FONT_CHOICES = [
  { family: '"Assistant",sans-serif', label: "Assistant", href: "https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&display=swap" },
  { family: '"Frank Ruhl Libre",serif', label: "Frank Ruhl Libre", href: "https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&display=swap" },
  { family: '"Heebo",sans-serif', label: "Heebo", href: "https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap" },
  { family: '"Rubik",sans-serif', label: "Rubik", href: "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" },
  { family: '"Secular One",sans-serif', label: "Secular One", href: "https://fonts.googleapis.com/css2?family=Secular+One&display=swap" },
  { family: '"David Libre",serif', label: "David Libre", href: "https://fonts.googleapis.com/css2?family=David+Libre:wght@400;500;700&display=swap" },
  { family: '"Suez One",serif', label: "Suez One", href: "https://fonts.googleapis.com/css2?family=Suez+One&display=swap" },
  { family: '"Alef",sans-serif', label: "Alef", href: "https://fonts.googleapis.com/css2?family=Alef:wght@400;700&display=swap" },
];

// theme.colors key -> friendly Hebrew label.
export const COLOR_LABELS = {
  bg: "רקע ראשי",
  bgDeep: "רקע משני",
  surface: "כרטיסים",
  ink: "טקסט ראשי",
  inkSoft: "טקסט משני",
  sage: "צבע מותג",
  sageDeep: "מותג כהה (קישורים)",
  sageDark: "כפתורים",
  olive: "הדגשה",
  line: "קווי הפרדה",
};

export const TAG_OPTIONS = [
  { value: "vegan", label: "טבעוני" },
  { value: "vegan-option", label: "אפשרות טבעונית" },
  { value: "gf", label: "ללא גלוטן" },
];

// Social networks the contact section understands (icon is drawn by the renderer).
export const SOCIAL_OPTIONS = [
  { value: "instagram", label: "אינסטגרם" },
  { value: "facebook", label: "פייסבוק" },
  { value: "whatsapp", label: "וואטסאפ" },
  { value: "tiktok", label: "טיקטוק" },
  { value: "phone", label: "טלפון" },
];

export const SECTION_LABELS = {
  hero: "כותרת ראשית (Hero)",
  richtext: "טקסט / סיפור",
  menu: "תפריט",
  gallery: "גלריית תמונות",
  media: "וידאו / תמונה",
  locations: "סניפים ושעות",
  social: "רשתות חברתיות",
};

// Which section types can be ADDED from the editor, in menu order.
export const ADDABLE_SECTIONS = ["hero", "richtext", "menu", "gallery", "media", "locations", "social"];

export const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export const LABELS = {
  app_title: "עריכת האתר",
  open_title: "פתיחת העורך",
  open_sub: "הזינו את הסיסמה כדי לערוך את האתר שלכם.",
  password: "סיסמה",
  signin: "כניסה",
  save: "שמירת טיוטה",
  saving: "שומר…",
  saved: "הטיוטה נשמרה במכשיר ✓",
  publish: "פרסום האתר",
  publishing: "מכין את האתר…",
  published: "האתר הורד! מוכן לעלייה לאוויר ✓",
  import: "טעינת אתר קיים",
  logout: "יציאה",
  preview: "תצוגה מקדימה",
  general: "כללי",
  theme: "צבעים וגופנים",
  navigation: "תפריט עליון",
  sections: "אזורי התוכן",
  footer: "כותרת תחתונה",
  add_section: "הוספת אזור",
  brand_name: "שם העסק",
  logo: "לוגו",
  site_title: "כותרת הדף (לשונית/גוגל)",
  site_desc: "תיאור הדף (גוגל)",
  favicon: "אייקון (favicon)",
  theme_color: "צבע דפדפן (נייד)",
  add: "הוספה",
  up: "↑",
  down: "↓",
  visible: "מוצג באתר",
  radius: "עיגול פינות",
};
