/* eslint import/no-relative-packages: 0 */
/* eslint-disable no-async-promise-executor */
import {
  getConfig,
  getMetadata,
  loadIms,
  loadStyle,
  loadLana,
  decorateLinks,
  loadScript,
  getGnavSource,
  getFederatedUrl,
  getFedsPlaceholderConfig,
  shouldBlockFreeTrialLinks,
} from '../../utils/utils.js';

(async () => {
  const { miloLibs, codeRoot, theme } = getConfig();
  const url = `${miloLibs || codeRoot}/blocks/global-navigation/`;
  const loadStylePromise = (u) => new Promise((resolve, reject) => {
    loadStyle(u, (e) => {
      if (e === 'error') return reject(u);
      return resolve();
    });
  });
  try {
    await loadStylePromise(`${url}base.css`);
    if (theme === 'dark') await loadStylePromise(`${url}dark-nav.css`);
  } catch (e) {
    const gnavSource = getMetadata('gnav-source');
    if (!window.lana?.log) loadLana();
    window.lana.log(`GNAV: Error in loadStyles | gnav-source: ${gnavSource} | href: ${window.location.href} | error loading style: ${e}`, {
      clientId: 'feds-milo',
      sampleRate: 1,
      tags: 'utilities',
      errorType: 'info',
    });
  }
})();

const plainHTMLPromise = (async () => {
  const source = await getGnavSource();
  const [url] = source.split('#');
  let federatedURL = getFederatedUrl(url);
  const mepGnav = getConfig()?.mep?.inBlock?.['global-navigation'];
  const mepFragment = mepGnav?.fragments?.[federatedURL];
  if (mepFragment?.action === 'replace') {
    federatedURL = mepFragment.content;
  }
  const res = await fetch(federatedURL.replace(/(\.html$|$)/, '.plain.html'));
  return res;
})();

const asideJsPromise = getMetadata('gnav-promo-source') ? import('./features/aside/aside.js') : null;

const breadCrumbsJsPromise = document.querySelector('header')?.classList.contains('has-breadcrumbs') ? import('./features/breadcrumbs/breadcrumbs.js') : null;

const [utilities, placeholders, merch, { processTrackingLabels }] = await Promise.all([
  import('./utilities/utilities.js'),
  import('../../features/placeholders.js'),
  import('../merch/merch.js'),
  import('../../martech/attributes.js'),
]);

const { replaceKey, replaceKeyArray } = placeholders;

const { getMiloLocaleSettings } = merch;

const {
  closeAllDropdowns,
  fetchAndProcessPlainHtml,
  getActiveLink,
  getExperienceName,
  isActiveLink,
  icons,
  isDesktop,
  isTangentToViewport,
  lanaLog,
  loadDecorateMenu,
  rootPath,
  loadStyles,
  logErrorFor,
  selectors,
  setActiveDropdown,
  setCurtainState,
  setUserProfile,
  toFragment,
  trigger,
  yieldToMain,
  addMepHighlightAndTargetId,
  isDarkMode,
  darkIcons,
  setDisableAEDState,
  animateInSequence,
  transformTemplateToMobile,
  closeAllTabs,
  disableMobileScroll,
  enableMobileScroll,
  setAsyncDropdownCount,
  branchBannerLoadCheck,
  getBranchBannerInfo,
  loaderMegaMenu,
  logPerformance,
  setAriaAtributes,
  addA11YMobileDropdowns,
  removeA11YMobileDropdowns,
  getUnavWidthCSS,
} = utilities;

const SIGNIN_CONTEXT = getConfig()?.signInContext;

function getHelpChildren() {
  const { unav } = getConfig();
  return unav?.unavHelpChildren || [
    { type: 'Support' },
    { type: 'Community' },
  ];
}

export function getAnalyticsValue(str, index) {
  if (typeof str !== 'string' || !str.length) return str;

  let analyticsValue = processTrackingLabels(str, getConfig(), 30);
  analyticsValue = typeof index === 'number' ? `${analyticsValue}-${index}` : analyticsValue;

  return analyticsValue;
}

