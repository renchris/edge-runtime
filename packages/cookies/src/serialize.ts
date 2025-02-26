import type { RequestCookie, ResponseCookie } from './types'

export function stringifyCookie(c: ResponseCookie | RequestCookie): string {
  const attrs = [
    'path' in c && c.path && `Path=${c.path}`,
    'expires' in c &&
      (c.expires || c.expires === 0) &&
      `Expires=${(typeof c.expires === 'number'
        ? new Date(c.expires)
        : c.expires
      ).toUTCString()}`,
    'maxAge' in c && typeof c.maxAge === 'number' && `Max-Age=${c.maxAge}`,
    'domain' in c && c.domain && `Domain=${c.domain}`,
    'secure' in c && c.secure && 'Secure',
    'httpOnly' in c && c.httpOnly && 'HttpOnly',
    'sameSite' in c && c.sameSite && `SameSite=${c.sameSite}`,
    'priority' in c && c.priority && `Priority=${c.priority}`,
  ].filter(Boolean)

  return `${c.name}=${encodeURIComponent(c.value ?? '')}; ${attrs.join('; ')}`
}

/** Parse a `Cookie` header value */
export function parseCookie(cookie: string) {
  const map = new Map<string, string>()

  for (const pair of cookie.split(/; */)) {
    if (!pair) continue

    const splitAt = pair.indexOf('=')

    // If the attribute doesn't have a value, set it to 'true'.
    if (splitAt === -1) {
      map.set(pair, 'true')
      continue
    }

    // Otherwise split it into key and value and trim the whitespace on the
    // value.
    const [key, value] = [pair.slice(0, splitAt), pair.slice(splitAt + 1)]
    try {
      map.set(key, decodeURIComponent(value ?? 'true'))
    } catch {
      // ignore invalid encoded values
    }
  }

  return map
}

/** Parse a `Set-Cookie` header value */
export function parseSetCookie(setCookie: string): undefined | ResponseCookie {
  if (!setCookie) {
    return undefined
  }

  const [[name, value], ...attributes] = parseCookie(setCookie)
  const {
    domain,
    expires,
    httponly,
    maxage,
    path,
    samesite,
    secure,
    priority,
  } = Object.fromEntries(
    attributes.map(([key, value]) => [key.toLowerCase(), value]),
  )
  const cookie: ResponseCookie = {
    name,
    value: decodeURIComponent(value),
    domain,
    ...(expires && { expires: new Date(expires) }),
    ...(httponly && { httpOnly: true }),
    ...(typeof maxage === 'string' && { maxAge: Number(maxage) }),
    path,
    ...(samesite && { sameSite: parseSameSite(samesite) }),
    ...(secure && { secure: true }),
    ...(priority && { priority: parsePriority(priority) }),
  }

  return compact(cookie)
}

function compact<T>(t: T): T {
  const newT = {} as Partial<T>
  for (const key in t) {
    if (t[key]) {
      newT[key] = t[key]
    }
  }
  return newT as T
}

const SAME_SITE: ResponseCookie['sameSite'][] = ['strict', 'lax', 'none']

function parseSameSite(string: string): ResponseCookie['sameSite'] {
  string = string.toLowerCase()
  return SAME_SITE.includes(string as any)
    ? (string as ResponseCookie['sameSite'])
    : undefined
}

const PRIORITY: ResponseCookie['priority'][] = ['low', 'medium', 'high']

function parsePriority(string: string): ResponseCookie['priority'] {
  string = string.toLowerCase()
  return PRIORITY.includes(string as any)
    ? (string as ResponseCookie['priority'])
    : undefined
}
