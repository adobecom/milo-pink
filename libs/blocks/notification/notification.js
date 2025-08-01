/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/*
* Notification - v1.2
*/

import { decorateBlockText, decorateBlockBg, decorateTextOverrides, decorateMultiViewport, loadCDT } from '../../utils/decorate.js';
import { createTag, getConfig, loadStyle, createIntersectionObserver } from '../../utils/utils.js';

const { miloLibs, codeRoot } = getConfig();
const base = miloLibs || codeRoot;
const variants = ['banner', 'ribbon', 'pill'];
const sizes = ['small', 'medium', 'large'];
const [banner, ribbon, pill] = variants;
const [small, medium, large] = sizes;
const defaultSize = medium;
const defaultVariant = banner;
const blockConfig = {
  [banner]: {
    [small]: ['s', 's', 's', 'm'],
    [medium]: ['m', 'm', 'm', 'l'],
    [large]: ['l', 'l', 'l', 'l'],
  },
  [ribbon]: {
    [small]: ['s', 's', 's', 'm'],
    [medium]: ['m', 'm', 'm', 'l'],
    [large]: ['l', 'l', 'l', 'l'],
  },
  [pill]: {
    [small]: ['s', 's', 's', 'm'],
    [medium]: ['m', 'm', 'm', 'l'],
    [large]: ['l', 'm', 'm', 'l'],
  },
};

const closeSvg = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <g clip-path="url(#clip0_699_20329)">
    <path d="M17.071 2.9289C15.6725 1.53038 13.8907 0.577987 11.9509 0.192144C10.0111 -0.1937 8.0004 0.00433988 6.17314 0.761219C4.34589 1.5181 2.78411 2.79982 1.6853 4.44431C0.586487 6.0888 0 8.02219 0 10C0 11.9778 0.586487 13.9112 1.6853 15.5557C2.78411 17.2002 4.34589 18.4819 6.17314 19.2388C8.0004 19.9957 10.0111 20.1937 11.9509 19.8079C13.8907 19.422 15.6725 18.4696 17.071 17.0711C17.9996 16.1425 18.7362 15.0401 19.2388 13.8269C19.7413 12.6136 20 11.3132 20 10C20 8.68677 19.7413 7.3864 19.2388 6.17314C18.7362 4.95988 17.9996 3.85748 17.071 2.9289ZM13.9082 14.7616C13.814 14.8558 13.6862 14.9087 13.5529 14.9087C13.4197 14.9087 13.2919 14.8558 13.1977 14.7616L10.0002 11.5636L6.80219 14.7616C6.70795 14.8558 6.58016 14.9087 6.44691 14.9087C6.31366 14.9087 6.18587 14.8558 6.09163 14.7616L5.23736 13.9073C5.14316 13.813 5.09023 13.6853 5.09023 13.552C5.09023 13.4188 5.14316 13.291 5.23736 13.1967L8.43636 10.0003L5.23887 6.80276C5.19215 6.75609 5.15508 6.70067 5.12979 6.63967C5.10451 6.57867 5.09149 6.51328 5.09149 6.44724C5.09149 6.3812 5.10451 6.31581 5.12979 6.25481C5.15508 6.1938 5.19215 6.13838 5.23887 6.09171L6.09314 5.23744C6.18738 5.14323 6.31517 5.09031 6.44842 5.09031C6.58167 5.09031 6.70946 5.14323 6.80369 5.23744L10.0002 8.43643L13.1982 5.23895C13.2448 5.19222 13.3003 5.15516 13.3613 5.12987C13.4223 5.10458 13.4877 5.09157 13.5537 5.09157C13.6197 5.09157 13.6851 5.10458 13.7461 5.12987C13.8071 5.15516 13.8626 5.19222 13.9092 5.23895L14.761 6.09322C14.8552 6.18745 14.9081 6.31525 14.9081 6.44849C14.9081 6.58174 14.8552 6.70954 14.761 6.80377L11.564 10.0003L14.761 13.1977C14.8552 13.292 14.9081 13.4198 14.9081 13.553C14.9081 13.6863 14.8552 13.8141 14.761 13.9083L13.9082 14.7616Z" class="path"/>
  </g>
  <defs>
    <clipPath id="clip0_699_20329">
      <rect width="20" height="20" fill="white"/>
    </clipPath>
  </defs>
