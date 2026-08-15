// `-webkit-touch-callout` is supported by WebKit on iOS only, which makes it a
// more reliable probe than sniffing the user agent.
export function isIOS() {
  return Boolean(globalThis.CSS?.supports?.("-webkit-touch-callout", "none"))
}
