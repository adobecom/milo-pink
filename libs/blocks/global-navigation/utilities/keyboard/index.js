/* eslint-disable class-methods-use-this */
import { getNextVisibleItemPosition, getPreviousVisibleItemPosition, selectors } from './utils.js';
import MainNav from './mainNav.js';
import { closeAllDropdowns, lanaLog, logErrorFor, isDesktopForContext } from '../utilities.js';
import MobileGnav from './mobileGnav.js';

const cycleOnOpenSearch = ({ e, isDesktop }) => {
  const withoutBreadcrumbs = [
    ...document.querySelectorAll(`
      ${selectors.brand},
      ${selectors.mainNavToggle},
      ${selectors.mainNavItems},
      ${selectors.searchTrigger},
      ${selectors.searchField},
      ${selectors.signIn},
      ${selectors.profileButton},
      ${selectors.logo}
  `),
  ];
  const first = getNextVisibleItemPosition(-1, withoutBreadcrumbs);
  const last = getPreviousVisibleItemPosition(withoutBreadcrumbs.length, withoutBreadcrumbs);
  const openSearch = isDesktop && document.querySelector(selectors.openSearch);
  if (openSearch && document.activeElement === withoutBreadcrumbs[e.shiftKey ? first : last]) {
    e.preventDefault();
    withoutBreadcrumbs[e.shiftKey ? last : first].focus();
  }
};

const openProfile = ({ e, el }) => {
  const button = e.target.closest(`${selectors.signIn}, ${selectors.profileButton}`);
  if (button?.getAttribute('aria-expanded') === 'false') {
    e.target.click();
    el.querySelector(selectors.profileDropdown)?.focus();
    return true;
  }
  return false;
};

const getProfileItems = ({ e }) => {
  const profileDropdownLinks = document.querySelectorAll(selectors.profileDropdown);
  if (!profileDropdownLinks.length) return { next: -1, prev: -1, items: [] };
  const items = [...profileDropdownLinks];
  const curr = items.findIndex((element) => element === e.target);
  return { next: curr + 1, prev: curr - 1, curr, items };
};

const closeProfile = () => {
  closeAllDropdowns();
  document.querySelector(`${selectors.profileButton}, ${selectors.signIn}`)?.focus();
};

const focusNextProfileItem = ({ e }) => {
  const { items, next } = getProfileItems({ e });
  if (items[next]) {
    items[next].focus();
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  closeProfile();
};

const focusPrevProfileItem = ({ e }) => {
  const { items, prev } = getProfileItems({ e });
  if (items[prev]) {
    items[prev].focus();
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  closeProfile();
};

class KeyboardNavigation {
  constructor(newNavWithLnav) {
    try {
      this.addEventListeners();
      this.mainNav = new MainNav();
      this.mobileGnav = MobileGnav.init();
      if (newNavWithLnav) {
        this.loadLnavNavigation();
      }
      this.desktop = window.matchMedia('(min-width: 900px)');
    } catch (e) {
      lanaLog({ message: 'Keyboard Navigation failed to load', e, tags: 'gnav-keyboard', errorType: 'e' });
    }
  }

  loadLnavNavigation = async () => {
    if (!this.localNav) {
      this.localNav = (async () => {
        try {
          const { default: LnavNavigation } = await import('./localNav.js');
          return new LnavNavigation();
        } catch (e) {
          lanaLog({ message: 'Keyboard Navigation failed to load for LNAV', e, tags: 'gnav-keyboard', errorType: 'i' });
          return null;
        }
      })();
    }
    return this.localNav;
  };

  addEventListeners = () => {
    [...document.querySelectorAll(`${selectors.globalNavTag}, ${selectors.globalFooterTag}`)]
      .forEach((el) => {
        el.addEventListener('keydown', (e) => logErrorFor(() => {
          if (!e.target.closest(`${selectors.globalNav}, ${selectors.globalFooter}`)) return;
          switch (e.code) {
            case 'Tab': {
              const isNewNav = !!document.querySelector('header.new-nav');
              const isOpen = document
                .querySelector(selectors.navWrapper)
                .classList.contains(selectors.navWrapperExpanded.slice(1));
              if (isNewNav && isOpen) {
                if (e.target.classList.contains(selectors.mainNavToggle.slice(1))) {
                  e.preventDefault();
                  if (e.shiftKey) {
                    const menuItems = [...document.querySelectorAll(`${selectors.mainMenuItems}, ${selectors.mainMenuLinks}`)];
                    menuItems.at(-1)?.focus();
                  } else {
                    document.querySelector(`${selectors.mainMenuItems}, ${selectors.mainMenuLinks}`)?.focus();
                  }
                }
              } else {
                const isFooterContext = e.target.closest(selectors.globalFooter);
                const context = isFooterContext ? 'footer' : 'viewport';
                cycleOnOpenSearch({ e, isDesktop: isDesktopForContext(context) });
                const { items } = getProfileItems({ e });
                const profileBtn = e.target.closest(`${selectors.signIn}, ${selectors.profileButton}`);
                if (e.shiftKey && e.target === profileBtn) closeProfile();
                if (items[items.length - 1] === e.target) {
                  e.preventDefault();
                  e.stopPropagation();
                  closeProfile();
                }
              }
              break;
            }
            case 'Escape': {
              const toggle = document.querySelector('header.new-nav .feds-toggle');
              if (toggle && toggle === e.target && toggle.getAttribute('aria-expanded') === 'true') {
                toggle.click();
                toggle.focus();
              }
              break;
            }
            case 'Enter':
            case 'Space': {
              if (e.target.closest(selectors.searchField) || e.target.closest('.feds-client-search')) return;
              e.stopPropagation();
              e.preventDefault();
              e.target.click();
              break;
            }
            case 'ArrowDown': {
              if (e.target.closest(selectors.profile)) {
                if (openProfile({ e, el })) break;
                focusNextProfileItem({ e });
              }
              break;
            }
            case 'ArrowUp': {
              if (e.target.closest(selectors.profile)) {
                focusPrevProfileItem({ e });
              }
              break;
            }
            default:
              break;
          }
        }, `KeyboardNavigation index failed. ${e.code}`, 'gnav-keyboard', 'e'));
      });
  };
}

export default KeyboardNavigation;
