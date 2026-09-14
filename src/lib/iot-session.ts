import "server-only"
import { readFile } from "node:fs/promises"
import path from "node:path"

export const IOT_BASE_URL = "https://ieltsonlinetests.com"
const COOKIES_PATH = path.resolve("credential/cookies.json")

export class IotSessionError extends Error {
  constructor(
    message: string,
    public readonly code: "missing" | "expired" | "upstream" | "invalid-url"
  ) {
    super(message)
    this.name = "IotSessionError"
  }
}

interface StorageStateCookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: number
}

interface StorageState {
  cookies?: StorageStateCookie[]
}

function assertIotUrl(input: string): URL {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new IotSessionError("Invalid IELTS Online Tests URL.", "invalid-url")
  }

  if (
    url.protocol !== "https:" ||
    (url.hostname !== "ieltsonlinetests.com" && !url.hostname.endsWith(".ieltsonlinetests.com"))
  ) {
    throw new IotSessionError("Upstream URL is not allowlisted.", "invalid-url")
  }

  return url
}

async function readStorageState(): Promise<StorageState> {
  try {
    return JSON.parse(await readFile(COOKIES_PATH, "utf8")) as StorageState
  } catch {
    throw new IotSessionError(
      "IELTS cookies missing. Run `pnpm iot:login` to spawn a session into credential/cookies.json.",
      "missing"
    )
  }
}

async function getCookieHeader(url: URL): Promise<string> {
  const state = await readStorageState()
  const now = Date.now() / 1000
  const cookies = (state.cookies || []).filter((cookie) => {
    const domain = cookie.domain.replace(/^\./, "")
    const pathOk = !cookie.path || url.pathname.startsWith(cookie.path)
    const domainOk = url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    const notExpired = cookie.expires === undefined || cookie.expires < 0 || cookie.expires > now
    return domainOk && pathOk && notExpired
  })

  if (!cookies.length) {
    throw new IotSessionError(
      "IELTS cookies expired. Run `pnpm iot:login` again.",
      "expired"
    )
  }

  return cookies.map(({ name, value }) => `${name}=${value}`).join("; ")
}

export async function fetchIot(input: string, init: RequestInit = {}): Promise<Response> {
  const url = assertIotUrl(input)
  const cookieHeader = await getCookieHeader(url)
  const headers = new Headers(init.headers)
  headers.set(
    "Accept",
    headers.get("Accept") || "text/html,application/xhtml+xml,application/json"
  )
  headers.set(
    "User-Agent",
    headers.get("User-Agent") ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36"
  )
  headers.set("Cookie", cookieHeader)

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
      signal: init.signal || AbortSignal.timeout(15000),
      cache: "no-store",
    })
  } catch (error) {
    throw new IotSessionError(
      error instanceof Error ? error.message : "IELTS upstream request failed.",
      "upstream"
    )
  }

  if (response.status === 401 || response.status === 403) {
    throw new IotSessionError(
      "IELTS cookies rejected. Run `pnpm iot:login` again.",
      "expired"
    )
  }

  return response
}
