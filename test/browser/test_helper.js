import { test as base } from "@playwright/test"
import { OtpHandle } from "./helpers/otp_handle.js"

export const test = base.extend({
  otp: async ({ page }, use) => {
    await use(new OtpHandle(page))
  }
})

export { expect } from "@playwright/test"
