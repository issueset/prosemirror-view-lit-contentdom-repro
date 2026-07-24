import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const litText = 'const lit = "hello"'
const plainText = 'const plain = "hello"'
const markerText = 'const marker = "hello"'

const initialText = {
  lit: litText,
  plain: plainText,
  'comment-marker': markerText,
} as const

async function replaceAllContent(page: Page, renderer: keyof typeof initialText) {
  const contentDOM = page.locator(`code[data-content-dom="${renderer}"]`)
  await expect(contentDOM).toContainText(initialText[renderer])
  await expect(contentDOM.locator('span')).toHaveCount(4)
  await expect
    .poll(async () => {
      const colors = await contentDOM.locator('span').evaluateAll((spans) =>
        spans.map((span) => (span as HTMLElement).style.color),
      )
      return new Set(colors).size
    })
    .toBe(4)

  await contentDOM.click()
  await contentDOM.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    const textNodes: Text[] = []
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

    const firstText = textNodes.at(0)
    const lastText = textNodes.at(-1)
    const selection = window.getSelection()
    if (!selection || !firstText || !lastText) throw new Error('Could not select code block text')

    const range = document.createRange()
    range.setStart(firstText, 0)
    range.setEnd(lastText, lastText.length)
    selection.removeAllRanges()
    selection.addRange(range)
  })

  await page.keyboard.type('1')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
})

test('Lit node view keeps one code block containing the typed character', async ({ page }) => {
  await replaceAllContent(page, 'lit')
  const actual = await page.evaluate(() => window.editorView.state.doc.toJSON())
  expect(actual).toEqual({
    type: 'doc',
    content: [
      {
        type: 'code_block_1',
        content: [{ type: 'text', text: plainText }],
      },
      {
        type: 'code_block_2',
        content: [{ type: 'text', text: '1' }],
      },
      {
        type: 'code_block_3',
        content: [{ type: 'text', text: markerText }],
      },
    ],
  })
})

test('plain DOM node view keeps one code block containing the typed character', async ({ page }) => {
  await replaceAllContent(page, 'plain')
  const actual = await page.evaluate(() => window.editorView.state.doc.toJSON())
  expect(actual).toEqual({
    type: 'doc',
    content: [
      {
        type: 'code_block_1',
        content: [{ type: 'text', text: '1' }],
      },
      {
        type: 'code_block_2',
        content: [{ type: 'text', text: litText }],
      },
      {
        type: 'code_block_3',
        content: [{ type: 'text', text: markerText }],
      },
    ],
  })
})

test('comment-marker node view keeps one code block containing the typed character', async ({ page }) => {
  await replaceAllContent(page, 'comment-marker')
  const actual = await page.evaluate(() => window.editorView.state.doc.toJSON())
  expect(actual).toEqual({
    type: 'doc',
    content: [
      {
        type: 'code_block_1',
        content: [{ type: 'text', text: plainText }],
      },
      {
        type: 'code_block_2',
        content: [{ type: 'text', text: litText }],
      },
      {
        type: 'code_block_3',
        content: [{ type: 'text', text: '1' }],
      },
    ],
  })
})
