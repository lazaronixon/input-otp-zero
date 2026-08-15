const STYLE_ELEMENT_ID = "input-otp-zero-style"

const AUTOFILL_STYLES = "background: transparent !important; color: transparent !important; border-color: transparent !important; opacity: 0 !important; box-shadow: none !important; -webkit-box-shadow: none !important; -webkit-text-fill-color: transparent !important;"

// These rules are the machinery: they make one text field pretend to be six
// boxes, and the component does not work without them. That is why they ship
// with the script instead of with the theme — forgetting a stylesheet should
// leave the field looking plain, not leave a visible text input sitting on top
// of the slots.
const RULES = `
input-otp { position: relative; display: inline-flex; align-items: center; cursor: text; user-select: none; -webkit-user-select: none; pointer-events: none; }

input-otp[disabled] { cursor: default; }

input-otp [data-input-otp-slot] { position: relative; }

/* The real input covers the whole component, transparent in every way a browser
   can paint it, and is the only thing that receives pointer events. */
[data-input-otp] { position: absolute; inset: 0; width: 100%; height: 100%; display: flex; margin: 0; padding: 0; opacity: 1; color: transparent; background: transparent; caret-color: transparent; border: 0 solid transparent; outline: 0 solid transparent; box-shadow: none; line-height: 1; letter-spacing: -.5em; font-size: var(--input-otp-root-height, 16px); font-family: monospace; font-variant-numeric: tabular-nums; pointer-events: all; cursor: inherit; }

[data-input-otp]::selection { background: transparent !important; color: transparent !important; }

[data-input-otp]:autofill { ${AUTOFILL_STYLES} }

[data-input-otp]:-webkit-autofill { ${AUTOFILL_STYLES} }

/* iOS does not allow styling \`::selection\` on inputs, so the native
   selection/caret artifact stays visible whenever a range is selected. The
   overlay ignores CSS opacity and ancestor clipping, but it does track the
   rendered text geometry, so:
   - \`text-indent: -9999px\` parks the text (and the artifact) offscreen. The
     reveal logic in \`ios_text_reveal.js\` brings it back only during pointer
     gestures, because the copy/paste menu only appears when it can anchor to an
     on-screen caret/selection rect.
   - \`letter-spacing: -.6em\` collapses the per-char pitch to ~0 so a selection
     renders the same size whether 1 or 6 chars are selected.
   - the 10x scale-down compresses the caret-height artifact; iOS floors the
     painted highlight at ~2x2px, so the reveal shows at most a 2px fleck.
   - computed font-size must stay >=16px or focusing the input zooms the page
     (WebKit checks computed, not rendered, size). */
@supports (-webkit-touch-callout: none) {
  [data-input-otp] { font-size: 16px !important; width: 1000% !important; height: 1000% !important; transform: scale(0.1) !important; transform-origin: 0 0 !important; letter-spacing: -.6em !important; text-indent: -9999px !important; left: -1px !important; right: 1px !important; }
}

/* Password manager badges are injected as a sibling of the field they attach to,
   inside a component that opts out of pointer events wholesale. */
[data-input-otp] + * { pointer-events: all !important; }
`

// The tag goes first in `head` so everything the page loads — the theme
// included — comes later in the cascade and wins a specificity tie. The few
// declarations that must hold regardless carry `!important` above.
//
// A selector an engine does not understand — `:autofill` in an older WebView,
// say — is dropped by the parser on its own, and losing one of these never
// breaks the input.
export function installStyles(nonce) {
  if (document.getElementById(STYLE_ELEMENT_ID)) return

  const element = document.createElement("style")
  element.id = STYLE_ELEMENT_ID
  if (nonce) element.setAttribute("nonce", nonce)
  element.textContent = RULES

  document.head.prepend(element)
}
