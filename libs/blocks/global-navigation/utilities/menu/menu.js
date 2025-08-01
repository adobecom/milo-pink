import { processTrackingLabels } from '../../../../martech/attributes.js';
import { getConfig, shouldBlockFreeTrialLinks } from '../../../../utils/utils.js';
import { debounce } from '../../../../utils/action.js';
import {
  fetchAndProcessPlainHtml,
  getActiveLink,
  icons,
  isDesktop,
  isDesktopForContext,
  logErrorFor,
  selectors,
  setActiveDropdown,
  toFragment,
  trigger,
  yieldToMain,
  addMepHighlightAndTargetId,
  getAsyncDropdownCount,
  setActiveLink,
  getDisableAEDState,
  hasActiveLink,
  setAriaAtributes,
} from '../utilities.js';

function getAnalyticsValue(str, index) {
  if (typeof str !== 'string' || !str.length) return str;

  let analyticsValue = processTrackingLabels(str, getConfig(), 30);
  analyticsValue = typeof index === 'number' ? `${analyticsValue}-${index}` : analyticsValue;

  return analyticsValue;
}

function decorateCta({ elem, type = 'primaryCta', index } = {}) {
  if (shouldBlockFreeTrialLinks({
    button: elem,
    localePrefix: getConfig()?.locale?.prefix,
    parent: elem.parentElement,
  })) return null;
  const modifier = type === 'secondaryCta' ? 'secondary' : 'primary';

  const clone = elem.cloneNode(true);
  clone.className = `feds-cta feds-cta--${modifier}`;
  clone.setAttribute('daa-ll', getAnalyticsValue(clone.textContent, index));

  return toFragment`
    <div class="feds-cta-wrapper">
      ${clone}
    </div>`;
}

const decorateHeadline = (elem, index, context = 'viewport') => {
  if (!(elem instanceof HTMLElement)) return null;

  const headline = toFragment`<div class="feds-menu-headline">
      ${elem.textContent.trim()}
    </div>`;

  const headlineClickHandler = (e) => {
    if (isDesktopForContext(context)) return;
    trigger({ element: headline, event: e, type: 'headline' });
    setActiveDropdown(headline);
  };

  const setHeadlineAttributes = () => {
    if (isDesktopForContext(context)) {
      headline.setAttribute('role', 'heading');
      headline.removeAttribute('tabindex');
      headline.setAttribute('aria-level', 2);
      headline.removeAttribute('aria-haspopup', true);
      headline.removeAttribute('aria-expanded', false);
      headline.removeAttribute('daa-ll');
      headline.removeEventListener('click', headlineClickHandler);
    } else {
      headline.setAttribute('role', 'button');
      headline.setAttribute('tabindex', 0);
      headline.removeAttribute('aria-level');
      headline.setAttribute('aria-haspopup', true);
      headline.setAttribute('aria-expanded', false);
      headline.setAttribute('daa-ll', getAnalyticsValue(headline.textContent, index));
      headline.addEventListener('click', headlineClickHandler);
    }
  };

  setHeadlineAttributes();
  const isContainerResponsiveFooter = document.querySelector('.global-footer')?.classList.contains('responsive-container');
  if (context === 'footer' && isContainerResponsiveFooter) {
    let previousState = isDesktopForContext(context);
    const handleResize = () => {
      const currentState = isDesktopForContext(context);
      if (currentState !== previousState) {
        setHeadlineAttributes();
        previousState = currentState;
      }
    };
    window.addEventListener('resize', debounce(handleResize, 150));
  } else {
    isDesktop.addEventListener('change', setHeadlineAttributes);
  }

  // Since heading is turned into a div, it can be safely removed
  elem.remove();

  return headline;
};

