/** Browser-only diagnostics: selectors and sizes, never visible text or input values. */
export function readPageGeometry() {
  const visibleInDetails = (element: Element) => {
    const closed = element.closest('details:not([open])');
    return !closed || Boolean(closed.querySelector(':scope > summary')?.contains(element));
  };
  const elements = Array.from(document.querySelectorAll('body *')).filter(visibleInDetails).map(element => ({
    tag: element.tagName, class: element.getAttribute('class') ?? '',
    right: Math.round(element.getBoundingClientRect().right + scrollX),
  })).filter(element => element.right > innerWidth + 1).sort((a, b) => b.right - a.right).slice(0, 5);
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode, parent = node.parentElement;
    if (!parent || !visibleInDetails(parent) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName) || !node.textContent?.trim()) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    const bounds = range.getBoundingClientRect();
    if (bounds.width > 0 && bounds.right + scrollX > innerWidth + 1) texts.push({
      tag: parent.tagName, class: parent.getAttribute('class') ?? '',
      chars: node.textContent.trim().length, right: Math.round(bounds.right + scrollX),
    });
  }
  return { fits: document.documentElement.scrollWidth <= innerWidth + 1,
    viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, scrollX, elements, texts: texts.slice(0, 5) };
}
