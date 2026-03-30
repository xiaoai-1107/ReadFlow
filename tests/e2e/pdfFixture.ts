function escapePdfText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function buildPageContent(lines: string[]) {
  const commands = ['BT', '/F1 12 Tf', '18 TL', '1 0 0 1 48 780 Tm']

  lines.forEach((line, index) => {
    const escaped = escapePdfText(line)
    if (index === 0) {
      commands.push(`(${escaped}) Tj`)
      return
    }

    commands.push(`T* (${escaped}) Tj`)
  })

  commands.push('ET')
  return commands.join('\n')
}

export function buildReaderFixturePdf() {
  const pages = [
    [
      'ReadFlow fixture page one opens with a calm sentence for tap testing.',
      'Each short line becomes its own paragraph so scrolling can update the current marker.',
      'The quick brown fox watches the toolbar while the first button waits for a click.',
      'A highlighted sentence should surface a card, a state change, and a visible reaction.',
      'This paragraph is intentionally long enough to wrap on a narrow viewport without overflowing across the screen width.',
      'Reader mode switching should remain responsive after this line appears.',
      'The structure drawer should open and close without leaving a transparent overlay behind.',
      'Study review should stay interactive after the layer is dismissed.',
      'Paragraph tracking should move as the user scrolls down the page.',
      'Offline status text should stay readable above the bottom bar.',
      'Another paragraph keeps the fixture tall enough for mobile scrolling.',
      'This extra sentence gives the parser another stable anchor.',
      'The details sheet should not hide the main text forever.',
      'A second long paragraph exists to verify wrapping of translated blocks and helper text in compact layouts.',
      'Tapping the same sentence twice should still leave visible feedback.',
      'Clicking outside a panel should close only the active layer, not the entire interaction model.',
      'Desktop interactions should keep working after menus open and close.',
      'No panel should freeze the whole UI in this fixture.',
      'Long task logging should remain empty during a healthy interaction path.',
      'The current paragraph should eventually move away from the first one.',
      'One more paragraph sits near the fold for screenshot coverage.',
      'Page one ends here with another complete sentence.'
    ],
    [
      'Page two starts with another readable sentence for scroll verification.',
      'The user should still be able to tap sentence fragments after moving deeper into the document.',
      'Translation mode should not crop the article body when more text becomes visible.',
      'A slightly longer line is included here to make wrapping obvious on small screens and to check that the body width remains bounded.',
      'Closing a drawer should restore click handling on the article immediately.',
      'The more menu should open from the toolbar instead of silently collapsing.',
      'The study panel should not trap the page in a dead overlay state.',
      'The final paragraphs exist to ensure the current paragraph observer continues changing.',
      'Scroll position recovery should remain compatible with these automated interactions.',
      'Paragraph highlights and tags are outside the core assertions but should stay reachable.',
      'Another compact sentence keeps the parser happy.',
      'This is the final fixture paragraph for the second page.'
    ]
  ]

  const objects: string[] = []
  const pageRefs: string[] = []

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

  pages.forEach((pageLines, index) => {
    const pageObjectId = 4 + index * 2
    const contentObjectId = pageObjectId + 1
    const content = buildPageContent(pageLines)
    pageRefs.push(`${pageObjectId} 0 R`)
    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    objects[contentObjectId] = `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`
  })

  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [ ${pageRefs.join(' ')} ] >>`

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'utf8')
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length}\n`
  pdf += '0000000000 65535 f \n'

  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf, 'utf8')
}