</svg>`;
const selectedSelector = '[aria-selected="true"], [aria-checked="true"]';
let iconographyLoaded = false;
const focusableNotificationElements = 'button, a[href], [tabindex]:not([tabindex="-1"])';

function getOpts(el) {
  const optRows = [...el.querySelectorAll(':scope > div:nth-of-type(n+3)')];
  if (!optRows.length) return {};
  optRows.forEach((row) => row.remove());
  const camel = (str) => str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  const fmt = (child) => child.textContent.toLowerCase().replace('\n', '').trim();
  return optRows.reduce((a, c) => ({ ...a, [camel(fmt(c.children[0]))]: fmt(c.children[1]) }), {});
}

function getBlockData(el) {
  const variant = variants.find((varClass) => el.classList.contains(varClass)) || defaultVariant;
  const size = sizes.find((sizeClass) => el.classList.contains(sizeClass)) || defaultSize;
  const fontSizes = [...blockConfig[variant][size]];
  const buttonSize = el.className.match(/([xsml]+)-button/);
  if (buttonSize) fontSizes.splice(3, 1, buttonSize[1]);
  return { fontSizes, options: { ...getOpts(el) } };
}

export function findFocusableInSection(section, selSelector, focSelector) {
  if (!section) return null;

  const selectedElement = section.querySelector(selSelector);
  if (selectedElement) return selectedElement;

  const focusableElements = [...section.querySelectorAll(focSelector)];
  return focusableElements.length > 0
    ? focusableElements[focusableElements.length - 1]
    : null;
}

function wrapCopy(foreground) {
  const texts = foreground.querySelectorAll('.text');
  if (!texts) return;
  texts.forEach((text) => {
    const heading = text?.querySelector('h1, h2, h3, h4, h5, h6, p:not(.icon-area, .action-area)');
    const icon = heading?.previousElementSibling;
    const body = heading?.nextElementSibling?.classList.contains('action-area') ? '' : heading?.nextElementSibling;
    const copy = createTag('div', { class: 'copy-wrap' }, [heading, body].filter(Boolean));
    text?.insertBefore(copy, icon?.nextSibling || text.children[0]);
  });
}

const closeBanner = (el) => {
  let isSticky = false;
  let rect;
  const sectionElement = el.closest('.section');
  const isFocusable = el.classList.contains('focus');

  if (sectionElement?.className.includes('sticky')) {
    isSticky = true;
    rect = sectionElement.getBoundingClientRect();
  }
  el.focusTrapCleanup?.();

  if (isFocusable) {
    document.body.classList.remove('mobile-disable-scroll');
    sectionElement?.querySelector('.notification-curtain')?.remove();
  }

  el.removeAttribute('aria-modal');
  el.removeAttribute('role');
  el.style.display = 'none';
  sectionElement?.classList.add('close-sticky-section');

  if (isFocusable) {
    setTimeout(() => {
      const tempFocus = createTag('div', { class: 'temp-focus' });
      tempFocus.tabIndex = 0;
      document.body.insertBefore(tempFocus, document.body.firstChild);
      tempFocus.focus();
      document.body.removeChild(tempFocus);
    });
  }

  if (isSticky && !isFocusable) {
    setTimeout(() => {
      let focusTarget;
      const allFocusableElements = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const elementAtPosition = document.elementFromPoint(rect.left, rect.top);
      const stickySection = elementAtPosition.closest('.section');
      focusTarget = findFocusableInSection(stickySection, selectedSelector, allFocusableElements);

      let currentSection = sectionElement?.previousElementSibling;
      while (currentSection && !focusTarget) {
        focusTarget = findFocusableInSection(
          currentSection,
          selectedSelector,
          allFocusableElements,
        );
        if (!focusTarget) currentSection = currentSection.previousElementSibling;
      }

      const header = document.querySelector('header');
      if (!focusTarget && header) {
        const headerFocusable = [...header.querySelectorAll(allFocusableElements)];
        focusTarget = headerFocusable[headerFocusable.length - 1];
      }

      if (focusTarget && document.activeElement.tagName === 'BODY') focusTarget.focus({ preventScroll: true });
    }, 2000);
  }

  setTimeout(() => {
    const liveRegion = document.querySelector(`.notification-visibility-hidden[data-notification-id="${el.dataset.notificationId}"]`);
    if (liveRegion) liveRegion.textContent = 'Banner closed';
  }, 100);

  document.dispatchEvent(new CustomEvent('milo:sticky:closed'));
};

function addCloseAction(el, btn) {
  btn.addEventListener('click', (e) => {
    if (btn.nodeName === 'A') e.preventDefault();
    closeBanner(el);
  });
}

function decorateClose(el) {
  const btn = createTag('button', { 'aria-label': 'Close Promo Banner', class: 'close' }, closeSvg);
  addCloseAction(el, btn);
  el.appendChild(btn);
}

function decorateFlexible(el) {
  const innards = [
    el.querySelector('.background'),
    el.querySelector('.foreground'),
    el.querySelector('.close'),
  ].filter(Boolean);
  const inner = createTag('div', { class: 'flexible-inner' }, innards);
  if (el.style.background) {
    inner.style.background = el.style.background;
    el.style.removeProperty('background');
  }
  el.appendChild(inner);
}

async function loadIconography() {
  await new Promise((resolve) => { loadStyle(`${base}/styles/iconography.css`, resolve); });
  iconographyLoaded = true;
}

async function decorateLockup(lockupArea, el) {
  if (!iconographyLoaded) await loadIconography();
  const icon = lockupArea.querySelector('picture');
  const content = icon.nextElementSibling || icon.nextSibling;
  const label = createTag('span', { class: 'lockup-label' }, content.nodeValue || content);
  if (content.nodeType === 3) {
    lockupArea.replaceChild(label, content);
  } else {
    lockupArea.appendChild(label);
  }
  lockupArea.classList.add('lockup-area');
  const pre = el.className.match(/([xsml]+)-(lockup|icon)/);
  if (!pre) el.classList.add(`${el.matches('.pill') ? 'm' : 'l'}-lockup`);
  if (pre && pre[2] === 'icon') el.classList.replace(pre[0], `${pre[1]}-lockup`);
}

function curtainCallback(el) {
  const curtain = createTag('div', { class: 'notification-curtain' });
  document.body.classList.add('mobile-disable-scroll');
  el.insertAdjacentElement('afterend', curtain);
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');

  const focusableElements = [...el.querySelectorAll(focusableNotificationElements)];
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  if (!document.querySelector('.dialog-modal') && firstFocusable) firstFocusable.focus();

  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') {
      if (e.key === 'Escape') closeBanner(el);
      return;
    }

    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
      return;
    }

    if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  };

  const handleFocusOut = (e) => {
    if (!el.contains(e.relatedTarget) && firstFocusable) firstFocusable.focus();
  };

  const handleCurtainClick = (e) => { if (e.target === curtain) closeBanner(el); };

  el.addEventListener('keydown', handleKeyDown);
  el.addEventListener('focusout', handleFocusOut);
  curtain.addEventListener('click', handleCurtainClick);
  window.addEventListener('milo:modal:closed:notification', () => {
    el.querySelector(focusableNotificationElements)?.focus();
  });

  el.focusTrapCleanup = () => {
    el.removeEventListener('keydown', handleKeyDown);
    el.removeEventListener('focusout', handleFocusOut);
    curtain.removeEventListener('click', handleCurtainClick);
  };
}

function decorateSplitList(el, listContent) {
  const closeEvent = '#_evt-close';
  const listContainer = createTag('div', { class: 'split-list-area' });
  listContent?.querySelectorAll('li').forEach((item) => {
    const listItem = createTag('div', { class: 'split-list-item' });
    const pic = item.querySelector('picture');
    if (!pic) return;
    const textli = ['STRONG', 'EM', 'A'].includes(item.lastElementChild.nodeName)
      ? item
      : item.nextElementSibling;
    const btn = createTag('div', {}, textli.lastElementChild);
    const btnA = btn.querySelector('a');
    if (btnA?.href.includes(closeEvent)) {
      btnA.href = closeEvent;
      addCloseAction(el, btnA);
    }
    const textContent = createTag('div', { class: 'text-content' });
    const text = createTag('div', {}, textli.innerText.trim());
    textContent.append(pic, text);
    listItem.append(textContent, btn);
    listContainer.append(listItem);
    pic.querySelector('img').loading = 'eager';
  });
  listContent.replaceWith(listContainer);

  if (el.classList.contains('focus')) {
    if (el.classList.contains('no-delay')) {
      curtainCallback(el);
      return;
    }
    createIntersectionObserver({
      el,
      option: { once: true },
      callback: () => curtainCallback(el),
    });
  }
}

async function decorateForegroundText(el, container) {
  const text = container?.querySelector('h1, h2, h3, h4, h5, h6, p')?.closest('div');
  text?.classList.add('text');
  if (el.classList.contains('countdown-timer') && !el.classList.contains('pill') && !el.classList.contains('ribbon')) {
    await loadCDT(text, el.classList);
  }
  if (el.classList.contains('split')) {
    decorateSplitList(el, text?.querySelector('ul'));
    return;
  }
  const iconArea = text?.querySelector('p:has(picture)');
  iconArea?.classList.add('icon-area');
  if (iconArea?.textContent.trim()) await decorateLockup(iconArea, el);
}

function toolTipPosition(el, allViewPorts) {
  const elIndex = [...allViewPorts].indexOf(el);
  const isRtl = document.documentElement.getAttribute('dir') === 'rtl';
  const isTablet = allViewPorts.length === 3 && elIndex === 1;
  const isMobile = allViewPorts.length > 1 && elIndex === 0;
  if (isMobile) el.classList.add('notification-pill-mobile');
  if ((isRtl && isTablet) || (isMobile && !isRtl)) return 'right';

  return 'left';
}

async function addTooltip(el) {
  const allViewPorts = el.querySelectorAll('.foreground > div');
  const desktopView = [...allViewPorts].pop();
  const desktopContentText = desktopView.querySelector('.copy-wrap')?.textContent.trim();
  const toolTipIcons = [];
  allViewPorts.forEach((viewPortEl) => {
    if (viewPortEl === desktopView || !desktopContentText) return;
    const textContainer = viewPortEl.querySelector('.copy-wrap');
    const viewPortTextContent = textContainer?.textContent.trim();
    if (viewPortTextContent === desktopContentText) return;
    const appendTarget = textContainer?.lastElementChild ?? viewPortEl.firstElementChild;
    const tooltipSpan = createTag('span', { class: 'icon icon-tooltip' });
    const iconWrapper = createTag('em', {}, `${toolTipPosition(viewPortEl, allViewPorts)}|${desktopContentText}`);
    iconWrapper.appendChild(tooltipSpan);
    toolTipIcons.push(tooltipSpan);
    appendTarget?.appendChild(iconWrapper);
  });

  if (!toolTipIcons.length) return;

  const config = getConfig();
  const { default: loadIcons } = await import('../../features/icons/icons.js');
  loadStyle(`${base}/features/icons/icons.css`);
  loadIcons(toolTipIcons, config);
}

async function decorateLayout(el) {
  const [background, ...rest] = el.querySelectorAll(':scope > div');
  const foreground = rest.pop();
  if (background) decorateBlockBg(el, background);
  foreground?.classList.add('foreground', 'container');
  if (el.matches(`:is(.${pill}, .${ribbon})`)) {
    foreground.querySelectorAll(':scope > div').forEach((div) => decorateForegroundText(el, div));
  } else {
    await decorateForegroundText(el, foreground);
  }
  const fgMedia = foreground?.querySelector(':scope > div:not(.text) :is(img, video, a[href*=".mp4"])')?.closest('div');
  const bgMedia = el.querySelector(':scope > div:not(.foreground) :is(img, video, a[href*=".mp4"])')?.closest('div');
  const media = fgMedia ?? bgMedia;
  media?.classList.toggle('image', media && !media.classList.contains('text'));
  foreground?.classList.toggle('no-image', !media && !el.querySelector('.icon-area'));
  if (el.matches(`:is(.${pill}, .${ribbon}):not(.no-closure)`)) decorateClose(el);
  if (el.matches(`.${pill}.flexible`)) decorateFlexible(el);
  return foreground;
}

export default async function init(el) {
  el.classList.add('con-block');
  el.setAttribute('aria-label', 'Promo Banner');
  el.setAttribute('role', 'region');
  const { fontSizes, options } = getBlockData(el);
  const blockText = await decorateLayout(el);
  decorateBlockText(blockText, fontSizes);
  if (options.borderBottom) {
    el.append(createTag('div', { style: `background: ${options.borderBottom};`, class: 'border' }));
  }
  decorateTextOverrides(el);
  el.querySelectorAll('a:not([class])').forEach((staticLink) => staticLink.classList.add('static'));
  if (el.matches(`:is(.${ribbon}, .${pill})`)) {
    wrapCopy(blockText);
    if (el.matches(`.${pill}`)) addTooltip(el);
    decorateMultiViewport(el);
  }

  const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  el.dataset.notificationId = notificationId;
  document.body.appendChild(createTag('div', {
    class: 'notification-visibility-hidden',
    'aria-live': 'polite',
    role: 'status',
    tabindex: '-1',
    'data-notification-id': notificationId,
  }, ''));
}
