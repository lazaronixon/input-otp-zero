import "input-otp-zero"

// jsdom does not implement ResizeObserver, and the component treats it as
// optional, but stubbing it keeps the tested path identical to a browser's.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

export function mount(html) {
  document.body.innerHTML = html
  return document.querySelector("input-otp")
}

export function unmount() {
  document.body.innerHTML = ""
}

// jsdom never fires `selectionchange` for inputs, so the component's own
// listener has to be triggered the way a browser would.
export function setSelection(input, start, end = start) {
  input.setSelectionRange(start, end)
  document.dispatchEvent(new Event("selectionchange"))
}

export function type(element, text) {
  const input = element.input
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? input.value.length

  input.value = input.value.slice(0, start) + text + input.value.slice(end)
  input.setSelectionRange(start + text.length, start + text.length)
  input.dispatchEvent(new Event("input"))
}

export function backspace(element) {
  const input = element.input
  const start = input.selectionStart
  const end = input.selectionEnd

  if (start === end) {
    input.value = input.value.slice(0, Math.max(0, start - 1)) + input.value.slice(end)
    input.setSelectionRange(Math.max(0, start - 1), Math.max(0, start - 1))
  } else {
    input.value = input.value.slice(0, start) + input.value.slice(end)
    input.setSelectionRange(start, start)
  }

  input.dispatchEvent(new Event("input"))
}

export function paste(element, text) {
  const event = new Event("paste", { bubbles: true, cancelable: true })
  event.clipboardData = { getData: () => text }
  element.input.dispatchEvent(event)
  return event
}

// jsdom has no layout, so geometry the browser would compute — `offsetX` on a
// pointer event, say — has to be attached by hand.
export function eventWith(type, properties) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.entries(properties).forEach(([ name, value ]) => {
    Object.defineProperty(event, name, { value })
  })

  return event
}

export function slotState(element) {
  return Array.from(element.querySelectorAll("input-otp-slot")).map(slot => ({
    char: slot.querySelector("input-otp-char").textContent,
    isActive: slot.hasAttribute("data-active"),
    isFilled: slot.hasAttribute("data-filled"),
    isPlaceholder: slot.hasAttribute("data-placeholder"),
    hasCaret: slot.querySelector("input-otp-caret").hasAttribute("data-visible")
  }))
}
