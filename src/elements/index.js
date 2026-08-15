import InputOtpElement from "./input_otp_element"

export function defineElements() {
  if (customElements.get("input-otp")) return

  customElements.define("input-otp", InputOtpElement)
}