const decorateLinkGroup = (elem, index) => {
  if (!(elem instanceof HTMLElement) || !elem.querySelector('a')) return '';

  // TODO: allow links with image and no label
  const image = elem.querySelector('picture');
  const link = elem.querySelector('a');
  const description = elem.querySelector('p:nth-child(2)');
  const modifierClasses = [...elem.classList]
    .filter((className) => className !== 'link-group')
    .map((className) => `feds-navLink--${className}`);
  const imageElem = image ? toFragment`<div class="feds-navLink-image">${image}</div>` : '';
  const descriptionElem = description ? toFragment`<div class="feds-navLink-description">${description.textContent}</div>` : '';
  const contentElem = link ? toFragment`<div class="feds-navLink-content">
      <div class="feds-navLink-title">${link.textContent}</div>
      ${descriptionElem}
    </div>` : '';
  let linkGroup = toFragment`<a
    href="${link.href}"
    class="feds-navLink${modifierClasses.length ? ` ${modifierClasses.join(' ')}` : ''}"
    daa-ll="${getAnalyticsValue(link.textContent, index)}">
      ${imageElem}
      ${contentElem}
    </a>`;
  if (linkGroup.classList.contains('feds-navLink--header')) {
    linkGroup = toFragment`<div
      role="heading"
      aria-level="3"
      class="feds-navLink${modifierClasses.length ? ` ${modifierClasses.join(' ')}` : ''}"
      daa-ll="${getAnalyticsValue(link.textContent, index)}">
        ${imageElem}
        ${contentElem}
      </div>`;
  }
  if (link?.target) linkGroup.target = link.target;

  return linkGroup;
};

const decorateElements = ({ elem, className = 'feds-navLink', itemIndex = { position: 0 } } = {}) => {
  const decorateLink = (link) => {
    // Increase analytics index every time a link is decorated
    itemIndex.position += 1;

    // Decorate link group
    if (link.matches('.link-group')) {
      return decorateLinkGroup(link, itemIndex.position);
    }

    // If the link is wrapped in a 'strong' or 'em' tag, make it a CTA
    if (link.parentElement.tagName === 'STRONG' || link.parentElement.tagName === 'EM') {
      const type = link.parentElement.tagName === 'EM' ? 'secondaryCta' : 'primaryCta';
      // Remove its 'em' or 'strong' wrapper
      link.parentElement.replaceWith(link);

      return decorateCta({ elem: link, type, index: itemIndex.position });
    }

    // Simple links get analytics attributes and appropriate class name
    link.setAttribute('daa-ll', getAnalyticsValue(link.textContent, itemIndex.position));
    link.classList.add(className);

    return link;
  };

  const linkSelector = 'a, .link-group';

  // If the element is a link, decorate it and return it directly
  if (elem.matches(linkSelector)) {
    return toFragment`<li>${decorateLink(elem)}</li>`;
  }

  // Otherwise, this might be a collection of elements;
  // decorate all links in the collection and return it
  elem.querySelectorAll(linkSelector).forEach((link) => {
    link.replaceWith(decorateLink(link));
  });

  return elem;
};

const decorateGnavImage = (elem) => {
  const linkElem = elem.querySelector('a');
  const imageElem = elem.querySelector('picture');
  const promoImageElem = linkElem instanceof HTMLElement
    ? toFragment`<a class="feds-image" href="${linkElem.href}" daa-ll="gnav-image">${imageElem}</a>`
    : toFragment`<div class="feds-image">${imageElem}</div>`;

  elem.replaceChildren(promoImageElem);
  return toFragment`<div class="feds-image-wrapper">${elem}</div>`;
};

// Current limitation: we can only add one link
const decoratePromo = (elem, index) => {
  const isDarkTheme = elem.matches('.dark');
  const isImageOnly = elem.matches('.image-only');
  const promoHeader = elem.querySelector('p > strong');
  const imageElem = elem.querySelector('picture');

  if (!isImageOnly) {
    const content = [...elem.querySelectorAll(':scope > div')]
      .find((section) => !(section.querySelector('picture') instanceof HTMLElement));
    content?.classList.add('feds-promo-content');
  }

  if (promoHeader?.textContent.trim()) {
    const headingElem = toFragment`<div class="feds-promo-header" role="heading" aria-level="2">
        ${promoHeader.textContent.trim()}
      </div>`;
    promoHeader.parentElement.replaceWith(headingElem);
  }

  decorateElements({ elem, className: 'feds-promo-link', index });

  const decorateImage = () => {
    const linkElem = elem.querySelector('a');
    const imageWrapper = imageElem.closest(`${selectors.gnavPromo} > div`);
    let promoImageElem;

    if (linkElem instanceof HTMLElement) {
      promoImageElem = toFragment`<a class="feds-promo-image" href="${linkElem.href}" daa-ll="promo-image">
          ${imageElem}
        </a>`;
    } else {
      // TODO: is there really any use-case where a promo doesn't have a link?
      promoImageElem = toFragment`<div class="feds-promo-image">
          ${imageElem}
        </div>`;
    }

    // If the promo is set to 'image-only',
    // replace the whole promo content with the decorated image
    if (isImageOnly) {
      elem.replaceChildren(promoImageElem);
    } else {
    // Otherwise, just replace the image container with the decorated image
      imageWrapper?.replaceWith(promoImageElem);
    }
  };

  // Wrap the image in an anchor tag
  if (imageElem instanceof HTMLElement) {
    decorateImage();
  }

  elem.classList = 'feds-promo';

  if (isDarkTheme) {
    elem.classList.add('feds-promo--dark');
  }

  return toFragment`<div class="feds-promo-wrapper" daa-lh="promo-card">
      ${elem}
    </div>`;
};