export function decorateCta({ elem, type = 'primaryCta', index } = {}) {
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

const getMessageEventListener = () => {
  const configListener = getConfig().unav?.profile?.messageEventListener;
  if (configListener) return configListener;

  return (event) => {
    const { name, payload, executeDefaultAction } = event.detail;
    if (!name || name !== 'System' || !payload || typeof executeDefaultAction !== 'function') return;
    switch (payload.subType) {
      case 'AppInitiated':
        window.adobeProfile?.getUserProfile()
          .then((data) => { setUserProfile(data); })
          .catch(() => { setUserProfile({}); });
        break;
      case 'SignOut':
        executeDefaultAction();
        break;
      case 'ProfileSwitch':
        Promise.resolve(executeDefaultAction()).then((profile) => {
          if (profile) window.location.reload();
        });
        break;
      default:
        break;
    }
  };
};

export const CONFIG = {
  icons: isDarkMode() ? darkIcons : icons,
  delays: {
    mainNavDropdowns: 800,
    loadDelayed: 3000,
    keyboardNav: 8000,
  },
  features: [
    'gnav-brand',
    'gnav-promo',
    'search',
    'profile',
    'app-launcher',
    'adobe-logo',
  ],
  universalNav: {
    components: {
      profile: {
        name: 'profile',
        attributes: {
          isSignUpRequired: false,
          messageEventListener: getMessageEventListener(),
          componentLoaderConfig: {
            config: {
              enableLocalSection: true,
              enableProfileSwitcher: true,
              miniAppContext: {
                logger: {
                  trace: () => {},
                  debug: () => {},
                  info: () => {},
                  warn: (e) => lanaLog({ message: 'Profile Menu warning', e, tags: 'universalnav,warn' }),
                  error: (e) => lanaLog({ message: 'Profile Menu error', e, tags: 'universalnav', errorType: 'e' }),
                },
              },
              ...getConfig().unav?.profile?.config,
            },
          },
          complexConfig: getConfig().unav?.profile?.complexConfig || null,
          callbacks: {
            onSignIn: () => { window.adobeIMS?.signIn(SIGNIN_CONTEXT); },
            onSignUp: () => { window.adobeIMS?.signIn(SIGNIN_CONTEXT); },
          },
        },
      },
      appswitcher: { name: 'app-switcher' },
      notifications: {
        name: 'notifications',
        attributes: {
          notificationsConfig: {
            applicationContext: {
              appID: getConfig().unav?.uncAppId || 'adobecom',
              ...getConfig().unav?.uncConfig,
            },
          },
        },
      },
      help: {
        name: 'help',
        attributes: { children: getHelpChildren() },
      },
      jarvis: {
        name: 'jarvis',
        attributes: {
          appid: getConfig().jarvis?.id,
          callbacks: getConfig().jarvis?.callbacks,
        },
      },
      cart: { name: 'cart' },
    },
  },
};

export const osMap = {
  Mac: 'macOS',
  Win: 'windows',
  Linux: 'linux',
  CrOS: 'chromeOS',
  Android: 'android',
  iPad: 'iPadOS',
  iPhone: 'iOS',
};

export const LANGMAP = {
  cs: ['cz'],
  da: ['dk'],
  de: ['at'],
  en: ['africa', 'au', 'ca', 'ie', 'in', 'mt', 'ng', 'nz', 'sg', 'za'],
  es: ['ar', 'cl', 'co', 'cr', 'ec', 'gt', 'la', 'mx', 'pe', 'pr'],
  et: ['ee'],
  ja: ['jp'],
  ko: ['kr'],
  nb: ['no'],
  pt: ['br'],
  sl: ['si'],
  sv: ['se'],
  uk: ['ua'],
  zh: ['cn', 'tw'],
};

// signIn, decorateSignIn and decorateProfileTrigger can be removed if IMS takes over the profile
const signIn = (options = {}) => {
  if (typeof window.adobeIMS?.signIn !== 'function') {
    lanaLog({ message: 'IMS signIn method not available', tags: 'gnav,warn' });
    return;
  }
  window.adobeIMS.signIn(options);
};

const decorateSignIn = async ({ rawElem, decoratedElem }) => {
  const dropdownElem = rawElem.querySelector(':scope > div:nth-child(2)');
  const signInLabel = await replaceKey('sign-in', getFedsPlaceholderConfig());
  let signInElem;

  if (!dropdownElem) {
    signInElem = toFragment`<button daa-ll="${signInLabel}" class="feds-signIn">${signInLabel}</button>`;

    signInElem.addEventListener('click', (e) => {
      e.preventDefault();
      signIn(SIGNIN_CONTEXT);
    });
  } else {
    signInElem = toFragment`<button daa-ll="${signInLabel}" class="feds-signIn" aria-expanded="false" aria-haspopup="true">${signInLabel}</button>`;

    signInElem.addEventListener('click', (e) => trigger({ element: signInElem, event: e }));
    signInElem.addEventListener('keydown', (e) => e.code === 'Escape' && closeAllDropdowns());
    dropdownElem.addEventListener('keydown', (e) => e.code === 'Escape' && closeAllDropdowns());

    dropdownElem.classList.add('feds-signIn-dropdown');

    const dropdownSignInAnchor = dropdownElem.querySelector('[href$="?sign-in=true"]');
    if (dropdownSignInAnchor) {
      const dropdownSignInButton = toFragment`<button class="feds-signIn">${dropdownSignInAnchor.textContent}</button>`;
      dropdownSignInAnchor.replaceWith(dropdownSignInButton);
      dropdownSignInButton.addEventListener('click', (e) => {
        e.preventDefault();
        signIn(SIGNIN_CONTEXT);
      });
    } else {
      lanaLog({ message: 'Sign in link not found in dropdown.', tags: 'gnav,warn' });
    }

    decoratedElem.append(dropdownElem);
  }

  decoratedElem.prepend(signInElem);
};

const decorateProfileTrigger = async ({ avatar }) => {
  const [label, profileAvatar] = await replaceKeyArray(
    ['profile-button', 'profile-avatar'],
    getFedsPlaceholderConfig(),
  );

  const buttonElem = toFragment`
    <button
      data-cs-mask
      class="feds-profile-button"
      aria-expanded="false"
      aria-controls="feds-profile-menu"
      aria-label="${label}"
      daa-ll="Account"
      aria-haspopup="true"
    >
      <img data-cs-mask class="feds-profile-img" src="${avatar}" alt="${profileAvatar}"></img>
    </button>
  `;

  return buttonElem;
};

let keyboardNav;
const setupKeyboardNav = async (newMobileWithLnav) => {
  keyboardNav = keyboardNav || new Promise(async (resolve) => {
    const { default: KeyboardNavigation } = await import('./utilities/keyboard/index.js');
    const instance = new KeyboardNavigation(newMobileWithLnav);
    resolve(instance);
  });
};

const getBrandImage = (image, brandImageOnly) => {
  // Return the default Adobe logo if an image is not available
  if (!image) return brandImageOnly ? CONFIG.icons.brand : CONFIG.icons.company;

  // Try to decorate image as PNG, JPG or JPEG
  const imgText = image?.textContent || '';
  const [source, alt] = imgText.split('|');
  if (source.trim().length) {
    const img = toFragment`<img src="${source.trim()}" />`;
    if (alt) img.alt = alt.trim();
    return img;
  }

  // Return the default Adobe logo if the image could not be decorated
  return brandImageOnly ? CONFIG.icons.brand : CONFIG.icons.company;
};

const closeOnClickOutside = (e, isLocalNav, navWrapper) => {
  if (isLocalNav && navWrapper.classList.contains('feds-nav-wrapper--expanded')) return;
  const newMobileNav = getMetadata('mobile-gnav-v2') !== 'off';
  if (!isDesktop.matches && !newMobileNav) return;

  const openElemSelector = `${selectors.globalNav} [aria-expanded = "true"]:not(.universal-nav-container *), ${selectors.localNav} [aria-expanded = "true"]`;
  const isClickedElemOpen = [...document.querySelectorAll(openElemSelector)]
    .find((openItem) => openItem.parentElement.contains(e.target));

  if (!isClickedElemOpen) {
    const animatedElement = isLocalNav ? document.querySelector('header.new-nav + .feds-localnav .feds-localnav-items') : undefined;
    const animationType = isLocalNav ? 'transition' : undefined;
    closeAllDropdowns({ animatedElement, animationType });
  }
};

export const getUniversalNavLocale = (locale) => {
  if (!locale.prefix || locale.prefix === '/') return 'en_US';
  const prefix = locale.prefix.replace('/', '');
  if (prefix.includes('_')) {
    const [lang, country] = prefix.split('_').reverse();
    return `${lang.toLowerCase()}_${country.toUpperCase()}`;
  }

  if (prefix === 'uk') return 'en_GB';
  const customLang = Object.keys(LANGMAP).find((key) => LANGMAP[key].includes(prefix));
  if (customLang) return `${customLang.toLowerCase()}_${prefix.toUpperCase()}`;

  return `${prefix.toLowerCase()}_${prefix.toUpperCase()}`;
};

const [disableAriaHidden, enableAriaHidden] = (() => {
  const targets = ['#branch-banner-iframe', '.feds-promo-aside-wrapper', '.feds-localnav', 'main', 'footer'];
  return [
    () => {
      targets.forEach((ele) => document.querySelector(ele)?.removeAttribute('aria-hidden'));
    },
    (isExpanded) => {
      targets.forEach((ele) => document.querySelector(ele)?.setAttribute('aria-hidden', !isExpanded));
    }];
})();

const setMenuState = () => {
  const toggle = document.querySelector('.feds-toggle');
  const navWrapper = document.querySelector('.feds-nav-wrapper');
  const isExpanded = toggle?.getAttribute('aria-expanded') === 'true';
  enableAriaHidden(isExpanded);
  toggle?.setAttribute('aria-expanded', !isExpanded);
  document.body.classList.toggle('disable-scroll', !isExpanded);
  navWrapper?.classList?.toggle('feds-nav-wrapper--expanded', !isExpanded);
  closeAllDropdowns();
  setCurtainState(!isExpanded);
  toggle?.setAttribute('daa-ll', `hamburgermenu|${isExpanded ? 'open' : 'close'}`);
};

export const closeGnavOptions = () => {
  let isExpanded = document.querySelector('.feds-toggle')?.getAttribute('aria-expanded') === 'true';
  if (isDesktop.matches) {
    isExpanded = !!document.querySelector('.feds-dropdown--active');
  }
  if (!isExpanded) return;
  enableMobileScroll();
  setMenuState();
};

const convertToPascalCase = (str) => str
  ?.split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join(' ');
class Gnav {
  constructor({ content, block, newMobileNav } = {}) {
    this.content = content;
    this.block = block;
    this.customLinks = getConfig()?.customLinks?.split(',') || [];

    this.blocks = {
      profile: {
        rawElem: this.content.querySelector('.profile'),
        decoratedElem: toFragment`<div data-cs-mask class="feds-profile"></div>`,
      },
      search: { config: { icon: CONFIG.icons.search } },
      breadcrumbs: { wrapper: '' },
    };

    this.setupUniversalNav();
    this.elements = {};
    this.newMobileNav = newMobileNav;
  }

  // eslint-disable-next-line no-return-assign
  getOriginalTitle = (firstElem) => this.originalTitle ||= firstElem.textContent?.split('::');

  setupUniversalNav = () => {
    const meta = getMetadata('universal-nav')?.toLowerCase();
    this.universalNavComponents = meta?.split(',').map((option) => option.trim())
      .filter((component) => Object.keys(CONFIG.universalNav.components).includes(component) || component === 'signup');
    this.useUniversalNav = meta === 'on' || !!this.universalNavComponents?.length;
    if (this.useUniversalNav) {
      delete this.blocks.profile;
      this.blocks.universalNav = toFragment`<div class="feds-utilities"></div>`;
      this.blocks.universalNav.style.setProperty('min-width', getUnavWidthCSS(this.universalNavComponents));
      this.blocks.universalNav.addEventListener('click', () => {
        if (this.isToggleExpanded()) this.toggleMenuMobile();
      }, true);
    }
  };

  init = () => logErrorFor(async () => {
    branchBannerLoadCheck(this.updatePopupPosition);
    this.elements.curtain = toFragment`<div class="feds-curtain"></div>`;

    // Order is important, decorateTopnavWrapper will render the nav
    // Ensure any critical task is executed before it
    const tasks = [
      // decorateAside is the only async function that fires prior to rendering
      // (at time of writing). If there is no aside it returns sync -- no problem.
      // But if there is, we need those functions (import + decorate) to enter the event loop
      // before the delayed decorateDropdown function does.
      // the rest is taken care of by the 'await' semantics
      // We needn't worry about delays now since decorateAside
      // needed to run anyway prior to decorateTopNavWrapper
      this.decorateAside,
      this.decorateMainNav,
      this.decorateTopNav,
      this.decorateTopnavWrapper,
      this.revealGnav,
      this.ims,
      this.addChangeEventListeners,
    ];
    const fetchKeyboardNav = () => {
      setupKeyboardNav(this.isLocalNav());
    };
    this.block.addEventListener('click', this.loadDelayed);
    this.block.addEventListener('keydown', fetchKeyboardNav);
    setTimeout(this.loadDelayed, CONFIG.delays.loadDelayed);
    setTimeout(fetchKeyboardNav, CONFIG.delays.keyboardNav);
    for (const task of tasks) {
      await yieldToMain();
      await task();
    }

    document.addEventListener('click', (e) => closeOnClickOutside(e, this.isLocalNav(), this.elements.navWrapper));
    isDesktop.addEventListener('change', closeAllDropdowns);
  }, 'Error in global navigation init', 'gnav', 'e');

  revealGnav = () => {
    this.block.classList.remove('gnav-hide');
    this.block.classList.add('ready');
    performance.mark('Gnav-Visible');
    logPerformance('Gnav-Time-To-Visible', 'Gnav-Start', 'Gnav-Visible');
  };

  ims = async () => (window.adobeIMS?.initialized ? this.imsReady() : loadIms()
    .then(() => this.imsReady())
    .catch((e) => {
      if (e?.message === 'IMS timeout') {
        window.addEventListener('onImsLibInstance', () => this.imsReady());
        return;
      }
      lanaLog({ message: 'GNAV: Error with IMS', e, tags: 'gnav', errorType: 'i' });
    }));

  decorateProductEntryCTA = () => {
    const button = this.content.querySelector('.product-entry-cta a');
    if (!button) return null;
    const cta = decorateCta({ elem: button, type: this.getMainNavItemType(button) });
    cta.closest('.feds-cta-wrapper').classList.add('feds-product-entry-cta');
    return cta;
  };

  decorateTopNav = () => {
    const { searchEnabled, selfIntegrateUnav, desktopAppsCta = false } = getConfig();
    const isMiniGnav = this.isMiniGnav();
    this.elements.mobileToggle = this.decorateToggle();
    this.elements.topnav = toFragment`
      <nav class="feds-topnav" aria-label="Main">
        <div class="feds-brand-container">
          ${this.elements.mobileToggle}
          ${this.decorateBrand()}
        </div>
        ${searchEnabled === 'on' && isMiniGnav ? toFragment`<div class="feds-client-search"></div>` : ''}
        ${this.elements.navWrapper}
        ${getMetadata('product-entry-cta')?.toLowerCase() === 'on' ? this.decorateProductEntryCTA() : ''}
        ${searchEnabled === 'on' && !isMiniGnav ? toFragment`<div class="feds-client-search"></div>` : ''}
        ${isMiniGnav && desktopAppsCta ? toFragment`<div class="feds-client-desktop-apps"></div>` : ''}
        ${this.useUniversalNav ? this.blocks.universalNav : ''}
        ${selfIntegrateUnav ? toFragment`<div class="feds-client-unav"></div>` : ''}
        ${(!this.useUniversalNav && this.blocks.profile.rawElem) ? this.blocks.profile.decoratedElem : ''}
        ${this.decorateLogo()}
      </nav>
    `;
  };

  decorateLocalNav = async () => {
    if (!this.isLocalNav()) {
      const localNavWrapper = document.querySelector('.feds-localnav');
      if (localNavWrapper) {
        lanaLog({ message: 'Gnav Localnav was removed, potential CLS', tags: 'gnav-localnav,warn' });
        localNavWrapper.remove();
      }
      return;
    }
    const localNavItems = this.elements.navWrapper.querySelector('.feds-nav').querySelectorAll('.feds-navItem:not(.feds-navItem--section, .feds-navItem--mobile-only)');
    const firstElem = localNavItems?.[0]?.querySelector('a, button') || localNavItems?.[0];
    if (!firstElem) {
      lanaLog({ message: 'GNAV: Incorrect authoring of localnav found.', tags: 'gnav', errorType: 'i' });
      return;
    }
    const [title, navTitle = ''] = this.getOriginalTitle(firstElem);
    let localNav = document.querySelector('.feds-localnav');
    if (!localNav) {
      lanaLog({
        message: 'GNAV: Localnav does not include \'localnav\' in its name.',
        tags: 'gnav',
        errorType: 'i',
      });
      localNav = toFragment`<div class="feds-localnav"/>`;
      this.block.after(localNav);
    }
    localNav.setAttribute('daa-lh', `${title}_localNav`);
    if (document.querySelector('.feds-promo-aside-wrapper')) {
      this.updateGnavTop();
    }
    const localNavBtn = toFragment`<button class="feds-navLink--hoverCaret feds-localnav-title" aria-haspopup="true" aria-expanded="false" daa-ll="${title}_localNav|open"></button>`;
    const localNavCurtain = toFragment` <div class="feds-localnav-curtain"></div>`;
    // Skip keyboard navigation on localnav items if it is closed
    localNav.append(localNavBtn, localNavCurtain, toFragment` <div class="feds-localnav-items" role="list"></div>`, toFragment`<a href="#" class="feds-sr-only feds-localnav-exit">.</a>`);

    const itemWrapper = localNav.querySelector('.feds-localnav-items');
    const localNavTitle = document.querySelector('.feds-localnav-title');
    // Skip keyboard navigation on localnav items if it is closed
    const observer = new MutationObserver(() => {
      const isExpanded = localNavTitle.getAttribute('aria-expanded') === 'true';
      itemWrapper.toggleAttribute('aria-hidden', !isExpanded);
      [...itemWrapper.childNodes].forEach((node) => {
        node.querySelector('a, button')?.toggleAttribute('aria-hidden', !isExpanded);
        node.querySelector('a, button')?.setAttribute('tabindex', isExpanded ? '0' : '-1');
      });
    });
    observer.observe(localNavTitle, { attributes: true, attributeFilter: ['aria-expanded'] });

    const titleLabel = await replaceKey('overview', getFedsPlaceholderConfig());
    localNavItems.forEach((elem, idx) => {
      const clonedItem = elem.cloneNode(true);
      const link = clonedItem.querySelector('a, button') || clonedItem;

      if (link) {
        link.dataset.title = link.textContent;
      }

      if (idx === 0) {
        localNav.querySelector('.feds-localnav-title').innerText = title.trim();
        link.textContent = navTitle.trim() || titleLabel;
      }

      itemWrapper.appendChild(clonedItem);
    });

    localNav.querySelector('.feds-localnav-title').addEventListener('click', () => {
      localNav.classList.toggle('feds-localnav--active');
      const isActive = localNav.classList.contains('feds-localnav--active');
      localNav.querySelector('.feds-localnav-title').setAttribute('aria-expanded', isActive);
      localNav.querySelector('.feds-localnav-title').setAttribute('daa-ll', `${title}_localNav|${isActive ? 'close' : 'open'}`);
    });

    const curtain = localNav.querySelector('.feds-localnav-curtain');
    curtain.addEventListener('click', (e) => {
      trigger({
        element: e.currentTarget,
        event: e,
        type: 'localNav-curtain',
        animatedElement: itemWrapper,
        animationType: 'transition',
      });
    });
    const promo = document.querySelector('.feds-promo-aside-wrapper');
    if (promo) localNav.classList.add('has-promo');
    this.elements.localNav = localNav;
    firstElem.textContent = title.trim();
    const isAtTop = () => {
      const rect = this.elements.localNav.getBoundingClientRect();
      // note: ios safari changes between -0.34375, 0, and 0.328125
      return rect.top === 0;
    };
    window.addEventListener('scroll', (e) => {
      const classList = this.elements.localNav?.classList;
      if (classList.contains('feds-localnav--active')) {
        trigger({
          element: curtain,
          event: e,
          type: 'localNav-curtain',
          animatedElement: itemWrapper,
          animationType: 'transition',
        });
      }
      if (isAtTop()) {
        if (!classList?.contains('is-sticky')) {
          classList?.add('is-sticky');
        }
      } else {
        classList?.remove('is-sticky');
      }
    });
  };

  decorateTopnavWrapper = async () => {
    const breadcrumbs = isDesktop.matches ? await this.decorateBreadcrumbs() : '';
    this.elements.topnavWrapper = toFragment`<div class="feds-topnav-wrapper">
        ${this.elements.topnav}
        ${breadcrumbs}
      </div>
      `;

    this.block.append(
      this.elements.curtain,
      this.elements.topnavWrapper,
    );
  };

  addChangeEventListeners = () => {
    // Ensure correct DOM order for elements between mobile and desktop
    isDesktop.addEventListener('change', () => {
      if (isDesktop.matches) {
        // On desktop, search is after nav
        if (this.elements.mainNav instanceof HTMLElement
          && this.elements.search instanceof HTMLElement) {
          this.elements.mainNav.after(this.elements.search);
        }

        // On desktop, breadcrumbs are below the whole nav
        if (this.elements.topnav instanceof HTMLElement
          && this.elements.breadcrumbsWrapper instanceof HTMLElement) {
          this.elements.topnav.after(this.elements.breadcrumbsWrapper);
        }
      } else {
        // On mobile, nav is after search
        if (this.elements.mainNav instanceof HTMLElement
          && this.elements.search instanceof HTMLElement) {
          this.elements.mainNav.before(this.elements.search);
        }

        // On mobile, breadcrumbs are before the search and nav
        if (this.elements.navWrapper instanceof HTMLElement
          && this.elements.breadcrumbsWrapper instanceof HTMLElement) {
          this.elements.navWrapper.prepend(this.elements.breadcrumbsWrapper);
        }
      }
    });

    // Add a modifier when the nav is tangent to the viewport and content is partly hidden
    const toggleContraction = () => {
      const isOverflowing = isTangentToViewport.matches
        && this.elements.topnav?.scrollWidth
        && this.elements.topnav.scrollWidth > document.body.clientWidth;

      this.elements.topnav.classList.toggle(selectors.overflowingTopNav.slice(1), isOverflowing);
      window.dispatchEvent(new CustomEvent('feds:navOverflow', { detail: { isOverflowing } }));
    };

    toggleContraction();
    isTangentToViewport.addEventListener('change', toggleContraction);
  };

  loadDelayed = async () => {
    this.ready = this.ready || new Promise(async (resolve) => {
      try {
        this.block.removeEventListener('click', this.loadDelayed);
        this.block.removeEventListener('keydown', this.loadDelayed);
        if (this.searchPresent()) {
          const [
            { default: Search },
          ] = await Promise.all([
            import('./features/search/gnav-search.js'),
            loadStyles(rootPath('features/search/gnav-search.css')),
          ]);
          this.Search = Search;
        }

        if (!this.useUniversalNav) {
          const [{ default: ProfileDropdown }] = await Promise.all([
            import('./features/profile/dropdown.js'),
            loadStyles(rootPath('features/profile/dropdown.css')),
          ]);
          this.ProfileDropdown = ProfileDropdown;
        }

        resolve();
      } catch (e) {
        lanaLog({ message: 'GNAV: Error within loadDelayed', e, tags: 'gnav,warn' });
        resolve();
      }
    });

    return this.ready;
  };

  imsReady = async () => {
    if (!window.adobeIMS.isSignedInUser() || !this.useUniversalNav) setUserProfile({});

    const tasks = [this.useUniversalNav ? this.decorateUniversalNav : this.decorateProfile];

    try {
      for await (const task of tasks) {
        await yieldToMain();
        await task();
      }
    } catch (e) {
      lanaLog({
        e,
        tags: 'gnav',
        errorType: 'i',
        message: `GNAV: issues within imsReady - ${this.useUniversalNav ? 'decorateUniversalNav' : 'decorateProfile'}`,
      });
    }
  };

  decorateProfile = async () => {
    const { rawElem, decoratedElem } = this.blocks.profile;
    if (!rawElem) return;

    const isSignedInUser = window.adobeIMS.isSignedInUser();

    // If user is not signed in, decorate the 'Sign In' element
    if (!isSignedInUser) {
      await decorateSignIn({ rawElem, decoratedElem });
      return;
    }

    // If user is signed in, decorate the profile avatar
    const accessToken = window.adobeIMS.getAccessToken();
    const { env } = getConfig();
    const headers = new Headers({ Authorization: `Bearer ${accessToken.token}` });
    const profileData = await fetch(`https://${env.adobeIO}/profile`, { headers });

    if (profileData.status !== 200) {
      lanaLog({
        message: 'GNAV: decorateProfile has failed to fetch profile data',
        e: `${profileData.statusText} url: ${profileData.url}`,
        tags: 'gnav',
        errorType: 'i',
      });
      return;
    }

    const { sections, user: { avatar } } = await profileData.json();

    this.blocks.profile.buttonElem = await decorateProfileTrigger({ avatar });
    decoratedElem.append(this.blocks.profile.buttonElem);

    // Decorate the profile dropdown
    // after user interacts with button or after 3s have passed
    let decorationTimeout;

    const decorateDropdown = async (e) => {
      this.blocks.profile.buttonElem.removeEventListener('click', decorateDropdown);
      clearTimeout(decorationTimeout);
      await this.loadDelayed();
      this.blocks.profile.dropdownInstance = new this.ProfileDropdown({
        rawElem,
        decoratedElem,
        avatar,
        sections,
        buttonElem: this.blocks.profile.buttonElem,
        // If the dropdown has been decorated due to a click, open it
        openOnInit: e instanceof Event,
      });
    };

    this.blocks.profile.buttonElem.addEventListener('click', decorateDropdown);
    decorationTimeout = setTimeout(decorateDropdown, CONFIG.delays.loadDelayed);
  };

  decorateUniversalNav = async () => {
    performance.mark('Unav-Start');
    const signedOut = !window.adobeIMS?.isSignedInUser();
    if (signedOut) {
      const width = getUnavWidthCSS(this.universalNavComponents, signedOut);
      this.blocks.universalNav?.style.setProperty('min-width', width);
    }
    const config = getConfig();
    const locale = getUniversalNavLocale(config.locale);
    const environment = config.env.name === 'prod' ? 'prod' : 'stage';
    const visitorGuid = window.alloy ? await window.alloy('getIdentity')
      .then((data) => data?.identity?.ECID).catch(() => undefined) : undefined;
    const experienceName = getExperienceName();

    const getDevice = () => {
      const agent = navigator.userAgent;
      for (const [os, osName] of Object.entries(osMap)) {
        if (agent.includes(os)) return osName;
      }
      return 'linux';
    };

    const unavVersion = new URLSearchParams(window.location.search).get('unavVersion') || '1.4';
    await Promise.all([
      loadScript(`https://${environment}.adobeccstatic.com/unav/${unavVersion}/UniversalNav.js`),
      loadStyles(`https://${environment}.adobeccstatic.com/unav/${unavVersion}/UniversalNav.css`, true),
    ]);

    const getChildren = () => {
      const children = [CONFIG.universalNav.components.profile];
      // reset sign up value on change
      children[0].attributes.isSignUpRequired = false;

      this.universalNavComponents?.forEach((component) => {
        if (component === 'profile') return;
        if (component === 'signup') {
          children[0].attributes.isSignUpRequired = true;
          return;
        }

        children.push(CONFIG.universalNav.components[component]);
      });

      return children;
    };

    const onAnalyticsEvent = (data) => {
      if (!data) return;
      if (!data.event) data.event = { type: data.type, subtype: data.subtype };
      if (!data.source) data.source = { name: data.workflow?.toLowerCase().trim() };

      const getInteraction = () => {
        const {
          event: { type, subtype } = {},
          source: { name } = {},
          content: { name: contentName } = {},
        } = data;

        switch (`${name}|${type}|${subtype}${contentName ? `|${contentName}` : ''}`) {
          case 'profile|click|sign-in':
            return `Sign In|gnav|${experienceName}|unav`;
          case 'profile|render|component':
            return `Account|gnav|${experienceName}|unav`;
          case 'profile|click|account':
            return `View Account|gnav|${experienceName}|unav`;
          case 'profile|click|sign-out':
            return `Sign Out|gnav|${experienceName}|unav`;
          case 'app-switcher|render|component':
            return 'AppLauncher.appIconToggle';
          case `app-switcher|click|app|${contentName}`:
            return `AppLauncher.appClick.${convertToPascalCase(contentName)}`;
          case 'app-switcher|click|footer|adobe-home':
            return 'AppLauncher.adobe.com';
          case 'app-switcher|click|footer|all-apps':
            return 'AppLauncher.allapps';
          case 'app-switcher|click|footer|adobe-dot-com':
            return 'AppLauncher.adobe.com';
          case 'app-switcher|click|footer|see-all-apps':
            return 'AppLauncher.allapps';
          case 'unc|click|icon':
            return 'Open Notifications panel';
          case 'unc|click|link':
            return 'Open Notification';
          case 'unc|click|markRead':
            return 'Mark Notification as read';
          case 'unc|click|dismiss':
            return 'Dismiss Notifications';
          case 'unc|click|markUnread':
            return 'Mark Notification as unread';
          default:
            return null;
        }
      };
      const interaction = getInteraction();

      if (!interaction) return;
      // eslint-disable-next-line no-underscore-dangle
      window._satellite?.track('event', {
        xdm: {},
        data: { web: { webInteraction: { name: interaction } } },
      });
    };

    const getConfiguration = () => ({
      target: this.blocks.universalNav,
      env: environment,
      locale,
      countryCode: getMiloLocaleSettings(getConfig().locale)?.country || 'US',
      imsClientId: window.adobeid?.client_id,
      theme: isDarkMode() ? 'dark' : 'light',
      analyticsContext: {
        consumer: {
          name: 'adobecom',
          version: '1.0',
          platform: 'Web',
          device: getDevice(),
          os_version: navigator.platform,
        },
        event: { visitor_guid: visitorGuid },
        onAnalyticsEvent,
      },
      children: getChildren(),
      isSectionDividerRequired: getConfig()?.unav?.showSectionDivider,
      showTrayExperience: (!isDesktop.matches),
    });

    // Exposing UNAV config for consumers
    CONFIG.universalNav.universalNavConfig = getConfiguration();
    await window.UniversalNav(CONFIG.universalNav.universalNavConfig);
    // In case we get it wrong
    if (!signedOut) this.blocks.universalNav?.style.removeProperty('min-width');
    performance.mark('Unav-End');
    logPerformance('Unav-Time', 'Unav-Start', 'Unav-End');
    this.decorateAppPrompt({ getAnchorState: () => window.UniversalNav.getComponent?.('app-switcher') });
    isDesktop.addEventListener('change', () => {
      window.UniversalNav.reload(getConfiguration());
    });
  };

  decorateAppPrompt = async ({ getAnchorState } = {}) => {
    performance.mark('PEP-Start');
    const state = getMetadata('app-prompt')?.toLowerCase();
    const entName = getMetadata('app-prompt-entitlement')?.toLowerCase();
    const promptPath = getMetadata('app-prompt-path')?.toLowerCase();
    const hasMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Touch/i.test(navigator.userAgent);

    if (state === 'off'
      || !window.adobeIMS?.isSignedInUser()
      || !isDesktop.matches
      || hasMobileUA
      || !entName?.length
      || !promptPath?.length) return;

    const { base } = getConfig();
    const [
      webappPrompt,
    ] = await Promise.all([
      import('../../features/webapp-prompt/webapp-prompt.js'),
      loadStyles(`${base}/features/webapp-prompt/webapp-prompt.css`),
    ]);

    await webappPrompt.default({
      promptPath,
      entName,
      parent: this.blocks.universalNav,
      getAnchorState,
    });
    performance.mark('PEP-End');
    logPerformance('PEP-Time', 'PEP-Start', 'PEP-End');
  };

  loadSearch = () => {
    const instanceAlreadyExists = !!this.blocks?.search?.instance;
    const searchNotInContent = !this.searchPresent();
    if (instanceAlreadyExists || searchNotInContent) return null;

    return this.loadDelayed().then(() => {
      this.blocks.search.instance = new this.Search(this.blocks.search.config);
    }).catch(() => { });
  };

  isToggleExpanded = () => this.elements.mobileToggle?.getAttribute?.('aria-expanded') === 'true';

  isEmptyGnav = () => this
    .elements
    .navWrapper
    ?.querySelector('.feds-nav')
    ?.childElementCount === 0;

  isMiniGnav = () => this.block.classList.contains('mini-gnav');

  isLocalNav = () => this.newMobileNav && !this.isEmptyGnav() && this
    .elements
    .navWrapper
    ?.querySelectorAll('.feds-nav > section.feds-navItem')
    ?.length <= 1 && !this.isMiniGnav();

  hasMegaMenu = () => this
    .elements
    .navWrapper
    ?.querySelectorAll('.feds-nav > section.feds-navItem')
    ?.length >= 1;

  toggleMenuMobile = () => {
    const isExpanded = this.isToggleExpanded();
    if (!isExpanded && this.newMobileNav) {
      const sections = document.querySelectorAll('header.new-nav .feds-nav > section.feds-navItem > button.feds-navLink');
      animateInSequence(sections, 0.075);
      if (this.isLocalNav() && this.hasMegaMenu()) {
        disableMobileScroll();
        const section = sections[0];
        queueMicrotask(() => section.click());
      }
    } else if (isExpanded && this.isLocalNav()) {
      enableMobileScroll();
    }
    setMenuState();
  };

  decorateToggle = () => {
    if (!this.mainNavItemCount || (this.newMobileNav && !this.hasMegaMenu())) return '';

    const isLocalNav = this.isLocalNav();

    const toggle = toFragment`<button
      class="feds-toggle"
      daa-ll="hamburgermenu|open"
      aria-expanded="false"
      aria-haspopup=${isLocalNav ? 'dialog' : 'true'}
      aria-label="Navigation menu"
      aria-controls=${isLocalNav ? 'feds-popup-1' : 'feds-nav-wrapper'}
      data-feds-preventAutoClose>
      </button>`;

    const setHamburgerPadding = () => {
      if (isDesktop.matches) {
        this.elements.mainNav.style.removeProperty('padding-bottom');
      } else {
        const offset = Math.ceil(this.elements.topnavWrapper.getBoundingClientRect().bottom);
        this.elements.mainNav.style.setProperty('padding-bottom', `${2 * offset}px`);
      }
    };

    const onToggleClick = async () => {
      this.toggleMenuMobile();

      if (this.blocks?.search?.instance) {
        this.blocks.search.instance.clearSearchForm();
      } else {
        await this.loadSearch();
      }

      if (this.isToggleExpanded()) setHamburgerPadding();
    };

    toggle.addEventListener('click', () => logErrorFor(onToggleClick, 'Toggle click failed', 'gnav', 'e'));

    const onDeviceChange = () => {
      if (isDesktop.matches) {
        toggle.setAttribute('aria-expanded', false);
        this.elements.navWrapper.classList.remove('feds-nav-wrapper--expanded');
        document.body.classList.remove('disable-scroll');
        setCurtainState(false);
        closeAllDropdowns();
        this.blocks?.search?.instance?.clearSearchForm();
      }
    };

    isDesktop.addEventListener('change', () => logErrorFor(onDeviceChange, 'Toggle logic failed on device change', 'gnav', 'e'));

    return toggle;
  };

  decorateGenericLogo = ({ selector, classPrefix, includeLabel = true, analyticsValue } = {}) => {
    const rawBlock = this.content.querySelector(selector);
    if (!rawBlock) return '';

    // Get all non-image links
    const imgRegex = /(\.png|\.jpg|\.jpeg)/;
    const blockLinks = [...rawBlock.querySelectorAll('a')];
    const link = blockLinks.find((blockLink) => !imgRegex.test(blockLink.href)
      && !imgRegex.test(blockLink.textContent));

    if (!link) return '';

    // Check which elements should be rendered
    const isBrandImage = rawBlock.matches(selectors.brandImageOnly);
    const renderImage = !rawBlock.matches('.no-logo');
    const renderLabel = !isBrandImage && includeLabel && !rawBlock.matches('.image-only');

    if (!renderImage && !renderLabel) return '';

    // Create image element
    const getImageEl = () => {
      if (isDarkMode()) {
        const allSvgImgs = rawBlock.querySelectorAll('picture img[src$=".svg"]');
        if (allSvgImgs.length === 2) return allSvgImgs[1];

        const images = blockLinks.filter((blockLink) => imgRegex.test(blockLink.href)
          || imgRegex.test(blockLink.textContent));
        if (images.length === 2) return getBrandImage(images[1], isBrandImage);
      }
      const svgImg = rawBlock.querySelector('picture img[src$=".svg"]');
      if (svgImg) return svgImg;

      const image = blockLinks.find((blockLink) => imgRegex.test(blockLink.href)
        || imgRegex.test(blockLink.textContent));
      return getBrandImage(image, isBrandImage);
    };

    const brandImageClass = isBrandImage ? ` ${selectors.brandImageOnly.slice(1)}` : '';
    const imageEl = renderImage
      ? toFragment`<span class="${classPrefix}-image${brandImageClass}">${getImageEl()}</span>`
      : '';

    // Create label element
    const labelEl = renderLabel
      ? toFragment`<span class="${classPrefix}-label">${link.textContent}</span>`
      : '';

    // Create final template
    const decoratedElem = toFragment`
      <a href="${link.href}" class="${classPrefix}" daa-ll="${analyticsValue}">
        ${imageEl}
        ${labelEl}
      </a>`;

    // Add accessibility attributes if just an image is rendered
    if (!renderLabel && link.textContent.length) decoratedElem.setAttribute('aria-label', link.textContent);

    return decoratedElem;
  };

  updateGnavTop = () => {
    const promoHeight = `${this.elements.aside.clientHeight}px`;
    const header = document.querySelector('header');
    const localNav = document.querySelector('.feds-localnav');

    document.querySelector('.feds-promo-aside-wrapper').style.height = promoHeight;
    header.style.top = promoHeight;
    if (!isDesktop.matches && localNav) {
      header.style.top = 0;
      localNav.style.top = promoHeight;
    }
    if (!isDesktop.matches) this.updatePopupPosition();
  };

  decorateAside = async () => {
    performance.mark('Gnav-Aside-Start');
    this.elements.aside = '';
    const promoPath = getMetadata('gnav-promo-source');
    const fedsPromoWrapper = document.querySelector('.feds-promo-aside-wrapper');

    if (!promoPath || !asideJsPromise) {
      fedsPromoWrapper?.remove();
      this.block.classList.remove('has-promo');
      return this.elements.aside;
    }

    const { default: decorate } = await asideJsPromise;
    if (!decorate) return this.elements.aside;
    this.elements.aside = await decorate({ headerElem: this.block, fedsPromoWrapper, promoPath });
    if (!(this.elements.aside instanceof HTMLElement)) return this.elements.aside;
    fedsPromoWrapper.append(this.elements.aside);

    if (this.elements.aside.clientHeight > fedsPromoWrapper.clientHeight) {
      lanaLog({ message: 'Promo height is more than expected, potential CLS', tags: 'gnav-promo', errorType: 'i' });
    }
    this.updateGnavTop();
    this.promoResizeObserver?.disconnect();
    this.promoResizeObserver = new ResizeObserver(this.updateGnavTop);
    this.promoResizeObserver.observe(this.elements.aside);
    performance.mark('Gnav-Aside-End');
    logPerformance('Gnav-Aside-Time', 'Gnav-Aside-Start', 'Gnav-Aside-End');
    return this.elements.aside;
  };

  decorateBrand = () => this.decorateGenericLogo({
    selector: '.gnav-brand',
    classPrefix: 'feds-brand',
    analyticsValue: 'Brand',
  });

  decorateLogo = () => this.decorateGenericLogo({
    selector: '.adobe-logo',
    classPrefix: 'feds-logo',
    includeLabel: false,
    analyticsValue: 'Logo',
  });

  decorateMainNav = async () => {
    performance.mark('Decorate-MainNav-Start');
    const breadcrumbs = isDesktop.matches ? '' : await this.decorateBreadcrumbs();
    this.elements.mainNav = toFragment`<div class="feds-nav" role="list"></div>`;
    this.elements.navWrapper = toFragment`
      <div class="feds-nav-wrapper" id="feds-nav-wrapper">
        ${breadcrumbs}
        ${isDesktop.matches ? '' : this.decorateSearch()}
        ${this.elements.mainNav}
        ${isDesktop.matches ? this.decorateSearch() : ''}
      </div>
    `;

    // Get all main menu items, but exclude any that are nested inside other features
    const items = [...this.content.querySelectorAll('h2, p:only-child > strong > a, p:only-child > em > a')]
      .filter((item) => CONFIG.features.every((feature) => !item.closest(`.${feature}`)));

    // Save number of items to decide whether a hamburger menu is required
    this.mainNavItemCount = items.length;

    for await (const [index, item] of items.entries()) {
      await yieldToMain();
      const mainNavItem = this.decorateMainNavItem(item, index);
      if (mainNavItem) {
        this.elements.mainNav.appendChild(mainNavItem);
      }
    }
    if (this.newMobileNav) {
      await this.decorateLocalNav();
    }
    performance.mark('Decorate-MainNav-End');
    return this.elements.mainNav;
  };

  // eslint-disable-next-line class-methods-use-this
  getMainNavItemType = (item) => {
    const itemTopParent = item.closest('div');
    const isLinkGroup = !!item.closest('.link-group');
    const hasSyncDropdown = itemTopParent instanceof HTMLElement
      && !isLinkGroup && itemTopParent.childElementCount > 1;
    if (hasSyncDropdown) return 'syncDropdownTrigger';
    const hasAsyncDropdown = itemTopParent instanceof HTMLElement
      && itemTopParent.closest('.large-menu') instanceof HTMLElement;
    if (hasAsyncDropdown) return 'asyncDropdownTrigger';
    const isPrimaryCta = item.closest('strong') instanceof HTMLElement;
    if (isPrimaryCta) return 'primaryCta';
    const isSecondaryCta = item.closest('em') instanceof HTMLElement;
    if (isSecondaryCta) return 'secondaryCta';
    const isText = !(item.querySelector('a') instanceof HTMLElement);
    if (isText) return 'text';
    return 'link';
  };

  // update GNAV popup position based on branch banner
  updatePopupPosition = (activePopup) => {
    const popup = activePopup || this.elements.mainNav?.querySelector('.feds-navItem--section.feds-dropdown--active .feds-popup');
    if (!popup) return;
    const hasPromo = this.block.classList.contains('has-promo');
    const promoHeight = this.elements.aside?.clientHeight;

    if (!this.isLocalNav()) {
      if (hasPromo) popup.style.top = `calc(0px - var(--feds-height-nav) - ${promoHeight}px)`;
      return;
    }
    const yOffset = window.scrollY || Math.abs(parseInt(document.body.style.top, 10)) || 0;
    const navOffset = hasPromo ? `var(--feds-height-nav) - ${promoHeight}px` : 'var(--feds-height-nav)';
    popup.removeAttribute('style');
    popup.style.top = `calc(${yOffset}px - ${navOffset} - 2px)`;
    const { isPresent, isSticky, height } = getBranchBannerInfo();
    if (isPresent) {
      const delta = yOffset - height;
      if (isSticky) {
        popup.style.height = `calc(100dvh - ${height}px + 2px)`;
      } else {
        popup.style.top = `calc(0px - var(--feds-height-nav) + ${Math.max(delta, 0)}px - 2px)`;
        popup.style.height = `calc(100dvh + ${Math.min(delta, 0)}px + 2px)`;
      }
    }
  };

  decorateMainNavItem = (item, index) => {
    performance.mark(`Decorate-MainNav-Item-${index}-Start`);
    const itemType = this.getMainNavItemType(item);

    const itemHasActiveLink = ['syncDropdownTrigger', 'link'].includes(itemType)
      && getActiveLink(item.closest('div')) instanceof HTMLElement;
    const activeModifier = itemHasActiveLink ? ` ${selectors.activeNavItem.slice(1)}` : '';

    const makeTabActive = (popup) => {
      if (popup.classList.contains('loading')) return;
      const tabbuttons = popup.querySelectorAll('.global-navigation .tabs button');
      const tabpanels = popup.querySelectorAll('.global-navigation .tab-content [role="tabpanel"]');
      closeAllTabs(tabbuttons, tabpanels);
      const { origin, pathname } = window.location;
      const url = `${origin}${pathname}`;
      setTimeout(() => {
        const activeLink = [
          ...popup.querySelectorAll('a:not([data-modal-hash])'),
        ].find((el) => (el.href === url || el.href.startsWith(`${url}?`) || el.href.startsWith(`${url}#`)));
        const tabIndex = activeLink ? +activeLink.parentNode.id : 0;
        const selectTab = popup.querySelectorAll('.tab')[tabIndex];
        const daallTab = selectTab.getAttribute('daa-ll');
        selectTab.setAttribute('daa-ll', `${daallTab?.replace('click', 'open')}`);
        selectTab?.click();
        selectTab.setAttribute('daa-ll', `${daallTab?.replace('open', 'click')}`);
        const title = popup.querySelector('.title h2');
        title?.setAttribute('tabindex', '-1'); // Make title focusable
        title?.focus();
        addA11YMobileDropdowns(this.elements.topnav, popup.previousElementSibling);
      }, 100);
    };

    function observeDropdown(dropdownTrigger) {
      const observer = new MutationObserver(() => {
        const isExpanded = dropdownTrigger.getAttribute('aria-expanded') === 'true';
        const analyticsValue = `header|${isExpanded ? 'Close' : 'Open'}`;
        dropdownTrigger.setAttribute('daa-lh', analyticsValue);
      });
      observer.observe(dropdownTrigger, { attributeFilter: ['aria-expanded'] });
    }

    // Copying dropdown contents to localNav items
    const decorateLocalNavItems = (navItem, template) => {
      const elements = [...document.querySelectorAll('.feds-localnav .feds-navItem')].find(
        (el) => {
          const link = el.querySelector('a, button');
          link?.setAttribute('tabindex', '-1');
          link?.setAttribute('aria-hidden', true);
          return link?.dataset?.title?.trim() === navItem.textContent;
        },
      );
      if (elements) {
        const dropdownBtn = elements.querySelector('button');
        elements.innerHTML = template.innerHTML;
        // To override the textcontent of button of first item of localnav
        if (dropdownBtn) {
          elements.querySelector('button').textContent = dropdownBtn.textContent;
        }
        // Reattach click events & mutation observers, as cloned elem don't retain event listeners
        elements.querySelector('.feds-localnav-items button')?.addEventListener('click', (e) => {
          trigger({ element: e.currentTarget, event: e, type: 'localNavItem' });
        });

        const dropdownTrigger = elements.querySelector('.feds-localnav-items button[aria-expanded]');
        if (dropdownTrigger) observeDropdown(dropdownTrigger);

        elements.querySelectorAll('.feds-menu-headline').forEach((elem) => {
          // Reattach click event listener to headlines
          elem?.setAttribute('role', 'button');
          elem?.setAttribute('tabindex', 0);
          elem?.removeAttribute('aria-level');
          elem?.setAttribute('aria-haspopup', true);
          elem?.setAttribute('aria-expanded', false);
          elem?.addEventListener('click', (e) => {
            trigger({ element: e.currentTarget, event: e, type: 'headline' });
          });
          elem.textContent = elem.textContent?.trim();
        });
      }
    };

    // All dropdown decoration is delayed
    const delayDropdownDecoration = ({ template } = {}) => {
      let decorationTimeout;
      let desktopMegaMenuHTML = null;
      let mobileNavCleanup = () => {};

      const decorateDropdown = () => logErrorFor(async () => {
        template.removeEventListener('click', decorateDropdown);
        clearTimeout(decorationTimeout);

        const loadingDesktopMegaMenuHTML = template.querySelector('.feds-popup.loading')?.innerHTML;
        (async () => {
          try {
            const menuLogic = await loadDecorateMenu();

            await menuLogic.decorateMenu({
              item,
              template,
              type: itemType,
            });
            // There are two calls to transformTemplateToMobile
            // One without awaiting decorateMenu, and one after
            // decorateMenu is complete
            const popup = template.querySelector('.feds-popup');
            desktopMegaMenuHTML = popup.innerHTML;
            if (!this.newMobileNav) return;
            if (isDesktop.matches || !popup) return;
            mobileNavCleanup();
            mobileNavCleanup = await transformTemplateToMobile({
              popup,
              item,
              localnav: this.isLocalNav(),
              toggleMenu: this.toggleMenuMobile,
              updatePopupPosition: this.updatePopupPosition,
            });
            if (popup.closest('section.feds-dropdown--active')) makeTabActive(popup);
          } finally {
            if (this.isLocalNav()) {
              decorateLocalNavItems(item, template);
            }
          }
        })();
        if (this.newMobileNav) {
          const popup = template.querySelector('.feds-popup');
          if (!isDesktop.matches && popup) {
            mobileNavCleanup();
            mobileNavCleanup = await transformTemplateToMobile({
              popup,
              item,
              localnav: this.isLocalNav(),
              toggleMenu: this.toggleMenuMobile,
            });
            popup.style.removeProperty('visibility');
          } else if (isDesktop.matches) {
            popup?.style.removeProperty('visibility');
          }
          isDesktop.addEventListener('change', async () => {
            const newPopup = template.querySelector('.feds-popup');
            if (!newPopup) return;
            enableMobileScroll();
            if (isDesktop.matches) {
              newPopup.innerHTML = desktopMegaMenuHTML ?? loadingDesktopMegaMenuHTML;
              this.block.classList.remove('new-nav');
              disableAriaHidden();
              removeA11YMobileDropdowns();
            } else {
              mobileNavCleanup();
              mobileNavCleanup = await transformTemplateToMobile({
                popup: newPopup,
                item,
                localnav: this.isLocalNav(),
                toggleMenu: this.toggleMenuMobile,
              });
              this.block.classList.add('new-nav');
            }
          });
        }
      }, 'Decorate dropdown failed', 'gnav', 'i');

      template.addEventListener('click', decorateDropdown);
      const newMobileNavActive = this.newMobileNav && !isDesktop.matches;
      if (itemType === 'asyncDropdownTrigger' && (newMobileNavActive || isDesktop.matches)) {
        const loadingMegaMenu = loaderMegaMenu();
        loadingMegaMenu.style.visibility = 'hidden';
        template.append(loadingMegaMenu);
        template.classList.add('feds-navItem--megaMenu');
      }
      decorationTimeout = setTimeout(decorateDropdown, CONFIG.delays.mainNavDropdowns);
    };

    // Decorate item based on its type
    const returnValue = (() => {
      switch (itemType) {
        case 'syncDropdownTrigger':
        case 'asyncDropdownTrigger': {
          const dropdownTrigger = toFragment`<button
            class="feds-navLink feds-navLink--hoverCaret"
            aria-expanded="false"
            aria-haspopup="true"
            daa-ll="${getAnalyticsValue(item.textContent, index + 1)}"
            daa-lh="header|Open">
              ${item.textContent.trim()}
            </button>`;

          const isSectionMenu = item.closest('.section') instanceof HTMLElement;
          const tag = isSectionMenu ? 'section' : 'div';
          const sectionModifier = isSectionMenu ? ' feds-navItem--section' : '';
          const sectionDaaLh = isSectionMenu ? ` daa-lh='${getAnalyticsValue(item.textContent)}'` : '';
          const triggerTemplate = toFragment`
            <${tag} role="listitem" class="feds-navItem${sectionModifier}${activeModifier}" ${sectionDaaLh}>
              ${dropdownTrigger}
            </${tag}>`;

          // Toggle trigger's dropdown on click
          dropdownTrigger.addEventListener('click', (e) => {
            if (!isDesktop.matches && this.newMobileNav && isSectionMenu) {
              const popup = dropdownTrigger.nextElementSibling;
              // document.body.style.top should always be set
              // at this point by calling disableMobileScroll
              if (popup) {
                this.updatePopupPosition(popup);
              }
              makeTabActive(popup);
            } else if (isDesktop.matches && this.newMobileNav && isSectionMenu) {
              const popup = dropdownTrigger.nextElementSibling;
              if (popup) popup.style.removeProperty('top');
            }
            trigger({ element: dropdownTrigger, event: e, type: 'dropdown' });
            setActiveDropdown(dropdownTrigger);
          });
          // Set aria attributes
          isDesktop.addEventListener('change', () => setAriaAtributes(dropdownTrigger));

          // Update analytics value when dropdown is expanded/collapsed
          observeDropdown(dropdownTrigger);

          delayDropdownDecoration({ template: triggerTemplate });
          return addMepHighlightAndTargetId(triggerTemplate, item);
        }
        case 'primaryCta':
        case 'secondaryCta':
          // Remove its 'em' or 'strong' wrapper
          item.parentElement.replaceWith(item);

          return addMepHighlightAndTargetId(toFragment`<div class="feds-navItem feds-navItem--centered" role="listitem">
              ${decorateCta({ elem: item, type: itemType, index: index + 1 })}
            </div>`, item);
        case 'link': {
          let customLinkModifier = '';
          let removeCustomLink = false;
          const linkElem = item.querySelector('a');
          const customLinksSection = item.closest('.link-group');
          linkElem.className = 'feds-navLink';
          linkElem.setAttribute('daa-ll', getAnalyticsValue(linkElem.textContent, index + 1));

          if (customLinksSection) {
            const removeLink = () => {
              const url = new URL(linkElem.href);
              linkElem.setAttribute('href', `${url.origin}${url.pathname}${url.search}`);
              if (isActiveLink(linkElem)) {
                linkElem.removeAttribute('href');
              }
              const linkHash = url.hash.slice(2);
              return !this.customLinks.includes(linkHash);
            };
            [...customLinksSection.classList].splice(1).forEach((className) => {
              customLinkModifier += ` feds-navItem--${className}`;
            });
            removeCustomLink = removeLink();
          } else if (itemHasActiveLink) {
            linkElem.removeAttribute('href');
            linkElem.setAttribute('role', 'link');
            linkElem.setAttribute('aria-disabled', 'true');
            linkElem.setAttribute('aria-current', 'page');
            linkElem.setAttribute('tabindex', 0);
          }

          const linkTemplate = toFragment`
            <div class="feds-navItem${activeModifier}${customLinkModifier}" role="listitem">
              ${linkElem}
            </div>`;
          return removeCustomLink ? '' : addMepHighlightAndTargetId(linkTemplate, item);
        }
        case 'text':
          return addMepHighlightAndTargetId(toFragment`<div class="feds-navItem feds-navItem--centered">
              ${item.textContent}
            </div>`, item);
        default:
          /* c8 ignore next 3 */
          return addMepHighlightAndTargetId(toFragment`<div class="feds-navItem feds-navItem--centered">
              ${item}
            </div>`, item);
      }
    })();
    performance.mark(`Decorate-MainNav-Item-${index}-End`);
    return returnValue;
  };

  decorateBreadcrumbs = async () => {
    performance.mark('Breadcrumbs-Start');
    if (!this.block.classList.contains('has-breadcrumbs')) return null;
    if (this.elements.breadcrumbsWrapper) return this.elements.breadcrumbsWrapper;
    const breadcrumbsElem = this.block.querySelector('.breadcrumbs');
    // Breadcrumbs are not initially part of the nav, need to decorate the links
    if (breadcrumbsElem) decorateLinks(breadcrumbsElem);
    if (!breadCrumbsJsPromise) return null;
    const { default: createBreadcrumbs } = await breadCrumbsJsPromise;
    this.elements.breadcrumbsWrapper = await createBreadcrumbs(breadcrumbsElem);
    performance.mark('Breadcrumbs-End');
    return this.elements.breadcrumbsWrapper;
  };

  searchPresent = () => !!this.content.querySelector('.search');

  decorateSearch = () => {
    if (!this.searchPresent()) return null;

    this.blocks.search.config.trigger = toFragment`
      <button class="feds-search-trigger" aria-label="Search" aria-expanded="false" aria-controls="feds-search-bar" daa-ll="Search">
        ${this.blocks.search.config.icon}
        <span class="feds-search-close"></span>
      </button>`;

    this.elements.search = toFragment`
      <div class="feds-search">
        ${this.blocks.search.config.trigger}
      </div>`;

    // Replace the aria-label value once placeholder is fetched
    replaceKey('search', getFedsPlaceholderConfig()).then((placeholder) => {
      if (placeholder && placeholder.length) {
        this.blocks.search.config.trigger.setAttribute('aria-label', placeholder);
      }
    });

    this.blocks.search.config.trigger.addEventListener('click', async () => {
      await this.loadSearch();
    });

    return this.elements.search;
  };
}

export default async function init(block) {
  const { mep, miniGnav = false } = getConfig();
  const sourceUrl = await getGnavSource();
  let newMobileNav = new URLSearchParams(window.location.search).get('newNav');
  newMobileNav = newMobileNav ? newMobileNav !== 'false' : getMetadata('mobile-gnav-v2') !== 'off';
  const [url, hash = ''] = sourceUrl.split('#');
  if (hash === '_noActiveItem') {
    setDisableAEDState();
  }
  const content = await fetchAndProcessPlainHtml({ url, plainHTMLPromise });
  if (!content) {
    const error = new Error('Could not create global navigation. Content not found!');
    error.tags = 'gnav';
    error.url = url;
    error.errorType = 'e';
    lanaLog({ message: error.message, ...error });
    throw error;
  }
  setAsyncDropdownCount(content.querySelectorAll('.large-menu').length);
  const gnav = new Gnav({
    content,
    block,
    newMobileNav,
  });
  if (newMobileNav && !isDesktop.matches) block.classList.add('new-nav');
  if (miniGnav) block.classList.add('mini-gnav');
  if (isDarkMode()) block.classList.add('feds--dark');
  await gnav.init();
  if (gnav.isLocalNav()) block.classList.add('local-nav');
  block.setAttribute('daa-im', 'true');
  const mepMartech = mep?.martech || '';
  block.setAttribute('daa-lh', `gnav|${getExperienceName()}${mepMartech}`);
  performance.mark('Gnav-Init-End');
  logPerformance('Gnav-Init-Function-Time', 'Gnav-Start', 'Gnav-Init-End');
  return gnav;
}
