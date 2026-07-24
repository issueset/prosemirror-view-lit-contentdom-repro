# Minimal `prosemirror-view` contentDOM replacement reproduction

The page compares three code blocks:

| Node type | Renderer | Extra DOM around `<pre>` |
| --- | --- | --- |
| `code_block_1` | plain DOM | none |
| `code_block_2` | Lit | wrapper element and Lit comment marker |
| `code_block_3` | plain DOM | the same wrapper and comment marker, created manually |

## Reproduction steps

1. Run `pnpm install && pnpm dev`.
2. Open `http://127.0.0.1:4173` in Chrome or Safari.
3. Select all text in a block and type `1`. Refresh between blocks.

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

<!-- code_block_3: plain DOM with the Lit-shaped marker structure -->
<div data-node-view-root="true" data-renderer="comment-marker">
  <comment-marker-code-block>
    <!---->
    <pre data-type="code-block-3">
      <code data-content-dom="comment-marker">...highlighted spans...</code>
    </pre>
  </comment-marker-code-block>
</div>
```

## Failure

In Chromium and WebKit, selecting all highlighted code and typing `1` removes
the complete `<code contentDOM>` element. The browser inserts `1` into its
former `<pre>` parent and preserves the active color with a `<font>` element.

For `code_block_2` and `code_block_3`, the important resulting structure is:

```html
<node-view-wrapper>
  <font color="#cf222e">
    <!---->
    <pre>1</pre>
  </font>
</node-view-wrapper>
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

`code_block_3` produces the same error with its own node type. This proves Lit
itself is not required. The trigger is the wrapper plus sibling comment marker
DOM shape that Lit naturally produces.

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
| Plain DOM with comment marker, `code_block_3` | fails | passes | fails |

The four failures contain an extra empty `code_block_2` or `code_block_3`
before the block containing `1`.