const decorateColumns = async ({ content, separatorTagName = 'H5', context } = {}) => {
  const hasMultipleColumns = content.children.length > 1;
  // Headline index is defined in the context of a whole menu
  let headlineIndex = 0;

  // The resulting template structure should follow these rules:
  // * a menu can have multiple columns;
  // * a column can have multiple sections;
  // * a section can have a headline and a collection of item(s)
  for await (const column of [...content.children]) {
    await yieldToMain();
    const wrapperClass = hasMultipleColumns ? 'feds-menu-column' : 'feds-menu-content';
    const itemDestinationClass = hasMultipleColumns ? 'feds-menu-section' : 'feds-menu-column';
    const wrapper = toFragment`<div class="${wrapperClass}"></div>`;
    let itemDestination = toFragment`<div class="${itemDestinationClass}"></div>`;
    let menuItems;
    // Item index is defined in the context of a particular column
    const itemIndex = { position: 0 };

    const resetDestination = () => {
      // First, if the previous destination has children,
      // append it to the wrapper
      if (itemDestination.childElementCount) {
        wrapper.append(itemDestination);
      }

      // Create a new destination
      itemDestination = toFragment`<div class="${itemDestinationClass}"></div>`;
    };

    while (column.children.length) {
      await yieldToMain();
      const columnElem = column.firstElementChild;

      if (columnElem.matches(selectors.columnBreak)) {
        resetDestination();
        columnElem.remove();
      } else if (columnElem.tagName === separatorTagName) {
        headlineIndex += 1;
        // When encountering a separator (h5 for header, h2 for footer),
        // add the previous section to the column
        resetDestination();
        // If the separator splits content into columns, reset the analytics index
        if (!hasMultipleColumns) itemIndex.position = 0;

        // Analysts requested no headings in the dropdowns,
        // turning it into a simple div
        const sectionHeadline = decorateHeadline(columnElem, headlineIndex, context);
        menuItems = toFragment`<div class="feds-menu-items" daa-lh="${getAnalyticsValue(sectionHeadline.textContent.trim())}"></div>`;

        itemDestination.append(sectionHeadline, menuItems);

        if (column.querySelector(selectors.columnBreak)) {
          wrapper.classList.add(`${wrapperClass}--group`);
          if (column.querySelectorAll(selectors.columnBreak).length > 1) wrapper.classList.add(`${wrapperClass}--wide`);

          const wideColumn = document.createElement('div');
          wideColumn.append(...column.childNodes);
          menuItems.append(wideColumn);
          await decorateColumns({ content: menuItems, context });
        }
      } else if (columnElem.matches(selectors.gnavPromo)) {
        // When encountering a promo, add the previous section to the column
        resetDestination();
        // Since the promo is alone on a column, reset the analytics index
        itemIndex.position = 0;

        const promoElem = decoratePromo(columnElem, itemIndex);

        itemDestination.append(promoElem);
      } else if (columnElem.matches('.gnav-image')) {
        resetDestination();
        itemIndex.position = 0;
        const imageElem = decorateGnavImage(columnElem, itemIndex);

        itemDestination.append(imageElem);
      } else {
        let decoratedElem = decorateElements({ elem: columnElem, itemIndex });
        columnElem.remove();

        // If an items template has been previously created,
        // add the current element to it;
        // otherwise append the element to the section
        const elemDestination = menuItems || itemDestination;
        let menuList = null;
        if (decoratedElem.tagName === 'P') {
          decoratedElem = toFragment`<li>${decoratedElem.innerHTML}</li>`;
        }
        if (decoratedElem.tagName === 'LI') {
          let ul = elemDestination.querySelector('ul');
          if (!ul) {
            ul = toFragment`<ul></ul>`;
            elemDestination.append(ul);
          }
          menuList = ul;
        } else {
          menuList = elemDestination;
        }
        menuList.append(decoratedElem);
      }
    }

    // Append the last column section to the column
    wrapper.append(itemDestination);
    // Replace column with parsed template
    column.replaceWith(wrapper);
  }
};

