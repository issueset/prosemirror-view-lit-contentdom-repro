import 'prosemirror-view/style/prosemirror.css'

import { html, render } from 'lit'
import { Schema } from 'prosemirror-model'
import { EditorState, Plugin } from 'prosemirror-state'
import type { NodeView } from 'prosemirror-view'
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view'

import './style.css'

const schema = new Schema({
  nodes: {
    doc: { content: '(code_block_1 | code_block_2 | code_block_3)+' },
    text: { group: 'inline' },
    code_block_1: {
      code: true,
      content: 'text*',
      defining: true,
      group: 'block',
      marks: '',
      parseDOM: [{ tag: 'pre[data-type="code-block-1"]', preserveWhitespace: 'full' }],
      toDOM: () => ['pre', { 'data-type': 'code-block-1' }, ['code', 0]],
    },
    code_block_2: {
      code: true,
      content: 'text*',
      defining: true,
      group: 'block',
      marks: '',
      parseDOM: [{ tag: 'pre[data-type="code-block-2"]', preserveWhitespace: 'full' }],
      toDOM: () => ['pre', { 'data-type': 'code-block-2' }, ['code', 0]],
    },
    code_block_3: {
      code: true,
      content: 'text*',
      defining: true,
      group: 'block',
      marks: '',
      parseDOM: [{ tag: 'pre[data-type="code-block-3"]', preserveWhitespace: 'full' }],
      toDOM: () => ['pre', { 'data-type': 'code-block-3' }, ['code', 0]],
    },
  },
})

function createContentDOM(renderer: string) {
  const contentDOM = document.createElement('code')
  contentDOM.setAttribute('data-content-dom', renderer)
  contentDOM.style.whiteSpace = 'inherit'
  return contentDOM
}

function createLitCodeBlockNodeView(): NodeView {
  const dom = document.createElement('div')
  dom.dataset.nodeViewRoot = 'true'
  dom.dataset.renderer = 'lit'

  const contentDOM = createContentDOM('lit')

  const component = document.createElement('lit-code-block')
  render(html`<pre data-type="code-block-2"></pre>`, component)
  const pre = component.querySelector('pre')
  if (!pre) throw new Error('Lit did not render the code block')
  pre.appendChild(contentDOM)
  dom.appendChild(component)

  return { dom, contentDOM }
}

function createPlainCodeBlockNodeView(): NodeView {
  const dom = document.createElement('div')
  dom.dataset.nodeViewRoot = 'true'
  dom.dataset.renderer = 'plain'

  const contentDOM = createContentDOM('plain')
  const pre = document.createElement('pre')
  pre.dataset.type = 'code-block-1'
  pre.appendChild(contentDOM)
  dom.appendChild(pre)

  return { dom, contentDOM }
}

function createCommentMarkerCodeBlockNodeView(): NodeView {
  const dom = document.createElement('div')
  dom.dataset.nodeViewRoot = 'true'
  dom.dataset.renderer = 'comment-marker'

  const component = document.createElement('comment-marker-code-block')
  const pre = document.createElement('pre')
  pre.dataset.type = 'code-block-3'
  const contentDOM = createContentDOM('comment-marker')

  // This is the light-DOM shape produced by Lit for the first node view:
  // <lit-code-block><!----><pre><code /></pre></lit-code-block>
  component.append(document.createComment(''), pre)
  pre.appendChild(contentDOM)
  dom.appendChild(component)

  return { dom, contentDOM }
}

const highlightPlugin = new Plugin({
  props: {
    decorations(state) {
      const decorations: Decoration[] = []
      state.doc.descendants((node, pos) => {
        if (!/^code_block_[123]$/.test(node.type.name)) return true

        for (const match of node.textContent.matchAll(/\S+/g)) {
          decorations.push(
            Decoration.inline(pos + 1 + match.index, pos + 1 + match.index + match[0].length, {
              style: getCodeTokenStyle(match[0]),
            }),
          )
        }
        return false
      })
      return DecorationSet.create(state.doc, decorations)
    },
  },
})

function getCodeTokenStyle(token: string): string {
  if (/^(?:const|let|var|function|return)$/.test(token)) return 'color: rgb(207, 34, 46)'
  if (token.startsWith('"')) return 'color: rgb(17, 99, 41)'
  if (/^[=!<>+*/-]+$/.test(token)) return 'color: rgb(149, 56, 0)'
  return 'color: rgb(5, 80, 174)'
}

const initialDoc = schema.node('doc', null, [
  schema.node('code_block_1', null, [schema.text('const plain = "hello"')]),
  schema.node('code_block_2', null, [schema.text('const lit = "hello"')]),
  schema.node('code_block_3', null, [schema.text('const marker = "hello"')]),
])

const editorElement = document.querySelector('#editor')
const stateElement = document.querySelector('#state')
if (!(editorElement instanceof HTMLElement) || !(stateElement instanceof HTMLElement)) {
  throw new Error('Missing reproduction DOM')
}

const view = new EditorView(editorElement, {
  state: EditorState.create({
    doc: initialDoc,
    plugins: [highlightPlugin],
    schema,
  }),
  nodeViews: {
    code_block_1: () => createPlainCodeBlockNodeView(),
    code_block_2: () => createLitCodeBlockNodeView(),
    code_block_3: () => createCommentMarkerCodeBlockNodeView(),
  },
  dispatchTransaction(transaction) {
    view.updateState(view.state.apply(transaction))
    stateElement.textContent = JSON.stringify(view.state.doc.toJSON(), null, 2)
  },
})

stateElement.textContent = JSON.stringify(view.state.doc.toJSON(), null, 2)

declare global {
  interface Window {
    editorView: EditorView
  }
}

window.editorView = view
