import { expect } from "@playwright/test"

export class OtpHandle {
  constructor(page, selector = "input-otp") {
    this.page = page
    this.selector = selector
  }

  get element() {
    return this.page.locator(this.selector)
  }

  get input() {
    return this.element.locator("[data-input-otp]")
  }

  get slots() {
    return this.element.locator("input-otp-slot")
  }

  slot(index) {
    return this.slots.nth(index)
  }

  get caret() {
    return this.element.locator("input-otp-caret[data-visible]")
  }

  async focus() {
    await this.input.focus()
  }

  async type(text) {
    await this.input.pressSequentially(text, { delay: 10 })
  }

  async press(key) {
    await this.input.press(key)
  }

  // Home/End do not move the caret inside an input on every browser and
  // platform, so the edges are reached with plain arrow keys instead.
  async pressRepeatedly(key, times) {
    for (let index = 0; index < times; index++) {
      await this.press(key)
    }
  }

  // The browser inserts pasted text itself on every platform but iOS, so this
  // exercises the same path a real Cmd+V takes through the component.
  async paste(text) {
    await this.page.keyboard.insertText(text)
  }

  // Used where the component takes the paste over from the browser and does the
  // insert itself, which is the only case a synthetic event can model faithfully.
  async dispatchPaste(text) {
    await this.input.evaluate((input, pasted) => {
      const transfer = new DataTransfer()
      transfer.setData("text/plain", pasted)

      const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true })
      // Firefox drops `clipboardData` from the constructor's init dictionary.
      Object.defineProperty(event, "clipboardData", { value: transfer })

      input.dispatchEvent(event)
    }, text)
  }

  async value() {
    return this.input.inputValue()
  }

  async chars() {
    return this.slots.locator("input-otp-char").allTextContents()
  }

  async activeIndexes() {
    return this.page.$$eval(`${this.selector} input-otp-slot`, slots =>
      slots.map((slot, index) => ({ slot, index }))
        .filter(({ slot }) => slot.hasAttribute("data-active"))
        .map(({ index }) => index))
  }

  async selection() {
    return this.input.evaluate(input => [ input.selectionStart, input.selectionEnd ])
  }

  async events(name) {
    return this.page.evaluate(eventName => globalThis.recordedEvents[eventName] ?? [], name)
  }

  // `selectionchange` is delivered in a later task than the key event that
  // caused it, so anything reading the mirrored state has to retry.
  async expectActive(indexes) {
    await expect.poll(() => this.activeIndexes()).toEqual(indexes)
  }

  async expectSelection(start, end) {
    await expect.poll(() => this.selection()).toEqual([ start, end ])
  }

  async expectValue(value) {
    await expect.poll(() => this.value()).toBe(value)
  }

  async expectEvents(name, values) {
    await expect.poll(() => this.events(name)).toEqual(values)
  }
}