const decorateCrossCloudMenu = (content) => {
  const crossCloudMenuEl = content.querySelector('.cross-cloud-menu');
  if (!crossCloudMenuEl) return;

  decorateElements({ elem: crossCloudMenuEl });
  crossCloudMenuEl.className = 'feds-crossCloudMenu-wrapper';
  crossCloudMenuEl.querySelector('div').className = 'feds-crossCloudMenu';
  crossCloudMenuEl.querySelectorAll('ul li').forEach((el, index) => {
    if (index === 0) el.querySelector('a')?.prepend(toFragment`${icons.home}`);
    el.className = 'feds-crossCloudMenu-item';
  });

  content.append(crossCloudMenuEl);
};

// Current limitation: after an h5 (or h2 in the case of the footer)
// is found in a menu column, no new sections can be created without a heading
let asyncDropDownCount = 0;
const decorateMenu = (config) => logErrorFor(async () => {
  let menuTemplate;
  if (config.type === 'syncDropdownTrigger') {
    const itemTopParent = config.item.closest('div');
    // The initial heading is already part of the item template,
    // it can be safely removed
    const initialHeadingElem = itemTopParent.querySelector('h2');
    itemTopParent.removeChild(initialHeadingElem);

    menuTemplate = toFragment`<div class="feds-popup">
        ${itemTopParent}
      </div>`;

    await decorateColumns({ content: menuTemplate });
  }

  if (config.type === 'asyncDropdownTrigger') {
    performance.mark(`DecorateMenu-${asyncDropDownCount}-Start`);
    const pathElement = config.item.querySelector('a');
    if (!(pathElement instanceof HTMLElement)) return;

    const content = await fetchAndProcessPlainHtml({ url: pathElement.href });

    if (!content) return;
    const menuContent = toFragment`<div class="feds-menu-content">${content.innerHTML}</div>`;
    menuTemplate = toFragment`<div class="feds-popup">
        <div class="feds-menu-container">
          ${menuContent}
        </div>
      </div>`;
    addMepHighlightAndTargetId(menuTemplate, content);

    decorateCrossCloudMenu(menuTemplate);

    await decorateColumns({ content: menuContent });

    if (getActiveLink(menuTemplate) instanceof HTMLElement) {
      // Special handling on desktop, as content is loaded async;
      // bolding the item text would normally push the content
      // to the right, potentially causing CLS
      const resetActiveState = () => {
        config.template.style.width = '';
        config.template.classList.remove(selectors.deferredActiveNavItem.slice(1));
      };

      config.template.classList.add(selectors.activeNavItem.slice(1));
      if (isDesktop.matches) {
        config.template.style.width = `${config.template.offsetWidth}px`;
        config.template.classList.add(selectors.deferredActiveNavItem.slice(1));
        isDesktop.addEventListener('change', resetActiveState, { once: true });
        window.addEventListener('feds:navOverflow', resetActiveState, { once: true });
      }
    }

    asyncDropDownCount += 1;
    menuTemplate.setAttribute('id', `feds-popup-${asyncDropDownCount}`);
    config.template.classList.add('feds-navItem--megaMenu');
    if (getAsyncDropdownCount() === asyncDropDownCount) {
      if (!hasActiveLink()) {
        const sections = document.querySelectorAll('.feds-nav .feds-navItem--megaMenu');
        const disableAED = getDisableAEDState();
        if (!disableAED && sections.length === 1) {
          sections[0].classList.add(selectors.activeNavItem.slice(1));
          setActiveLink(true);
        }
      }
    }
  }

  if (config.type === 'footerMenu') {
    await decorateColumns({ content: config.item, separatorTagName: 'H2', context: 'footer' });
  }

  // Remove the loading state created in delayDropdownDecoration
  config.template?.querySelector('.feds-popup.loading')?.remove();
  config.template?.append(menuTemplate);
  if (config.type === 'asyncDropdownTrigger') {
    setAriaAtributes(menuTemplate.previousElementSibling);
    performance.mark(`DecorateMenu-${asyncDropDownCount}-End`);
  }
}, 'Decorate menu failed', 'gnav-menu', 'i');

export default { decorateMenu, decorateLinkGroup, decorateHeadline };
