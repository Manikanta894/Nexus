// Tiny RSS/Atom parser (no dependencies) + Google News RSS feeds.

const GNEWS_TOPICS = {
  AI: 'artificial intelligence',
  'Business Analytics': 'business analytics',
  HR: 'human resources technology',
  Leadership: 'leadership',
  MBA: 'MBA careers',
  Marketing: 'digital marketing',
  Startups: 'startups india',
  Productivity: 'productivity tools',
}

export function googleNewsFeeds() {
  return Object.entries(GNEWS_TOPICS).map(([pillar, q]) => ({
    pillar,
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`,
  }))
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseItems(xml) {
  const items = []
  const re = /<(item|entry)[\s\S]*?<\/\1>/gi
  let m
  while ((m = re.exec(xml)) !== null) {
    const block = m[0]
    const tag = (name) => {
      const mm = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
      return mm ? mm[1].trim() : null
    }
    const title = stripTags(tag('title') || '')
    const link = (tag('link') || '').replace(/.*href="([^"]+)".*/, '$1').trim() || tag('link') || ''
    const pubDate = tag('pubDate') || tag('published') || tag('updated') || ''
    const description = stripTags(tag('description') || tag('summary') || '')
    if (title && (link || description)) {
      items.push({ title, link, pubDate, description: description.slice(0, 1500) })
    }
  }
  return items
}

export async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NEXUS-Content-Engine/1.0)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Feed ${res.status}: ${url}`)
  const xml = await res.text()
  return parseItems(xml)
}
