# Minimal `prosemirror-view` contentDOM replacement reproduction

The page compares three code blocks:

| Node type | Renderer | Extra DOM around `<pre>` |
| --- | --- | --- |
| `code_block_1` | plain DOM | none |
| `code_block_2` | Lit | wrapper element and Lit comment marker |
| `code_block_3` | plain DOM | wrapper element and a decoy `<code>` sibling |

## Reproduction steps

1. Open the [live demo](https://issueset.github.io/prosemirror-view-lit-contentdom-repro/)
   in Chrome or Safari. To run locally, use `pnpm install && pnpm dev`, then
   open `http://127.0.0.1:4173`.
2. In each code block, select all text and type `1`.

`code_block_1` works. `code_block_2` and `code_block_3` create an extra empty
block in `Editor state`.

## DOM before typing

All blocks use the same inline syntax highlighter. It gives keywords,
identifiers, operators, and strings different colors:

```html
<code>
  <span style="color: rgb(207, 34, 46)">const</span>
  <span style="color: rgb(5, 80, 174)">name</span>
  <span style="color: rgb(149, 56, 0)">=</span>
  <span style="color: rgb(17, 99, 41)">"hello"</span>
</code>
```

The resulting NodeView structures are:

```html
<!-- code_block_1: plain DOM -->
<div data-node-view-root="true" data-renderer="plain">
  <pre data-type="code-block-1">
    <code data-content-dom="plain">...highlighted spans...</code>
  </pre>
</div>

<!-- code_block_2: Lit -->
<div data-node-view-root="true" data-renderer="lit">
  <lit-code-block>
    <!---->
    <pre data-type="code-block-2">
      <code data-content-dom="lit">...highlighted spans...</code>
    </pre>
  </lit-code-block>
</div>

<!-- code_block_3: plain DOM with a decoy that resembles contentDOM -->
<div data-node-view-root="true" data-renderer="decoy">
  <decoy-code-block>
    <code data-content-dom="decoy-fake"></code>
    <pre data-type="code-block-3">
      <code data-content-dom="decoy">...highlighted spans...</code>
    </pre>
  </decoy-code-block>
</div>
```

## Failure

In Chromium and WebKit, selecting all highlighted code and typing `1` removes
the complete `<code contentDOM>` element. The browser inserts `1` into its
former `<pre>` parent and preserves the active color with a `<font>` element.

For `code_block_2`, the important resulting structure is:

```html
<lit-code-block>
  <font color="#cf222e">
    <!---->
    <pre>1</pre>
  </font>
</lit-code-block>
```

`code_block_3` has no comment. The browser wraps the decoy and `<pre>`
together:

```html
<decoy-code-block>
  <font color="#cf222e">
    <code data-content-dom="decoy-fake"></code>
    <pre>1</pre>
  </font>
</decoy-code-block>
```

`prosemirror-view@1.42.2` notices that `contentDOM` was removed. It tries to
recover the replacement content from the mutation's added nodes, but chooses
the top-level `<font>` as `contentElement`. That `<font>` contains another
`<pre>`, so parsing it as code block content produces:

```json
[
  { "type": "code_block_2" },
  {
    "type": "code_block_2",
    "content": [{ "type": "text", "text": "1" }]
  }
]
```

The correct result is one block:

```json
[
  {
    "type": "code_block_2",
    "content": [{ "type": "text", "text": "1" }]
  }
]
```

`code_block_3` produces the same error with its own node type. This proves the
failure is not specific to Lit or comment nodes. Another element before
`<pre>` can trigger the same unreliable `contentElement` choice.

`code_block_1` passes because it has neither of those extra nodes. Firefox
passes all three cases because it edits the text in place instead of replacing
`contentDOM`.

## Run

```sh
pnpm install
pnpm build
pnpm test
```

The expected result with the bug is `4 failed, 5 passed`:

| Node view | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| Plain DOM, `code_block_1` | passes | passes | passes |
| Lit, `code_block_2` | fails | passes | fails |
| Plain DOM with decoy `<code>`, `code_block_3` | fails | passes | fails |

The four failures contain an extra empty `code_block_2` or `code_block_3`
before the block containing `1`.
