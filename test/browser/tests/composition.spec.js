import { expect, test } from "../test_helper.js"

test("adopts hand-written grouped markup", async ({ page, otp }) => {
  await page.goto("/groups.html")

  await expect(otp.slots).toHaveCount(6)
  await expect(otp.element.locator("input-otp-separator")).toHaveCount(1)
  // The two groups are the ones in the fixture — none was generated.
  await expect(otp.element.locator("input-otp-group")).toHaveCount(2)
})

test("types across groups as one continuous field", async ({ page, otp }) => {
  await page.goto("/groups.html")

  await otp.focus()
  await otp.type("123456")

  expect(await otp.chars()).toEqual([ "1", "2", "3", "4", "5", "6" ])
  expect(await otp.value()).toBe("123456")
})

test("draws the separator between the two groups", async ({ page, otp }) => {
  await page.goto("/groups.html")

  const separator = otp.element.locator("input-otp-separator")
  const firstGroupEnd = (await otp.slot(2).boundingBox()).x
  const secondGroupStart = (await otp.slot(3).boundingBox()).x
  const separatorBox = await separator.boundingBox()

  expect(separatorBox.x).toBeGreaterThan(firstGroupEnd)
  expect(separatorBox.x).toBeLessThan(secondGroupStart)
})

test("submits the value under the component's name", async ({ page, otp }) => {
  await page.goto("/form.html")

  await otp.focus()
  await otp.type("1234")

  await expect.poll(() => page.evaluate(() => globalThis.submittedCode)).toBe("1234")
})

test("shows placeholder characters until the first keystroke", async ({ page, otp }) => {
  await page.goto("/form.html")

  expect(await otp.chars()).toEqual([ "·", "·", "·", "·" ])

  await otp.focus()
  await otp.type("1")

  expect(await otp.chars()).toEqual([ "1", "", "", "" ])
})

// `autofocus` only acts on elements the parser already knows about, and the
// inner input is created too late for that — so the component does it itself.
test("takes focus on load with autofocus", async ({ page, otp }) => {
  await page.goto("/autofocus.html")

  await expect(otp.input).toBeFocused()
  await expect(otp.element).toHaveAttribute("data-focused", "")
})

test("is reachable and operable with the keyboard alone", async ({ page, otp }) => {
  await page.goto("/form.html")

  await page.keyboard.press("Tab")
  await expect(otp.input).toBeFocused()

  await page.keyboard.type("12")

  expect(await otp.value()).toBe("12")
})
