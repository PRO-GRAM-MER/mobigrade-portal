const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

// ── HTML helpers ────────────────────────────────────────────────────────────

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function clean(html: string) {
  return decodeEntities(stripTags(html)).trim()
}

// ── GSM Arena search → device page URL ─────────────────────────────────────

export async function findGSMArenaUrl(brand: string, model: string): Promise<string | null> {
  const q = encodeURIComponent(`${brand} ${model}`)
  const url = `https://www.gsmarena.com/results.php3?sQuickSearch=${q}`
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const html = await res.text()
    // GSM Arena search results: <div class="makers"><ul><li><a href="...">
    const match = html.match(/href="([a-z0-9_-]+-\d+\.php)"/)
    return match ? `https://www.gsmarena.com/${match[1]}` : null
  } catch {
    return null
  }
}

// ── Parse GSM Arena spec page ───────────────────────────────────────────────

export type GSMSpecs = Record<string, string>

export async function scrapeGSMArena(pageUrl: string): Promise<GSMSpecs | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    const html = await res.text()

    const specs: GSMSpecs = {}
    let currentSection = ""

    // Walk the spec table: <th> sets section, <td class="ttl">/nfo pairs are rows
    const tokenRe = /<th[^>]*>([\s\S]*?)<\/th>|<td class="ttl"[^>]*>([\s\S]*?)<\/td>\s*<td class="nfo"[^>]*>([\s\S]*?)<\/td>/gi
    let m: RegExpExecArray | null
    while ((m = tokenRe.exec(html)) !== null) {
      if (m[1] !== undefined) {
        // <th> — section header
        currentSection = clean(m[1])
      } else {
        // ttl/nfo row
        const label = clean(m[2])
        const value = clean(m[3])
        if (label && value && value !== "-") {
          specs[`${currentSection} / ${label}`] = value
        }
      }
    }

    return Object.keys(specs).length > 0 ? specs : null
  } catch {
    return null
  }
}

// ── Category-relevant spec extraction ───────────────────────────────────────

const CATEGORY_SECTION_MAP: Record<string, string[]> = {
  DISPLAY:      ["Display"],
  BATTERY:      ["Battery"],
  CAMERA_REAR:  ["Main Camera", "Camera"],
  CAMERA_FRONT: ["Selfie camera", "Front camera"],
  BODY:         ["Body"],
  CHARGING:     ["Charging", "Comms"],
  SENSOR:       ["Features", "Sensors"],
  AUDIO:        ["Sound"],
  INTERNAL:     ["Memory", "Platform"],
  THERMAL:      ["Platform"],
  OTHER:        [],
}

export function extractCategorySpecs(allSpecs: GSMSpecs, category: string): GSMSpecs {
  const sections = CATEGORY_SECTION_MAP[category] ?? []
  if (sections.length === 0) return allSpecs
  const out: GSMSpecs = {}
  for (const [key, val] of Object.entries(allSpecs)) {
    if (sections.some((s) => key.toLowerCase().startsWith(s.toLowerCase()))) {
      // Strip the "Section / " prefix for cleaner output
      const label = key.includes(" / ") ? key.split(" / ").slice(1).join(" / ") : key
      out[label] = val
    }
  }
  return out
}

// ── Generate highlights from specs ──────────────────────────────────────────

const HIGHLIGHT_KEYS: Record<string, string[]> = {
  DISPLAY:      ["Type", "Size", "Resolution", "Protection", "Refresh rate"],
  BATTERY:      ["Type", "Capacity", "Charging"],
  CAMERA_REAR:  ["Triple", "Dual", "Main Camera / Type", "Video"],
  CAMERA_FRONT: ["Single", "Dual", "Type"],
  BODY:         ["Dimensions", "Weight", "Build"],
  CHARGING:     ["Charging", "USB", "NFC"],
  SENSOR:       ["Sensors"],
  AUDIO:        ["Loudspeaker", "3.5mm"],
  INTERNAL:     ["Internal", "RAM"],
  OTHER:        [],
}

export function generateHighlights(specs: GSMSpecs, category: string, brand: string, model: string): string[] {
  const keys = HIGHLIGHT_KEYS[category] ?? []
  const highlights: string[] = []

  for (const [key, val] of Object.entries(specs)) {
    if (keys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      const label = key.replace(/_/g, " ")
      highlights.push(`${label}: ${val}`)
    }
    if (highlights.length >= 5) break
  }

  // Always add compatibility
  highlights.unshift(`Compatible with ${brand} ${model}`)

  return highlights.slice(0, 6)
}

// ── Generate short description ───────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  DISPLAY:      "display assembly",
  BATTERY:      "battery",
  CAMERA_REAR:  "rear camera module",
  CAMERA_FRONT: "front camera module",
  AUDIO:        "audio component",
  CHARGING:     "charging port assembly",
  BODY:         "back panel",
  SENSOR:       "sensor module",
  INTERNAL:     "internal component",
  THERMAL:      "thermal component",
  OTHER:        "spare part",
}

export function generateShortDescription(
  brand: string,
  model: string,
  category: string,
  qualityGrade: string,
): string {
  const part = CATEGORY_LABELS[category] ?? "spare part"
  const grade =
    qualityGrade === "OEM" ? "OEM-grade"
    : qualityGrade === "AFTERMARKET_HIGH" ? "high-quality aftermarket"
    : "aftermarket"
  return `Replacement ${part} for ${brand} ${model}. ${grade.charAt(0).toUpperCase() + grade.slice(1)} quality, thoroughly tested for compatibility and performance.`
}

// ── Generate tags ────────────────────────────────────────────────────────────

export function generateTags(brand: string, models: string[], category: string, qualityGrade: string): string[] {
  const cat = (CATEGORY_LABELS[category] ?? category).toLowerCase()
  const tags = new Set<string>([
    brand.toLowerCase(),
    ...models.map((m) => m.toLowerCase()),
    cat,
    category.toLowerCase().replace(/_/g, " "),
    qualityGrade.toLowerCase().replace(/_/g, " "),
    "spare part",
    "replacement",
    `${brand.toLowerCase()} ${cat}`,
  ])
  return [...tags]
}

// ── Generate slug ────────────────────────────────────────────────────────────

export function generateSlug(brand: string, model: string, category: string, id: string): string {
  const base = `${brand}-${model}-${category}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${base}-${id.slice(-6)}`
}
