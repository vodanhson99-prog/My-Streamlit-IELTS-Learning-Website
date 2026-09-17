import { chromium } from "playwright"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const credentialDir = path.resolve("credential")
const cookiesPath = path.join(credentialDir, "cookies.json")
const loginUrl = "https://ieltsonlinetests.com/user/login"

const email = process.env.IOT_EMAIL?.trim()
const password = process.env.IOT_PASSWORD?.trim()

if (!email || !password) {
  console.error("Set IOT_EMAIL and IOT_PASSWORD, then rerun `pnpm iot:login`.")
  process.exit(1)
}

await mkdir(credentialDir, { recursive: true })

const browser = await chromium.launch({ headless: false })
const context = await browser.newContext()
const page = await context.newPage()

try {
  await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 45000 })
  await page.waitForSelector("#edit-account, input[name='account'], input[data-drupal-selector='edit-account']", {
    timeout: 15000,
  })

  const account = page.locator("#edit-account, input[data-drupal-selector='edit-account']").first()
  const pass = page.locator("#edit-password, input[data-drupal-selector='edit-password']").first()
  await account.fill(email)
  await pass.fill(password)

  const submit = page.locator(
    "button[type='submit'], input[type='submit'], #edit-submit, button:has-text('Log in'), button:has-text('Login')"
  ).first()
  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => undefined),
    submit.click(),
  ])
  await page.waitForTimeout(3000)

  if (/user\/login|\/login/i.test(page.url())) {
    const bodyText = await page.locator("body").innerText().catch(() => "")
    if (/captcha|incorrect|unrecognized|invalid|wrong password/i.test(bodyText)) {
      throw new Error("Login rejected. Check credentials or complete CAPTCHA in the opened browser.")
    }
    throw new Error("Still on login page after submit. Complete any challenge, then rerun.")
  }

  const state = await context.storageState()
  if (!state.cookies?.length) throw new Error("Login appeared to succeed but no cookies were captured.")
  await writeFile(cookiesPath, JSON.stringify(state, null, 2), "utf8")
  console.log(`Saved cookies to ${cookiesPath}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
} finally {
  await context.close()
  await browser.close()
}
