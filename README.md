<div align="center">

# input-otp-zero

**One invisible input, any UI you can imagine.**

The accessible, themeable, zero-dependency one-time-password element for plain
HTML — no framework, no build step required.

</div>

<br />

A vanilla port of [input-otp](https://github.com/guilhermerodz/input-otp) by
Guilherme Rodz: same engine, no React. Ships as a custom element and a
CSS-variable theme.

## Why

HTML has no one-time-password control. There is no `<input type="otp">`, so most
products build one out of six separate inputs wired together with keydown
handlers that shuffle focus between them — and quietly lose SMS autofill, screen
reader support, partial paste, undo, and half the keyboard along the way.

`input-otp-zero` renders **exactly one real text input**, paints it invisible,
and draws slots on top of it. Everything the browser gives a text field keeps
working, because there is still a text field.

- **SMS autofill** — `autocomplete="one-time-code"` only means something on a single field
- **Screen readers** — one control, one name, one value, one caret, one tab stop
- **Every keybinding you didn't implement** — select-all, word-delete, shift-arrow ranges, undo, the iOS long-press menu
- **Real paste** — including a partial paste into the middle of a half-filled code
- **Form semantics** — one `name`, one entry in `FormData`, a real `<label>` that focuses it
- **Progressive enhancement** — put a plain `<input>` inside and it stays usable if the script never runs
- **Themeable** — every colour, size and timing is a CSS custom property
- **Zero dependencies** — ~4 KB brotli, no framework

## Install

```bash
npm install input-otp-zero
```

Two things: the script, and the theme in your HTML.

```html
<link rel="stylesheet" href="/input-otp-zero.css">
<script type="module" src="/input-otp-zero.esm.js"></script>
```

The script defines `<input-otp>` and injects the rules that make one text field
behave like six boxes — that part is machinery, and it is never optional. The
theme is `dist/input-otp-zero.css`: link it, paste it into a `<style>` tag, or
fold it into your own stylesheet. It is plain CSS with no build step of its own.

The machinery's `<style>` tag goes first in `<head>`, so both the theme and your
own CSS come later in the cascade and win a specificity tie — you never have to
out-specify the defaults to change them.

## Usage

`maxlength` is the number of slots. That's the whole contract.

```html
<label for="code">Verification code</label>

<input-otp maxlength="6" pattern="digits">
  <input id="code" name="code">
</input-otp>
```

The inner `<input>` is optional. Provide one when you want to control its
`id`/`name` from markup or keep the field usable before the script loads;
otherwise one is created for you.

### Composing your own slots

Write the slot markup yourself and it is adopted as-is — grouped, separated,
with whatever classes you like. Any `[data-input-otp-slot]` element inside the
component becomes a slot, and the slot count comes from the markup:

```html
<input-otp pattern="digits">
  <div data-input-otp-group>
    <div data-input-otp-slot></div>
    <div data-input-otp-slot></div>
    <div data-input-otp-slot></div>
  </div>

  <div data-input-otp-separator></div>

  <div data-input-otp-group>
    <div data-input-otp-slot></div>
    <div data-input-otp-slot></div>
    <div data-input-otp-slot></div>
  </div>
</input-otp>
```

Each slot is painted with data attributes and two child elements, which are
created for you if they are missing:

```html
<div data-input-otp-slot data-active data-filled>
  <span data-input-otp-char>4</span>
  <span data-input-otp-caret data-visible></span>
</div>
```

### Reacting to the value

```js
const otp = document.querySelector("input-otp")

otp.addEventListener("input-otp:complete", event => {
  event.target.closest("form").requestSubmit()
})

otp.addEventListener("input-otp:change", event => {
  console.log(event.detail.value)
})
```

Native `input` and `change` events fire from the inner input too, so anything
that already listens for those keeps working.

## Theming

Every visual decision is a custom property. Set them anywhere — on `:root`, on a
container, or on a single element:

```css
:root {
  --input-otp-slot-width: 3rem;
  --input-otp-border-color-active: #635bff;
  --input-otp-ring-color: rgb(99 91 255 / 0.4);
  --input-otp-caret-color: #635bff;
}
```

| Property | Default | |
| --- | --- | --- |
| `--input-otp-gap` | `0.5rem` | space between slots |
| `--input-otp-group-gap` | `0.75rem` | space between groups and separators |
| `--input-otp-slot-width` | `2.75rem` | |
| `--input-otp-slot-height` | `3.5rem` | |
| `--input-otp-slot-radius` | `0.5rem` | |
| `--input-otp-slot-background` | `#ffffff` | |
| `--input-otp-slot-background-active` | `#ffffff` | |
| `--input-otp-border-width` | `1px` | |
| `--input-otp-border-color` | `#d4d4d8` | |
| `--input-otp-border-color-active` | `#18181b` | the slot being edited |
| `--input-otp-ring-width` | `2px` | focus ring around the active slot |
| `--input-otp-ring-color` | `rgb(24 24 27 / 0.75)` | |
| `--input-otp-ring-offset` | `0px` | |
| `--input-otp-color` | `#18181b` | |
| `--input-otp-placeholder-color` | `#a1a1aa` | |
| `--input-otp-font-family` | `ui-monospace, …` | |
| `--input-otp-font-size` | `1.375rem` | |
| `--input-otp-font-weight` | `500` | |
| `--input-otp-caret-color` | `#18181b` | |
| `--input-otp-caret-width` | `1px` | |
| `--input-otp-caret-height` | `2rem` | |
| `--input-otp-caret-blink-duration` | `1s` | |
| `--input-otp-separator-color` | `#a1a1aa` | |
| `--input-otp-separator-width` | `1.5rem` | |
| `--input-otp-separator-thickness` | `2px` | the Stripe-style dash |
| `--input-otp-transition-duration` | `150ms` | |
| `--input-otp-transition-easing` | `ease-out` | |
| `--input-otp-disabled-opacity` | `0.5` | |

The theme follows `prefers-color-scheme` and also honours
`<html data-theme="dark">` / `data-theme="light"`.

`appearance="seamless"` collapses the gaps into one continuous box with dividers
between the slots.

## What it handles for you

The value is the list of things that go wrong when one invisible input has to
behave like six boxes — and the fix for each:

| | |
| --- | --- |
| A collapsed caret has no slot | The selection is rewritten into a one-character range on every `selectionchange` — except at the append position, where a bare caret is meaningful |
| `ArrowLeft` appears to skip a slot | Direction is inferred from the previous selection, with a guard for leaving insert mode |
| Deleting doesn't fire `selectionchange` | The event is dispatched by hand when the value shrinks |
| Password manager badges cover the last slot | A badge is detected by known extension markers, then by probing the field's top-right corner; the input widens 40px behind a `clip-path` — no visible layout shift |
| iOS won't paste into an invisible input | The field keeps `opacity: 1` and hides itself with transparent colours; paste is handled manually |
| iOS shows a selection artifact | The text is parked offscreen and revealed only while a pointer gesture is in flight, so the native edit menu can still anchor |
| Autofill paints its own background | `:autofill` is neutralised, and the state is shaken off with a synthetic `input` event |
| Chrome translates the slots and breaks them | The component is marked `translate="no"` — a one-time code is never worth translating |
| No JavaScript means no visible field | The inner `<input>` you provide is styled as a plain visible field until the element upgrades |

## API

### Attributes

| | |
| --- | --- |
| `maxlength` | number of slots, default `6`. Ignored when you provide your own slot markup |
| `value` | initial value |
| `pattern` | `digits`, `chars`, `digits-and-chars`, or any regular expression source. Gates every change; no default |
| `placeholder` | per-slot placeholder characters, shown until the first character is typed |
| `name` | submitted under this name |
| `inputmode` | default `numeric` |
| `autocomplete` | default `one-time-code` |
| `text-align` | `left` (default), `center`, `right` |
| `appearance` | `seamless` for one continuous box |
| `disabled`, `required`, `autofocus` | forwarded to the input |
| `push-password-manager-strategy` | `increase-width` (default) or `none` |
| `nonce` | applied to the injected `<style>` tag, for CSP `style-src` |

### Properties

| | |
| --- | --- |
| `value` | get or set the current value; setting it fires the events below |
| `maxLength`, `pattern`, `placeholder`, `disabled` | mirror the attributes |
| `isComplete` | whether every slot is filled |
| `slots` | the current slot state — `{ index, char, placeholderChar, isActive, hasFakeCaret }[]` |
| `input` | the real `<input>` element |
| `pasteTransformer` | `(pasted: string) => string`, run over the clipboard text before it is inserted |
| `renderSlot` | `(element, state) => void`, replaces the default per-slot painting |

### Methods

`focus()`, `blur()`, `select()`, `clear()`.

### Events

| | |
| --- | --- |
| `input-otp:change` | `detail: { value }` — bubbles, on every change |
| `input-otp:complete` | `detail: { value }` — bubbles, once on the transition to full |
| `input-otp:render` | `detail: { slots }` — after each repaint |

### Data attributes

On the component: `data-focused`, `data-hovering`, `data-disabled`,
`data-complete`, `data-empty`.

On a slot: `data-active`, `data-filled`, `data-placeholder`. On its caret:
`data-visible`.

### Exports

```js
import {
  InputOtpElement,
  defineElements,
  computeSlots,
  resolvePattern,
  REGEXP_ONLY_DIGITS,
  REGEXP_ONLY_CHARS,
  REGEXP_ONLY_DIGITS_AND_CHARS
} from "input-otp-zero"
```

## Development

```bash
npm install
npm run build            # dist/ — esm, minified, gzip and brotli, plus the CSS
npm run lint             # eslint, JS and CSS
npm test                 # vitest, jsdom
npm run test:browser     # playwright, chromium + firefox + webkit
npm run playground       # the fixture pages, as a live playground
```

Tests come in two layers. **Vitest** (`test/unit/`) covers the pure logic and
the element's own contract in jsdom. **Playwright** (`test/browser/`) drives real
browsers for everything that only a browser can tell you: typing, arrow keys,
selection, paste, focus, layout and theming.

## Credits

A port of [input-otp](https://github.com/guilhermerodz/input-otp) by Guilherme
Rodz — every edge case here was found and solved there first.

## License

MIT
