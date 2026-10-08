import { afterEach, describe, expect, it, vi } from 'vitest';
import { DevReceipt } from '../src/dev/DevReceipt';

// The styled receipt is DOM-dependent; these doubles preserve its real DOM tree
// and animation calls without requiring a browser or changing production code.
class ElementDouble {
  style: Record<string, string> = {};
  children: ElementDouble[] = [];
  parentElement: ElementDouble | null = null;
  className = '';
  textContent = '';
  value = '';
  readOnly = false;
  scrollTop = 0;
  scrollHeight = 1000;
  clientHeight = 200;
  offsetTop = 0;
  blur = vi.fn();
  setAttribute = vi.fn();
  animate = vi.fn(() => ({ cancel: vi.fn() }));
  getAnimations = vi.fn(() => []);
  classList = { contains: (name: string) => this.className.split(' ').includes(name) };
  appendChild(child: ElementDouble) { child.parentElement = this; this.children.push(child); return child; }
  append(...children: ElementDouble[]) { children.forEach((child) => this.appendChild(child)); }
  replaceChildren(fragment: ElementDouble) {
    this.children = [];
    fragment.children.forEach((child) => this.appendChild(child));
  }
}

function setup() {
  const host = new ElementDouble();
  const elements: ElementDouble[] = [];
  vi.stubGlobal('HTMLElement', ElementDouble);
  vi.stubGlobal('document', {
    createElement: vi.fn(() => {
      const element = new ElementDouble();
      elements.push(element);
      return element;
    }),
    createTextNode: (value: string) => Object.assign(new ElementDouble(), { textContent: value }),
    createDocumentFragment: () => new ElementDouble(),
    body: new ElementDouble(),
  });
  const receipt = new DevReceipt(host as never);
  return { receipt, host, elements, viewport: host.children[1] };
}

afterEach(() => vi.unstubAllGlobals());

describe('DevReceipt grid selection highlight', () => {
  it('wraps exactly the grid header and three rows with uniform padding', () => {
    const { receipt, viewport } = setup();
    receipt.event('PRIMARY GRID', ['A | B', 'C | D', 'E | F']);
    const wrapper = viewport.children.find((child) => child.className === 'receipt-grid');
    expect(wrapper).toBeDefined();
    expect(wrapper?.children).toHaveLength(4);
    expect(wrapper?.style.padding).toBe('6px');
    expect(wrapper?.style.marginTop).toBe('0');
    expect(wrapper?.style.borderLeft).toBe('2px solid transparent');
    expect(wrapper?.style.borderRadius).toBe('3px');
  });

  it('pulses the selected grid wrapper rather than the full receipt width', () => {
    const { receipt, viewport } = setup();
    receipt.event('PRE-SPIN GRID', ['A', 'B', 'C']);
    receipt.event('PRIMARY GRID', ['D', 'E', 'F']);
    const wrappers = viewport.children.filter((child) => child.className === 'receipt-grid');
    expect(wrappers).toHaveLength(2);
    receipt.scrollToGrid('PRIMARY GRID');
    expect(wrappers[0].animate).not.toHaveBeenCalled();
    expect(wrappers[1].animate).toHaveBeenCalledOnce();
    expect(wrappers[1].animate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: expect.any(String) })]),
      { duration: 600, easing: 'ease-out' },
    );
  });

  it('retains manual scrolling until explicit bottom-scroll is requested', () => {
    const { receipt, viewport } = setup();
    viewport.scrollTop = 75;
    receipt.event('PRIMARY GRID', ['A', 'B', 'C']);
    expect(viewport.scrollTop).toBe(75);
    receipt.scrollToBottom();
    expect(viewport.scrollTop).toBe(800);
  });
});
