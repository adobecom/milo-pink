import { createTag, getConfig } from '../../utils/utils.js';
import { initService, getOptions, MEP_SELECTOR, overrideOptions } from '../merch/merch.js';
import { postProcessAutoblock } from '../merch/autoblock.js';
import '../../deps/mas/merch-card.js';
import '../../deps/mas/merch-quantity-select.js';

const COLLECTION_AUTOBLOCK_TIMEOUT = 5000;
const DEFAULT_OPTIONS = { sidenav: true };
let log;

function getTimeoutPromise() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(false), COLLECTION_AUTOBLOCK_TIMEOUT);
  });
}

async function loadDependencies(options) {
  /** Load service first */
  const servicePromise = initService();
  const success = await Promise.race([servicePromise, getTimeoutPromise()]);
  if (!success) {
    throw new Error('Failed to initialize mas commerce service');
  }
  const service = await servicePromise;
  log = service.Log.module('merch');

  const { base } = getConfig();
  const dependencyPromises = [
    import('../../deps/mas/merch-card-collection.js'),
    import(`${base}/features/spectrum-web-components/dist/theme.js`),
    import(`${base}/features/spectrum-web-components/dist/button.js`),
    import(`${base}/features/spectrum-web-components/dist/action-button.js`),
    import(`${base}/features/spectrum-web-components/dist/action-menu.js`),
    import(`${base}/features/spectrum-web-components/dist/search.js`),
    import(`${base}/features/spectrum-web-components/dist/menu.js`),
    import(`${base}/features/spectrum-web-components/dist/overlay.js`),
    import(`${base}/features/spectrum-web-components/dist/tray.js`),
  ];
  if (options.sidenav) {
    dependencyPromises.push(...[
      import('../../deps/mas/merch-sidenav.js'),
      import(`${base}/features/spectrum-web-components/dist/base.js`),
      import(`${base}/features/spectrum-web-components/dist/shared.js`),
      import(`${base}/features/spectrum-web-components/dist/sidenav.js`),
      import(`${base}/features/spectrum-web-components/dist/checkbox.js`),
      import(`${base}/features/spectrum-web-components/dist/dialog.js`),
      import(`${base}/features/spectrum-web-components/dist/link.js`),
    ]);
  }
  await Promise.all(dependencyPromises);
}

function getSidenav(collection) {
  if (!collection.data) return null;
  const { hierarchy, placeholders } = collection.data;
  if (!hierarchy?.length) return null;

  const titleKey = `${collection.variant}SidenavTitle`;
  const sidenav = createTag('merch-sidenav', { sidenavTitle: placeholders?.[titleKey] || '' });

  /* Search */
  const searchText = placeholders?.searchText;
  if (searchText) {
    const spectrumSearch = createTag('sp-search', { placeholder: searchText });
    const search = createTag('merch-search', { deeplink: 'search' });
    search.append(spectrumSearch);
    sidenav.append(search);
  }

  /* Filters */
  const spSidenav = createTag('sp-sidenav', { manageTabIndex: true });
  spSidenav.setAttribute('manageTabIndex', true);
  const sidenavList = createTag('merch-sidenav-list', { deeplink: 'filter' }, spSidenav);

  let multilevel = false;
  function generateLevelItems(level, parent) {
    for (const node of level) {
      const value = node.label.toLowerCase();
      const item = createTag('sp-sidenav-item', { label: node.label, value });
      if (node.icon) {
        createTag('img', { src: node.icon, slot: 'icon', style: 'height: fit-content;' }, null, { parent: item });
      }
      if (node.iconLight || node.navigationLabel) {
        const attributes = { class: 'selection' };
        if (node.navigationLabel) attributes['data-selected-text'] = node.navigationLabel;
        if (node.iconLight) {
          attributes['data-light'] = node.iconLight;
          attributes['data-dark'] = node.icon;
        }
        createTag('var', attributes, null, { parent: item });
      }
      parent.append(item);
      if (node.collections) {
        multilevel = true;
        generateLevelItems(node.collections, item);
      }
    }
  }

  generateLevelItems(hierarchy, spSidenav);
  if (multilevel) spSidenav.setAttribute('variant', 'multilevel');

  sidenav.append(sidenavList);

  return sidenav;
}

export async function checkReady(masElement) {
  const readyPromise = masElement.checkReady();
  const success = await Promise.race([readyPromise, getTimeoutPromise()]);

  if (!success) {
    log.error(`${masElement.tagName} did not initialize withing give timeout`);
  }
}

export async function createCollection(el, options) {
  const aemFragment = createTag('aem-fragment', { fragment: options.fragment });
  // Get MEP overrides if available
  const { mep } = getConfig();
  const mepFragments = mep?.inBlock?.[MEP_SELECTOR]?.fragments || {};
  // Create attributes object only if we have fragments
  let attributes;
  if (Object.keys(mepFragments).length > 0) {
    const overrides = Object.entries(mepFragments)
      .map(([fragment, data]) => `${fragment}:${data.content}`)
      .join(',');
    attributes = { overrides };
  }
  const collection = createTag('merch-card-collection', attributes, aemFragment);
  let container = collection;
  if (options.sidenav) {
    container = createTag('div', null, collection);
  }
  el.replaceWith(container);
  await checkReady(collection);

  container.classList.add(`${collection.variant}-container`);

  /* Placeholders */
  const placeholders = collection.data?.placeholders || {};
  for (const key of Object.keys(placeholders)) {
    const value = placeholders[key];
    const tag = value.includes('<p>') ? 'div' : 'p';
    const placeholder = createTag(tag, { slot: key }, value);
    collection.append(placeholder);
  }

  /* Sidenav */
  if (options.sidenav) {
    const sidenav = getSidenav(collection);
    if (sidenav) {
      container.insertBefore(sidenav, collection);
      collection.sidenav = sidenav;
    }
  }

  postProcessAutoblock(collection);
  collection.requestUpdate();
}

export default async function init(el) {
  let options = { ...DEFAULT_OPTIONS, ...getOptions(el) };
  if (!options.fragment) return;
  options = overrideOptions(options.fragment, options);
  await loadDependencies(options);
  await createCollection(el, options);
}
