globalThis.recordedEvents = {}

function record(name, event) {
  globalThis.recordedEvents[name] ??= []
  globalThis.recordedEvents[name].push(event.detail?.value ?? null)
}

document.addEventListener("input-otp:change", event => record("change", event))
document.addEventListener("input-otp:complete", event => record("complete", event))
