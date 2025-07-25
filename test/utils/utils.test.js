/* eslint-disable no-underscore-dangle */
import { readFile, setViewport } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { waitFor, waitForElement } from '../helpers/waitfor.js';
import { mockFetch } from '../helpers/generalHelpers.js';
import { createTag, customFetch } from '../../libs/utils/utils.js';

const utils = {};
const config = {
  codeRoot: '/libs',
  locales: { '': { ietf: 'en-US', tk: 'hah7vzn.css' } },
};
const stageDomainsMap = {
  'www.stage.adobe.com': {
    'www.adobe.com': 'origin',
    'business.adobe.com': 'business.stage.adobe.com',
    'blog.adobe.com': 'blog.stage.adobe.com',
    'helpx.adobe.com': 'helpx.stage.adobe.com',
    'news.adobe.com': 'news.stage.adobe.com',
  },
  '--bacom--adobecom.hlx.live': {
    'business.adobe.com': 'origin',
    'blog.adobe.com': 'main--blog--adobecom.hlx.live',
    'helpx.adobe.com': 'main--helpx--adobecom.hlx.live',
    'news.adobe.com': 'main--news--adobecom.hlx.live',
  },
  '--blog--adobecom.hlx.page': {
    'blog.adobe.com': 'origin',
    'business.adobe.com': 'main--bacom--adobecom.hlx.page',
    'helpx.adobe.com': 'main--helpx--adobecom.hlx.page',
    'news.adobe.com': 'main--news--adobecom.hlx.page',
  },
  '.business-graybox.adobe.com': { 'business.adobe.com': 'origin' },
};
const stageDomainsMapWRegex = {
  hostname: 'stage--milo--owner.hlx.page',
  map: {
    '^https://.*--milo--owner.hlx.page': {
      '^https://www.adobe.com/acrobat': 'https://main--dc--adobecom.hlx.page',
      '^https://business.adobe.com/blog': 'https://main--bacom-blog--adobecom.hlx.page',
      '^https://business.adobe.com': 'https://business.stage.adobe.com',
      '^https://www.adobe.com': 'origin',
    },
  },

};
const prodDomains = ['www.adobe.com', 'business.adobe.com', 'blog.adobe.com', 'helpx.adobe.com', 'news.adobe.com'];
const externalDomains = ['external1.com', 'external2.com'];
const ogFetch = window.fetch;

describe('Utils', () => {
  let head;
  let body;
  before(async () => {
    head = await readFile({ path: './mocks/head.html' });
    body = await readFile({ path: './mocks/body.html' });
    const module = await import('../../libs/utils/utils.js');
    module.setConfig(config);
    Object.keys(module).forEach((func) => {
      utils[func] = module[func];
    });
    window.hlx = { rum: { isSelected: false } };
  });

  after(() => {
    delete window.hlx;
  });

  it('fetches with cache param', async () => {
    window.fetch = mockFetch({ payload: true });
    const resp = await customFetch({ resource: './mocks/taxonomy.json', withCacheRules: true });
    expect(resp.json()).to.be.true;
  });

  describe('prerendered support', () => {
    it('loads milo minimally when document is prerendered', async () => {
      document.head.innerHTML = head;
      document.body.innerHTML = await readFile({ path: './mocks/body-page-load-ok-milo.html' });

      const originalMarquee = document.querySelector('.marquee');
      await utils.loadArea();
      expect(document.querySelector('.marquee')).to.equal(originalMarquee);
    });
  });

  describe('core-functionality', () => {
    it('preloads blocks for performance reasons', async () => {
      document.head.innerHTML = head;
      document.body.innerHTML = await readFile({ path: './mocks/marquee.html' });

      await utils.loadArea();
      const scriptPreload = document.head.querySelector('link[href*="/libs/blocks/marquee/marquee.js"]');
      const marqueeDecoratePreload = document.head.querySelector('link[href*="/libs/utils/decorate.js"]');
      const stylePreload = document.head.querySelector('link[href*="/libs/blocks/marquee/marquee.css"]');
      expect(marqueeDecoratePreload).to.exist;
      expect(scriptPreload).to.exist;
      expect(stylePreload).to.exist;
    });
  });

  it('renders global navigation when header tag is present', async () => {
    const bodyWithheader = await readFile({ path: './mocks/body-gnav.html' });
    document.head.innerHTML = head;
    document.body.innerHTML = bodyWithheader;
    await utils.loadArea();
    expect(document.querySelector('.global-navigation')).to.exist;
  });

  it('render meta performanceV2 renders the normal flow', async () => {
    const metaTag = document.createElement('meta');
    metaTag.setAttribute('name', 'personalization-v2');
    metaTag.setAttribute('content', 'personalization-v2');
    document.head.appendChild(metaTag);

    const bodyWithheader = await readFile({ path: './mocks/body-gnav.html' });
    document.body.innerHTML = bodyWithheader;

    await utils.loadArea();
    expect(document.querySelector('.global-navigation')).to.exist;
  });

  it('render meta performanceV2 renders the normal flow with params', async () => {
    const params = new URLSearchParams({ 'target-timeout': '1000' });
    const baseUrl = `${window.location.origin}${window.location.pathname}`;

    const newUrl = `${baseUrl}?${params.toString()}`;

    window.history.pushState({ path: newUrl }, '', newUrl);
    const localHead = await readFile({ path: './mocks/mep/head-target-postlcp.html' });
    document.head.innerHTML = localHead;
    const metaTag = document.createElement('meta');
    metaTag.setAttribute('name', 'personalization-v2');
    metaTag.setAttribute('content', 'on');
    document.head.appendChild(metaTag);

    const bodyWithheader = await readFile({ path: './mocks/body-gnav.html' });
    document.body.innerHTML = bodyWithheader;

    await utils.loadArea();
    expect(document.querySelector('.global-navigation')).to.exist;
  });

  describe('with body', () => {
    beforeEach(async () => {
      window.fetch = mockFetch({ payload: { data: '' } });

      document.head.innerHTML = head;
      document.body.innerHTML = body;

      await utils.loadArea();
      sinon.spy(console, 'log');
    });

    afterEach(() => {
      window.fetch = ogFetch;
      // eslint-disable-next-line no-console
      console.log.restore();
    });

    describe('Template', () => {
      it('loads a template script and style', async () => {
        const meta = document.createElement('meta');
        meta.name = 'template';
        meta.content = 'Template Sidebar';
        document.head.append(meta);
        await utils.loadTemplate();
        const hasTemplateSidebar = document.querySelector('body.template-sidebar');
        expect(hasTemplateSidebar).to.exist;
      });
    });

    describe('PDF Viewer', () => {
      it('pdf link with different text content opens in new window', () => {
        const link = document.querySelector('a[href$="pdf"]');
        utils.decorateAutoBlock(link);
        expect(link.target).to.equal('_blank');
      });
    });

    describe('Configure Auto Block', () => {
      it('Disable auto block when #_dnb in url', async () => {
        setViewport({ width: 600, height: 1500 });
        await waitForElement('.disable-autoblock');
        const disableAutoBlockLink = document.querySelector('.disable-autoblock');
        utils.decorateLinks(disableAutoBlockLink);
        expect(disableAutoBlockLink.href).to.equal('https://www.instagram.com/');
      });

      it('Auto block works as expected when #_dnb is not added to url', async () => {
        const a = await waitForElement('[href="https://twitter.com/Adobe"]');
        utils.decorateAutoBlock(a);
        const autoBlockLink = document.querySelector('[href="https://twitter.com/Adobe"]');
        expect(autoBlockLink.className).to.equal('twitter link-block');
      });

      it('Does not error on invalid url', () => {
        const autoBlock = utils.decorateAutoBlock('http://HostName:Port/lc/system/console/configMgr');
        expect(autoBlock).to.equal(false);
      });
    });

    describe('Custom Link Actions', () => {
      const originalUserAgent = navigator.userAgent;
      before(() => {
        window.navigator.share = sinon.stub().resolves();
        Object.defineProperty(navigator, 'userAgent', {
          value: 'android',
          writable: true,
        });
      });

      after(() => {
        Object.defineProperty(navigator, 'userAgent', {
          value: originalUserAgent,
          writable: true,
        });
      });

      it('Implements a login action', async () => {
        await waitForElement('.login-action');
        const login = document.querySelector('.login-action');
        utils.decorateLinks(login);
        expect(login.href).to.equal('https://www.adobe.com/');
      });
      it('Implements a copy link action', async () => {
        await waitForElement('.copy-action');
        const copy = document.querySelector('.copy-action');
        utils.decorateLinks(copy);
        expect(copy.classList.contains('copy-link')).to.be.true;
      });
      it('triggers the event listener on clicking the custom links', async () => {
        const login = document.querySelector('.login-action');
        const copy = document.querySelector('.copy-action');
        const clickEvent = new Event('click', { bubbles: true, cancelable: true });
        const preventDefaultSpy = sinon.spy(clickEvent, 'preventDefault');
        login.dispatchEvent(clickEvent);
        copy.dispatchEvent(clickEvent);
        expect(preventDefaultSpy.calledTwice).to.be.true;
        expect(window.navigator.share.calledOnce).to.be.true;
      });
    });

    describe('Aria label appendment', () => {
      it('appends aria label if defined', () => {
        const theText = 'Text';
        const theAriaLabel = 'Aria label';

        const noAriaLabelElem = document.querySelector('.aria-label-none');
        expect(noAriaLabelElem.getAttribute('aria-label')).to.be.null;
        expect(noAriaLabelElem.innerText).to.equal(theText);

        const simpleAriaLabelElem = document.querySelector('.aria-label-simple');
        expect(simpleAriaLabelElem.getAttribute('aria-label')).to.equal(theAriaLabel);
        expect(simpleAriaLabelElem.innerText).to.equal(theText);

        const pipedAriaLabelElem = document.querySelector('.aria-label-piped');
        expect(pipedAriaLabelElem.getAttribute('aria-label')).to.equal(theAriaLabel);
        expect(pipedAriaLabelElem.innerText).to.equal(`${theText} | Other text`);

        const specialCharAriaLabelElem = document.querySelector('.aria-label--special-char');
        expect(specialCharAriaLabelElem.getAttribute('aria-label')).to.equal(`${theAriaLabel} ~!@#$%^&*()-_=+[{/;:'",.?}] special characters`);
        expect(specialCharAriaLabelElem.innerText).to.equal(theText);

        const noSpacePipedAriaLabelElem = document.querySelector('.aria-label-piped--no-space');
        expect(noSpacePipedAriaLabelElem.getAttribute('aria-label')).to.equal(theAriaLabel);
        expect(noSpacePipedAriaLabelElem.innerText).to.equal(`${theText}|Other text`);

        const iconNoAriaLabelElem = document.querySelector('.aria-label-icon-none');
        expect(iconNoAriaLabelElem.getAttribute('aria-label')).to.be.null;
        expect(iconNoAriaLabelElem.querySelector('.icon')).to.exist;
        expect(iconNoAriaLabelElem.innerText).to.equal(theText);

        const iconAriaLabelElem = document.querySelector('.aria-label-icon-simple');
        expect(iconAriaLabelElem.getAttribute('aria-label')).to.equal(theAriaLabel);
        expect(iconAriaLabelElem.querySelector('.icon')).to.exist;
        expect(iconAriaLabelElem.innerText).to.equal(theText);
      });
    });

    describe('Fragments', () => {
      it('fully unwraps a fragment', () => {
        const fragments = document.querySelectorAll('.link-block.fragment');
        utils.decorateAutoBlock(fragments[0]);
        expect(fragments[0].parentElement.nodeName).to.equal('DIV');
      });

      it('Does not unwrap when sibling content present', () => {
        const fragments = document.querySelectorAll('.link-block.fragment');
        utils.decorateAutoBlock(fragments[1]);
        expect(fragments[1].parentElement.nodeName).to.equal('DIV');
        expect(fragments[1].parentElement.textContent).to.contain('My sibling');
      });

      it('Does not unwrap when not in paragraph tag', () => {
        const fragments = document.querySelectorAll('.link-block.fragment');
        utils.decorateAutoBlock(fragments[1]);
        expect(fragments[1].parentElement.nodeName).to.equal('DIV');
        expect(fragments[1].parentElement.textContent).to.contain('My sibling');
      });
    });

    it('Loads a script', async () => {
      const script = await utils.loadScript('/test/utils/mocks/script.js', 'module', { mode: 'async' });
      expect(script).to.exist;
      expect(script.type).to.equal('module');
      expect(script.async).to.equal(true);
      await utils.loadScript('/test/utils/mocks/script.js', 'module');
      expect(script).to.exist;
    });

    it('Loads a script twice', async () => {
      const scriptOne = await utils.loadScript('/test/utils/mocks/script.js', 'module');
      expect(scriptOne).to.exist;
      const scriptTwo = await utils.loadScript('/test/utils/mocks/script.js', 'module');
      expect(scriptTwo).to.exist;
    });

    it('Rejects a bad script', async () => {
      try {
        await utils.loadScript('/test/utils/mocks/error.js');
      } catch (err) {
        expect(err.message).to.equal('error loading script: http://localhost:2000/test/utils/mocks/error.js');
      }
    });

    it('Does not setup nofollow links', async () => {
      window.fetch = mockFetch({ payload: { data: [] } });
      await utils.loadDeferred(document, [], { links: 'on' }, () => { });
      const gaLink = document.querySelector('a[href="https://analytics.google.com/"]');
      expect(gaLink.getAttribute('rel')).to.be.null;
    });

    it('Sets up nofollow links', async () => {
      const metaOn = document.createElement('meta');
      metaOn.name = 'nofollow-links';
      metaOn.content = 'on';

      const metaPath = document.createElement('meta');
      metaPath.name = 'nofollow-path';
      metaPath.content = '/test/utils/mocks/nofollow.json';

      document.head.append(metaOn, metaPath);
      await utils.loadDeferred(document, [], { contentRoot: '' }, () => { });
      const gaLink = document.querySelector('a[href^="https://analytics.google.com"]');
      expect(gaLink).to.exist;
    });

    it('Converts UTF-8 to Base 64', () => {
      const b64 = utils.utf8ToB64('hello world');
      expect(b64).to.equal('aGVsbG8gd29ybGQ=');
    });

    it('Converts Base 64 to UTF-8', () => {
      const b64 = utils.b64ToUtf8('aGVsbG8gd29ybGQ=');
      expect(b64).to.equal('hello world');
    });

    it('Successfully dies parsing a bad config', () => {
      utils.parseEncodedConfig('error');
      // eslint-disable-next-line no-console
      expect(console.log.args[0][0].name).to.equal('InvalidCharacterError');
    });

    it('Decorates no nav', async () => {
      const headerMeta = utils.createTag('meta', { name: 'header', content: 'off' });
      const footerMeta = utils.createTag('meta', { name: 'footer', content: 'off' });
      document.head.append(headerMeta, footerMeta);
      await utils.loadArea();
      expect(document.querySelector('header')).to.not.exist;
      expect(document.querySelector('footer')).to.not.exist;
    });

    it('Decorates placeholder', () => {
      const paragraphs = [...document.querySelectorAll('p')];
      const lastPara = paragraphs.pop();
      expect(lastPara.textContent).to.equal(' inkl. MwSt.');
      const plceholderhref = document.querySelector('.placeholder');
      const hrefValue = plceholderhref.getAttribute('href');
      expect(hrefValue).to.equal('tel:phone number substance');
    });

    it('Decorates meta helix url', () => {
      const meta = document.head.querySelector('[name="hlx-url"]');
      expect(meta.content).to.equal('http://localhost:2000/otis');
    });

    it('Adds an event listener for modal:open', async () => {
      const meta = document.createElement('meta');
      meta.name = '-milo';
      meta.content = 'http://localhost:2000/test/blocks/modals/mocks/milo';
      document.head.append(meta);
      const event = new CustomEvent('modal:open', { detail: { hash: '#milo' } });
      window.dispatchEvent(event);
      await waitForElement('#milo');
      expect(document.getElementById('milo')).to.exist;
    });

    it('getLocale default return', () => {
      expect(utils.getLocale().ietf).to.equal('en-US');
    });

    it('getLocale for different paths', () => {
      const locales = {
        '': { ietf: 'en-US', tk: 'hah7vzn.css' },
        langstore: { ietf: 'en-US', tk: 'hah7vzn.css' },
        be_fr: { ietf: 'fr-BE', tk: 'vrk5vyv.css' },
      };

      function validateLocale(path, expectedOutput) {
        const locale = utils.getLocale(locales, path);
        expect(locale.prefix).to.equal(expectedOutput.prefix);
        expect(locale.ietf).to.equal(expectedOutput.ietf);
        expect(locale.tk).to.equal(expectedOutput.tk);
      }

      validateLocale('/', { prefix: '', ietf: 'en-US', tk: 'hah7vzn.css' });
      validateLocale('/page', { prefix: '', ietf: 'en-US', tk: 'hah7vzn.css' });
      validateLocale('/be_fr', { prefix: '/be_fr', ietf: 'fr-BE', tk: 'vrk5vyv.css' });
      validateLocale('/be_fr/page', { prefix: '/be_fr', ietf: 'fr-BE', tk: 'vrk5vyv.css' });
      validateLocale('/langstore/lv', { prefix: '/langstore/lv', ietf: 'en-US', tk: 'hah7vzn.css' });
      validateLocale('/langstore/lv/page', { prefix: '/langstore/lv', ietf: 'en-US', tk: 'hah7vzn.css' });
    });

    it('Open link in new tab', () => {
      const newTabLink = document.querySelector('.new-tab');
      newTabLink.target = '_blank';
      expect(newTabLink.target).to.contain('_blank');
      newTabLink.href = newTabLink.href.replace('#_blank', '');
      expect(newTabLink.href).to.equal('https://www.adobe.com/test');
    });
    it('Should send analytics alloy event', async () => {
      window._satellite = { track: sinon.spy() };
      const alloyMarquee = await readFile({ path: './mocks/body-marquee-alloy-cta.html' });
      document.body.innerHTML = alloyMarquee;
      await waitForElement('.marquee');
      const marquee = document.querySelector('.marquee');
      const alloyLink = marquee.querySelector('a');
      const alloyString = alloyLink.href.split('#_')?.find((s) => s.startsWith('alloy:'));
      expect(alloyLink.href).to.contain('#_alloy:');
      utils.decorateLinks(marquee);
      waitFor(() => {
        expect(alloyLink.href).to.not.contain('#_alloy:');
        alloyLink.click();
        const [, profile, business, value] = alloyString.split(/:|\./g);
        expect(window._satellite.track.calledOnce).to.be.true;
        const eventName = window._satellite.track.args[0][0];
        const eventPayload = window._satellite.track.args[0][1];
        expect(eventName).to.equal('event');
        // eslint-disable-next-line no-underscore-dangle
        expect(eventPayload.data.__adobe.target).to.deep.equal({ [`${profile}.${business}`]: value });
      }, 10);
    });
    it('Add rel=nofollow to a link', () => {
      const noFollowContainer = document.querySelector('main div');
      utils.decorateLinks(noFollowContainer);
      const noFollowLink = noFollowContainer.querySelector('.no-follow');
      expect(noFollowLink.rel).to.contain('nofollow');
      expect(noFollowLink.href).to.equal('https://www.adobe.com/test');
    });

    it('Add data-attribute "data-http-link" if http shceme found', () => {
      const linksContainer = document.querySelector('main div');
      utils.decorateLinks(linksContainer);
      const httpLink = linksContainer.querySelector('[data-http-link]');
      expect(httpLink.dataset.httpLink).to.equal('true');
    });

    it('Sets up milo.deferredPromise', async () => {
      const { resolveDeferred } = utils.getConfig();
      expect(window.milo.deferredPromise).to.exist;
      utils.loadDeferred(document, [], {}, resolveDeferred);
      const result = await window.milo.deferredPromise;
      expect(result).to.be.true;
    });

    describe('SVGs', () => {
      it('Not a valid URL', () => {
        document.body.innerHTML = '<div class="bad-url">https://www.adobe.com/test</div>';
        const a = document.querySelector('.bad-url');
        try {
          // eslint-disable-next-line no-new
          new URL(a.textContent);
        } catch (err) {
          expect(err.message).to.equal("Failed to construct 'URL': Invalid URL");
        }
      });
    });

    describe('rtlSupport', () => {
      before(async () => {
        config.locales = {
          '': { ietf: 'en-US', tk: 'hah7vzn.css' },
          africa: { ietf: 'en', tk: 'pps7abe.css' },
          il_he: { ietf: 'he', tk: 'nwq1mna.css', dir: 'rtl' },
          langstore: { ietf: 'en-US', tk: 'hah7vzn.css' },
          mena_ar: { ietf: 'ar', tk: 'dis2dpj.css', dir: 'rtl' },
          ua: { tk: 'aaz7dvd.css' },
        };
      });

      function setConfigWithPath(path) {
        document.documentElement.removeAttribute('dir');
        config.pathname = path;
        utils.setConfig(config);
      }

      it('LTR Languages have dir as ltr', () => {
        setConfigWithPath('/africa/solutions');
        expect(document.documentElement.getAttribute('dir')).to.equal('ltr');
      });

      it('LTR Languages have dir as ltr for langstore path', () => {
        setConfigWithPath('/langstore/en/solutions');
        expect(document.documentElement.getAttribute('dir')).to.equal('ltr');
      });

      it('RTL Languages have dir as rtl', () => {
        setConfigWithPath('/il_he/solutions');
        expect(document.documentElement.getAttribute('dir')).to.equal('rtl');
        setConfigWithPath('/mena_ar/solutions');
        expect(document.documentElement.getAttribute('dir')).to.equal('rtl');
      });

      it('RTL Languages have dir as rtl for langstore path', () => {
        setConfigWithPath('/langstore/he/solutions');
        expect(document.documentElement.getAttribute('dir')).to.equal('rtl');
        setConfigWithPath('/langstore/ar/solutions');
        expect(document.documentElement.getAttribute('dir')).to.equal('rtl');
      });

      it('Gracefully dies when locale ietf is missing and dir is not set.', () => {
        setConfigWithPath('/ua/solutions');
        expect(document.documentElement.getAttribute('dir')).to.equal('ltr');
      });
    });

    describe('localizeLink', () => {
      before(() => {
        config.locales = {
          '': { ietf: 'en-US', tk: 'hah7vzn.css' },
          fi: { ietf: 'fi-FI', tk: 'aaz7dvd.css' },
          be_fr: { ietf: 'fr-BE', tk: 'vrk5vyv.css' },
          langstore: { ietf: 'en-US', tk: 'hah7vzn.css' },
        };
        config.prodDomains = ['milo.adobe.com', 'www.adobe.com'];
        config.pathname = '/be_fr/page';
        utils.setConfig(config);
      });

      function setConfigPath(path) {
        config.pathname = path;
        utils.setConfig(config);
      }
      it('Same domain link is relative and localized', () => {
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/gnav/solutions', 'main--milo--adobecom.hlx.page')).to.equal('/be_fr/gnav/solutions');
      });

      it('Same domain fragment link is relative and localized', () => {
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/fragments/gnav/solutions', 'main--milo--adobecom.hlx.page')).to.equal('/be_fr/fragments/gnav/solutions');
      });

      it('Same domain langstore link is relative and localized', () => {
        setConfigPath('/langstore/fr/page');
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/gnav/solutions', 'main--milo--adobecom.hlx.page')).to.equal('/langstore/fr/gnav/solutions');
        setConfigPath('/be_fr/page');
      });

      it('Same domain extensions /, .html, .json are handled', () => {
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/gnav/solutions.html', 'main--milo--adobecom.hlx.page')).to.equal('/be_fr/gnav/solutions.html');
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/gnav/solutions.json', 'main--milo--adobecom.hlx.page')).to.equal('/be_fr/gnav/solutions.json');
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/gnav/solutions/', 'main--milo--adobecom.hlx.page')).to.equal('/be_fr/gnav/solutions/');
      });

      it('Same domain link that is already localized is returned as relative', () => {
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/be_fr/gnav/solutions', 'main--milo--adobecom.hlx.page')).to.equal('/be_fr/gnav/solutions');
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/fi/gnav/solutions', 'main--milo--adobecom.hlx.page')).to.equal('/fi/gnav/solutions');
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/fi', 'main--milo--adobecom.hlx.page')).to.equal('/fi');
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/langstore/fr/gnav/solutions', 'main--milo--adobecom.hlx.page')).to.equal('/langstore/fr/gnav/solutions');
      });

      it('Same domain PDF link is returned as relative and not localized', () => {
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/gnav/solutions.pdf', 'main--milo--adobecom.hlx.page')).to.equal('/gnav/solutions.pdf');
      });

      it('Same domain link with #_dnt is returned as relative, #_dnt is removed and not localized', () => {
        expect(utils.localizeLink('https://main--milo--adobecom.hlx.page/gnav/solutions#_dnt', 'main--milo--adobecom.hlx.page'))
          .to
          .equal('/gnav/solutions');
      });

      it('Live domain html link  is absolute and localized', () => {
        expect(utils.localizeLink('https://milo.adobe.com/solutions/customer-experience-personalization-at-scale.html', 'main--milo--adobecom.hlx.page'))
          .to
          .equal('https://milo.adobe.com/be_fr/solutions/customer-experience-personalization-at-scale.html');
        expect(utils.localizeLink('https://www.adobe.com/solutions/customer-experience-personalization-at-scale.html', 'main--milo--adobecom.hlx.page'))
          .to
          .equal('https://www.adobe.com/be_fr/solutions/customer-experience-personalization-at-scale.html');
      });

      it('Live domain html link which is not in prod domains is absolute and localized', () => {
        expect(utils.localizeLink('https://test.adobe.com/solutions/customer-experience-personalization-at-scale.html', window.location.hostname, true))
          .to
          .equal('https://test.adobe.com/be_fr/solutions/customer-experience-personalization-at-scale.html');
        expect(utils.localizeLink('https://test.adobe.com/solutions/customer-experience-personalization-at-scale.html', window.location.hostname, true))
          .to
          .equal('https://test.adobe.com/be_fr/solutions/customer-experience-personalization-at-scale.html');
      });

      it('Live domain html link with #_dnt is left absolute, not localized and #_dnt is removed', () => {
        expect(utils.localizeLink('https://milo.adobe.com/solutions/customer-experience-personalization-at-scale.html#_dnt', 'main--milo--adobecom.hlx.page'))
          .to
          .equal('https://milo.adobe.com/solutions/customer-experience-personalization-at-scale.html');
      });

      it('Invalid href fails gracefully', () => {
        expect(utils.localizeLink('not-a-url', 'main--milo--adobecom.hlx.page'))
          .to
          .equal('not-a-url');
      });
    });

    it('creates an IntersectionObserver', (done) => {
      const block = document.createElement('div');
      block.id = 'myblock';
      block.innerHTML = '<div>hello</div>';
      document.body.appendChild(block);
      const io = utils.createIntersectionObserver({
        el: block,
        options: { rootMargin: '10000px' },
        callback: (target) => {
          expect(target).to.equal(block);
          done();
        },
      });
      expect(io instanceof IntersectionObserver).to.be.true;
    });

    it('should remove any blocks with the hide-block class from the DOM', async () => {
      document.body.innerHTML = await readFile({ path: './mocks/body.html' });
      const hiddenQuoteBlock = document.querySelector('.quote.hide-block');
      expect(hiddenQuoteBlock).to.exist;
      const block = await utils.loadBlock(hiddenQuoteBlock);
      expect(block).to.be.null;
      expect(document.querySelector('.quote.hide-block')).to.be.null;
    });
  });

  describe('stageDomainsMap', () => {
    it('should convert links when stageDomainsMap provided without regex', async () => {
      const stageConfig = {
        ...config,
        locale: { prefix: '/ae_ar' },
        env: { name: 'stage' },
        stageDomainsMap,
      };

      Object.entries(stageDomainsMap).forEach(([hostname, domainsMap]) => {
        const anchors = Object.keys(domainsMap).map((d) => utils.createTag('a', { href: `https://${d}` }));
        const localizedAnchors = Object.keys(domainsMap).map((d) => utils.createTag('a', { href: `https://${d}/ae_ar` }));
        const externalAnchors = externalDomains.map((url) => utils.createTag('a', { href: url }));

        utils.convertStageLinks({
          anchors: [...anchors, ...localizedAnchors, ...externalAnchors],
          config: stageConfig,
          hostname,
          href: `https://${hostname}`,
        });

        anchors.forEach((a, index) => {
          const expectedDomain = Object.values(domainsMap)[index];
          expect(a.href).to.contain(expectedDomain === 'origin' ? hostname : expectedDomain);
        });

        externalAnchors.forEach((a) => expect(a.href).to.equal(a.href));
      });
    });

    it('should convert links when stageDomainsMap provided with regex', async () => {
      const { hostname, map } = stageDomainsMapWRegex;
      const stageConfigWRegex = {
        ...config,
        locale: { prefix: '/de' },
        env: { name: 'stage' },
        stageDomainsMap: map,
      };

      Object.entries(map).forEach(([, domainsMap]) => {
        const anchors = Object.keys(domainsMap).map((d) => utils.createTag('a', { href: d.replace('^', '') }));
        const localizedAnchors = Object.keys(domainsMap).map((d) => {
          const convertedUrl = new URL(d.replace('^', ''));
          convertedUrl.pathname = `de/${convertedUrl.pathname}`;
          return utils.createTag('a', { href: convertedUrl.toString() });
        });
        const externalAnchors = externalDomains.map((url) => utils.createTag('a', { href: url }));

        utils.convertStageLinks({
          anchors: [...anchors, ...localizedAnchors, ...externalAnchors],
          config: stageConfigWRegex,
          hostname,
          href: `https://${hostname}`,
        });

        anchors.forEach((a, index) => {
          const expectedDomain = Object.values(domainsMap)[index];
          expect(a.href).to.contain(expectedDomain === 'origin' ? hostname : expectedDomain);
        });

        externalAnchors.forEach((a) => expect(a.href).to.equal(a.href));
      });
    });

    it('should not convert links when no stageDomainsMap provided', async () => {
      const stageConfig = {
        ...config,
        env: { name: 'stage' },
      };

      Object.entries(stageDomainsMap).forEach(([hostname, domainsMap]) => {
        const anchors = Object.keys(domainsMap).map((d) => utils.createTag('a', { href: `https://${d}` }));
        const externalAnchors = externalDomains.map((url) => utils.createTag('a', { href: url }));

        utils.convertStageLinks({
          anchors: [...anchors, ...externalAnchors],
          config: stageConfig,
          hostname,
        });

        [...anchors, ...externalAnchors].forEach((a) => expect(a.href).to.equal(a.href));
      });
    });

    it('should remove extensions upon conversion', async () => {
      const stageConfig = {
        ...config,
        env: { name: 'stage' },
        stageDomainsMap,
      };

      Object.entries(stageDomainsMap).forEach(([hostname, domainsMap]) => {
        const extension = '.html';
        const anchors = Object.keys(domainsMap).map((d) => utils.createTag('a', { href: `https://${d}/abc${extension}` }));

        utils.convertStageLinks({
          anchors: [...anchors],
          config: stageConfig,
          hostname,
        });

        anchors.forEach((a) => {
          if (/\.page|\.live/.test(a.href)) {
            expect(a.href).to.not.contain(extension);
          } else {
            expect(a.href).to.contain(extension);
          }
        });
      });
    });

    it('should not convert links on prod', async () => {
      const prodConfig = {
        ...config,
        env: { name: 'prod' },
        stageDomainsMap,
      };

      prodDomains.forEach((hostname) => {
        const anchors = prodDomains.map((d) => utils.createTag('a', { href: `https://${d}` }));
        const externalAnchors = externalDomains.map((url) => utils.createTag('a', { href: url }));

        utils.convertStageLinks({
          anchors: [...anchors, ...externalAnchors],
          config: prodConfig,
          hostname,
        });

        [...anchors, ...externalAnchors].forEach((a) => expect(a.href).to.equal(a.href));
      });
    });
  });

  // MARK: title-append
  describe('title-append', async () => {
    beforeEach(async () => {
      document.head.innerHTML = await readFile({ path: './mocks/head-title-append.html' });
      document.body.innerHTML = body;
    });
    it('should append to title using string from metadata', async () => {
      const expected = 'Document Title NOODLE';
      await utils.loadArea();
      expect(document.title).to.equal(expected);
      expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content'), expected);
      expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'), expected);
    });
  });

  // MARK: seotech
  describe('seotech', async () => {
    beforeEach(async () => {
      window.lana = { log: sinon.stub() };
      document.head.innerHTML = await readFile({ path: './mocks/head-seotech-video.html' });
      document.body.innerHTML = body;
    });
    afterEach(() => {
      window.lana?.log?.restore?.();
      delete window.lana;
    });
    it('should import feature when metadata is defined and error if invalid', async () => {
      const expectedError = 'SEOTECH: Video object operation failed ¶ videoUrl:FAKE';
      await utils.loadArea();
      await waitFor(() => window.lana.log.calledWith(expectedError), 2000);
      expect(window.lana.log.calledWith(expectedError)).to.be.true;
    });
  });

  describe('scrollToHashedElement', () => {
    before(() => {
      const div = document.createElement('div');
      div.className = 'global-navigation';
      document.body.appendChild(div);
      window.location.hash = '#not-block';
      window.scrollBy = () => { };
    });

    it('should scroll to the hashed element', () => {
      let scrollToCalled = false;
      window.scrollTo = () => {
        scrollToCalled = true;
      };

      utils.scrollToHashedElement('#not-block');
      expect(scrollToCalled).to.be.true;
      expect(document.getElementById('not-block')).to.exist;
    });

    it('should not scroll if no hash is present', () => {
      window.location.hash = '';
      let scrollToCalled = false;
      window.scrollBy = () => {
        scrollToCalled = true;
      };
      utils.scrollToHashedElement('');
      expect(scrollToCalled).to.be.false;
    });

    it('should scroll to the hashed element with special character', () => {
      let scrollToCalled = false;
      window.scrollTo = () => {
        scrollToCalled = true;
      };

      utils.scrollToHashedElement('#tools-f%C3%BCr-das-verhalten');
      expect(scrollToCalled).to.be.true;
      expect(document.getElementById('tools-für-das-verhalten')).to.exist;
    });
  });

  describe('useDotHtml', async () => {
    beforeEach(async () => {
      window.lana = { log: (msg) => console.error(msg) };
      document.body.innerHTML = await readFile({ path: './mocks/useDotHtml.html' });
    });
    afterEach(() => {
      window.lana.release?.();
    });
    it('should add .html to relative links when enabled', async () => {
      utils.setConfig({ useDotHtml: true, htmlExclude: [/exclude\/.*/gm] });
      expect(utils.getConfig().useDotHtml).to.be.true;
      await utils.decorateLinks(document.getElementById('linklist'));
      expect(document.getElementById('excluded')?.getAttribute('href'))
        .to.equal('/exclude/this/page');
      const htmlLinks = document.querySelectorAll('.has-html');
      htmlLinks.forEach((link) => {
        expect(link.href).to.contain('.html');
      });
    });

    it('should not add .html to relative links when disabled', async () => {
      utils.setConfig({ useDotHtml: false, htmlExclude: [/exclude\/.*/gm] });
      expect(utils.getConfig().useDotHtml).to.be.false;
      await utils.decorateLinks(document.getElementById('linklist'));
      expect(document.getElementById('excluded')?.getAttribute('href'))
        .to.equal('/exclude/this/page');
      const htmlLinks = document.querySelectorAll('.has-html');
      htmlLinks.forEach((link) => {
        expect(link.href).to.not.contain('.html');
      });
    });
  });

  describe('footer promo', () => {
    const favicon = '<link rel="icon" href="data:,">';
    const typeTaxonomy = '<meta name="footer-promo-type" content="taxonomy">';
    const ccxVideo = '<meta name="footer-promo-tag" content="ccx-video-links">';
    const analytics = '<meta property="article:tag" content="Analytics">';
    const commerce = '<meta property="article:tag" content="Commerce">';
    const summit = '<meta property="article:tag" content="Summit">';
    let oldHead;
    let promoBody;
    let taxonomyData;

    before(async () => {
      oldHead = document.head.innerHTML;
      promoBody = await readFile({ path: './mocks/body-footer-promo.html' });
      taxonomyData = await readFile({ path: './mocks/taxonomy.json' });
    });

    beforeEach(() => {
      document.body.innerHTML = promoBody;
      window.fetch = mockFetch({ payload: JSON.parse(taxonomyData) });
    });

    afterEach(() => {
      window.fetch = ogFetch;
    });

    after(() => {
      document.head.innerHTML = oldHead;
    });

    it('loads from metadata', async () => {
      document.head.innerHTML = favicon + ccxVideo;
      await utils.decorateFooterPromo();
      const a = document.querySelector('main > div:last-of-type a');
      expect(a.href).includes('/fragments/footer-promos/ccx-video-links');
    });

    it('loads from taxonomy in order on sheet', async () => {
      document.head.innerHTML = ccxVideo + typeTaxonomy + analytics + commerce + summit;
      await utils.decorateFooterPromo();
      const a = document.querySelector('main > div:last-of-type a');
      expect(a.href).includes('/fragments/footer-promos/commerce');
    });

    it('loads backup from tag when taxonomy has no promo', async () => {
      document.head.innerHTML = ccxVideo + typeTaxonomy + summit;
      await utils.decorateFooterPromo();
      const a = document.querySelector('main > div:last-of-type a');
      expect(a.href).includes('/fragments/footer-promos/ccx-video-links');
    });
  });

  describe('createTag', async () => {
    /**
       * create tag creates a tag from first parameter tag name,
       * second parameter is requested attributes map in created tag,
       * third parameter is the innerHTML of the tag, can be either node or text,
       * fourth parameter is an object of creation options:
       *  - @parent parent element to append the tag to.
       */
    createTag('var', { class: 'foo' }, 'bar', { parent: document.body });
    const varTag = document.querySelector('body > var.foo');
    expect(varTag).to.exist;
    expect(varTag.textContent).to.equal('bar');
  });

  describe('personalization', async () => {
    const MANIFEST_JSON = {
      info: { total: 2, offset: 0, limit: 2, data: [{ key: 'manifest-type', value: 'Personalization' }, { key: 'manifest-override-name', value: '' }, { key: 'name', value: '1' }] }, placeholders: { total: 0, offset: 0, limit: 0, data: [] }, experiences: { total: 1, offset: 0, limit: 1, data: [{ action: 'insertContentAfter', selector: '.marquee', 'page filter (optional)': '/products/special-offers', chrome: 'https://main--milo--adobecom.hlx.page/drafts/mariia/fragments/personalizationtext' }] }, ':version': 3, ':names': ['info', 'placeholders', 'experiences'], ':type': 'multi-sheet',
    };
    function htmlResponse() {
      return new Promise((resolve) => {
        resolve({
          ok: true,
          json: () => MANIFEST_JSON,
        });
      });
    }

    it('should process personalization manifest and save in config', async () => {
      window.fetch = sinon.stub().returns(htmlResponse());
      document.head.innerHTML = await readFile({ path: './mocks/head-personalization.html' });
      await utils.loadArea();
      const resultConfig = utils.getConfig();
      const resultExperiment = resultConfig.mep.experiments[0];
      expect(resultConfig.mep.preview).to.be.true;
      expect(resultConfig.mep.experiments.length).to.equal(3);
      expect(resultExperiment.manifest).to.equal('/products/special-offers-manifest.json');
    });
  });

  describe('filterDuplicatedLinkBlocks', () => {
    it('returns empty array if receives invalid params', () => {
      expect(utils.filterDuplicatedLinkBlocks()).to.deep.equal([]);
    });

    it('removes duplicated link-blocks', () => {
      const block1 = document.createElement('div');
      block1.classList.add('modal');
      block1.setAttribute('data-modal-hash', 'modalHash1');
      block1.setAttribute('data-modal-path', 'modalPath1');
      const block2 = document.createElement('div');
      block2.classList.add('modal');
      block2.setAttribute('data-modal-hash', 'modalHash2');
      block2.setAttribute('data-modal-path', 'modalPath2');
      const block3 = document.createElement('div');
      block3.classList.add('modal');
      block3.setAttribute('data-modal-hash', 'modalHash2');
      block3.setAttribute('data-modal-path', 'modalPath2');
      const blocks = [block1, block2, block3];
      expect(utils.filterDuplicatedLinkBlocks(blocks)).to.deep.equal([block1, block2]);
    });
  });

  describe('localNav', async () => {
    it('Preserving space to avoid CLS issue', async () => {
      document.body.innerHTML = body;
      const footer = document.createElement('footer');
      footer.innerHTML = '<p>Footer Content</p>';
      document.body.appendChild(footer);
      document.head.innerHTML = await readFile({ path: './mocks/head-localNav.html' });
      document.body.appendChild(document.createElement('header'));
      await utils.loadArea();
      console.log(document.querySelector('.feds-localnav'));
      expect(document.querySelector('.feds-localnav')).to.exist;
    });
  });

  describe('loadFooter', async () => {
    it('Should load if footer meta is not off', async () => {
      const footer = document.createElement('footer');
      footer.innerHTML = '<p>Footer Content</p>';
      document.body.appendChild(footer);
      await utils.loadArea();
      expect(document.querySelector('footer')).to.exist;
    });
    it('Should load if footer is  off', async () => {
      const metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'footer');
      metaTag.setAttribute('content', 'off');
      document.head.appendChild(metaTag);

      const footer = document.createElement('footer');
      footer.innerHTML = '<p>Footer Content</p>';
      document.body.appendChild(footer);
      await utils.loadArea();
      expect(document.querySelector('footer')).to.exist;

      metaTag.setAttribute('name', 'footer');
      metaTag.setAttribute('content', 'on');
      document.head.appendChild(metaTag);
    });
  });
  describe('isTrustedAutoBlock', () => {
    const { origin } = window.location;
    const autoBlocks = [
      ['tv.adobe.com', 'https://tv.adobe.com/v1/123', true],
      ['tv.adobe.com', 'https://tv.notadobe.com/v1/123', false],
      ['tv.adobe.com', 'https://tv.notadobe.com/v1/123?url=tv.adobe.com/v1/123', false],
      ['gist.github.com', 'https://gist.github.com/valid-gist', true],
      ['gist.github.com', 'https://gist.github-not.com/invalid-gist', false],
      ['/tools/caas', `${origin}/tools/caas`, true],
      ['/tools/caas', 'https://adobe.com/tools/caas', true],
      ['/tools/caas', 'https://unknown-origin.com/tools/caas', false],
      ['/tools/faas', `${origin}/tools/faas`, true],
      ['/tools/faas', 'https://unknown-origin.com/tools/faas', false],
      ['/tools/faas', 'https://fake-adobe.com/tools/faas', false],
      ['/tools/faas', 'https://adobe.com/tools/faas', true],
      ['/fragments/', `${origin}/fragments/test`, true],
      ['/fragments/', 'https://adobe.com/fragments/test', true],
      ['/fragments/', 'https://unknown-origin.com/fragments/test', false],
      ['instagram.com', 'https://www.instagram.com/test', true],
      ['instagram.com', 'https://not-instagram.com/test', false],
      ['slideshare.net', 'https://slideshare.net', true],
      ['slideshare.net', 'https://not-slideshare.net', false],
      ['tiktok.com', 'https://www.tiktok.com/test-test', true],
      ['tiktok.com', 'https://tiktok-not.com/test-test', false],
      ['twitter.com', 'https://twitter.com/test', true],
      ['twitter.com', 'https://not-twitter.com/test', false],
      ['vimeo.com', 'https://vimeo.com/test', true],
      ['vimeo.com', 'https://fake-vimeo.com/test', false],
      ['player.vimeo.com', 'https://player.vimeo.com/test', true],
      ['player.vimeo.com', 'https://false-player.vimeo.com/test', false],
      ['youtube.com', 'https://www.youtube.com/test', true],
      ['youtube.com', 'https://www.not-youtube.com/test', false],
      ['youtu.be', 'https://youtu.be/test', true],
      ['youtu.be', 'https://fake-youtu.be/test', false],
      ['.pdf', 'https://adobe.com/test.pdf', true],
      ['.pdf', 'https://other-website.com/test.pdf', true],
      ['.mp4', `${origin}/media_1234.mp4`, true],
      ['.mp4', `${origin}/media_1234.mp3`, false],
      ['.mp4', 'https://fake-website.com/media_1234.mp4', false],
      ['.mp4', 'https://main--milo--adobecom.hlx.page/media_1234.mp4', true],
      ['.mp4', 'https://main--milo--adobecom.hlx.live/media_1234.mp4', true],
      ['.mp4', 'https://main--milo--adobecom.aem.page/media_1234.mp4', true],
      ['.mp4', 'https://main--milo--adobecom.aem.live/media_1234.mp4', true],
      ['.mp4', 'https://adobe.com/media_1234.mp4', true],
      ['/tools/ost?', `${origin}/tools/ost?test=test`, true],
      ['/tools/ost?', 'https://adobe.com/tools/ost?test=test', true],
      ['/tools/ost?', 'https://fake-website.com/tools/ost?test=test', false],
      ['mas.adobe.com/studio', 'https://mas.adobe.com/studio', true],
      ['mas.adobe.com/studio', 'https://mas.not-adobe.com/studio', false],
      ['/miniplans', `${origin}/miniplans`, true],
      ['/miniplans', 'https://adobe.com/miniplans', true],
      ['/miniplans', 'https://fake-website.com/miniplans', false],
      ['/creativecloud/business-plans.html', `${origin}/creativecloud/business-plans.html`, true],
      ['/creativecloud/business-plans.html', 'https://adobe.com/creativecloud/business-plans.html', true],
      ['/creativecloud/business-plans.html', 'https://fake-website/creativecloud/business-plans.html', false],
      ['/creativecloud/education-plans.html', `${origin}/creativecloud/education-plans.html`, true],
      ['/creativecloud/education-plans.html', 'https://adobe.com/creativecloud/education-plans.html', true],
      ['/creativecloud/education-plans.html', 'https://fake-website/creativecloud/education-plans.html', false],
      ['not-block', 'https://example.com', false],
    ];
    it('Should return true if autoblock has trusted source', () => {
      autoBlocks.forEach(([block, url, isValid]) => {
        const isValidAutoBlock = utils.isTrustedAutoBlock(block, new URL(url));
        expect(isValidAutoBlock).to.be[isValid];
      });
    });
  });

  describe('Localization Logic', () => {
    // Base config with common properties
    const baseConfig = {
      locales: { '': { ietf: 'en-US', tk: 'hah7vzn.css' } },
      prodDomains: ['news.adobe.com'],
      contentRoot: '/root',
    };

    // --- Tests for localizeLink ---
    describe('localizeLink', () => {
      it('uses locale prefix when no language-based logic applies', () => {
        utils.setConfig({
          ...baseConfig,
          pathname: '/de/',
          locales: {
            ...baseConfig.locales,
            de: { ietf: 'de-DE', tk: 'hah7vzn.css' },
          },
        });
        const href = 'https://examplesite.com/path';
        const result = utils.localizeLink(href, 'examplesite.com');
        expect(utils.getConfig().locale.prefix).to.equal('/de');
        expect(result).to.equal('/de/path');
      });

      it('adjusts prefix to locale when no site match', () => {
        utils.setConfig({
          ...baseConfig,
          pathname: '/ch_de/',
          languages: {
            de: {
              ietf: 'de',
              tk: 'hah7vzn.css',
              regions: [{ region: 'ch', ietf: 'de-CH', tk: 'hah7vzn.css' }],
            },
          },
          locales: {
            ...baseConfig.locales,
            ch_de: { ietf: 'ch-DE', tk: 'hah7vzn.css' },
          },
        });
        const href = 'https://othersite.com/path';
        const result = utils.localizeLink(href, 'othersite.com');
        expect(utils.getConfig().locale.prefix).to.equal('/ch_de');
        expect(utils.getConfig().locale.language).to.be.undefined;
        expect(result).to.equal('/ch_de/path');
      });

      it('keeps language-based prefix when site matches and language is valid', async () => {
        const mockConfig = {
          'locale-to-language-map': { data: [] },
          'site-languages': {
            data: [
              {
                domainMatches: 'news.adobe.com\n--news--adobecom.',
                languages: 'en\nen/gb\nde',
              },
            ],
          },
        };
        window.fetch = async () => ({
          ok: true,
          json: () => Promise.resolve(mockConfig),
        });
        utils.setConfig({
          ...baseConfig,
          pathname: '/en/gb/',
          languages: {
            en: {
              ietf: 'en',
              tk: 'hah7vzn.css',
              regions: [{ region: 'gb', ietf: 'en-GB', tk: 'hah7vzn.css' }],
            },
          },
        });
        await utils.loadLanguageConfig();
        const href = 'https://news.adobe.com/path';
        const result = utils.localizeLink(href, 'news.adobe.com');
        expect(utils.getConfig().locale.prefix).to.equal('/en/gb');
        expect(utils.getConfig().locale.language).to.equal('en');
        expect(result).to.equal('/en/gb/path');
      });

      it('maps to locale prefix when site matches but language is invalid', async () => {
        const mockConfig = {
          'locale-to-language-map': { data: [{ locale: 'ch_de', languagePath: 'de/ch' }] },
          'site-languages': {
            data: [
              {
                domainMatches: 'news.adobe.com\n--news--adobecom.',
                languages: 'en\nfr',
              },
            ],
          },
        };
        window.fetch = async () => ({
          ok: true,
          json: () => Promise.resolve(mockConfig),
        });
        utils.setConfig({
          ...baseConfig,
          pathname: '/de/ch/',
          languages: {
            de: {
              ietf: 'de',
              tk: 'hah7vzn.css',
              regions: [{ region: 'ch', ietf: 'de-CH', tk: 'hah7vzn.css' }],
            },
          },
          locales: {
            ...baseConfig.locales,
            ch_de: { ietf: 'de-CH', tk: 'hah7vzn.css' },
          },
        });
        await utils.loadLanguageConfig();
        const href = 'https://news.adobe.com/path';
        const result = utils.localizeLink(href);
        expect(utils.getConfig().locale.prefix).to.equal('/de/ch');
        expect(utils.getConfig().locale.language).to.equal('de');
        expect(result).to.equal('https://news.adobe.com/ch_de/path');
      });

      it('uses locale prefix for non-language-based when site matches but no language', async () => {
        const mockConfig = {
          'locale-to-language-map': { data: [{ locale: 'ch_de', languagePath: 'de/ch' }] },
          'site-languages': {
            data: [
              {
                domainMatches: 'news.adobe.com\n--news--adobecom.',
                languages: 'en\nfr',
              },
            ],
          },
        };
        window.fetch = async () => ({
          ok: true,
          json: () => Promise.resolve(mockConfig),
        });
        utils.setConfig({
          ...baseConfig,
          pathname: '/ch_de/',
          locales: {
            ...baseConfig.locales,
            ch_de: { ietf: 'de-CH', tk: 'hah7vzn.css' },
          },
        });
        await utils.loadLanguageConfig();
        const href = 'https://news.adobe.com/path';
        const result = utils.localizeLink(href, 'news.adobe.com');
        expect(utils.getConfig().locale.prefix).to.equal('/ch_de');
        expect(utils.getConfig().locale.language).to.be.undefined;
        expect(result).to.equal('/ch_de/path');
      });

      it('set correct prefix for US site with only language', async () => {
        utils.setConfig({
          pathname: '/',
          languages: { en: { tk: 'hah7vzn.css' } },
        });
        const href = '/path';
        const result = utils.localizeLink(href);
        expect(utils.getConfig().locale.prefix).to.equal('');
        expect(utils.getConfig().locale.language).to.equal('en');
        expect(result).to.equal('/path');
      });

      it('skips language logic on localhost', () => {
        utils.setConfig({
          ...baseConfig,
          pathname: '/de/ch/',
          languages: {
            de: {
              ietf: 'de',
              tk: 'hah7vzn.css',
              regions: [{ region: 'ch', ietf: 'de-CH', tk: 'hah7vzn.css' }],
            },
          },
          locales: {
            ...baseConfig.locales,
            ch_de: { ietf: 'de-CH', tk: 'hah7vzn.css' },
          },
        });
        const href = 'http://localhost/path';
        const result = utils.localizeLink(href);
        expect(utils.getConfig().locale.prefix).to.equal('/de/ch');
        expect(utils.getConfig().locale.language).to.equal('de');
        expect(result).to.equal('/de/ch/path');
      });
    });

    // --- Tests for hasLanguageLinks ---
    describe('hasLanguageLinks', () => {
      const testPaths = [
        'news.adobe.com',
        'adobe.com/express/',
        'adobe.com/**/express/',
        'adobe.com/**_**/express/',
      ];

      it('should return true for news.adobe.com links', () => {
        const link = createTag('a', { href: 'https://news.adobe.com/some/path' });
        const area = createTag('div', {}, link);
        expect(utils.hasLanguageLinks(area, testPaths)).to.be.true;
      });

      it('should return true for express links without locale', () => {
        const link = createTag('a', { href: 'https://adobe.com/express/' });
        const area = createTag('div', {}, link);
        expect(utils.hasLanguageLinks(area, testPaths)).to.be.true;
      });

      it('should return true for express links with two-letter locale', () => {
        const link = createTag('a', { href: 'https://adobe.com/de/express/' });
        const area = createTag('div', {}, link);
        expect(utils.hasLanguageLinks(area, testPaths)).to.be.true;
      });

      it('should return true for express links with locale_region', () => {
        const link = createTag('a', { href: 'https://adobe.com/de_de/express/' });
        const area = createTag('div', {}, link);
        expect(utils.hasLanguageLinks(area, testPaths)).to.be.true;
      });

      it('should return true for express links with uppercase locale', () => {
        const link = createTag('a', { href: 'https://adobe.com/DE/express/' });
        const area = createTag('div', {}, link);
        expect(utils.hasLanguageLinks(area, testPaths)).to.be.true;
      });

      it('should return true for express links with uppercase locale_region', () => {
        const link = createTag('a', { href: 'https://adobe.com/DE_DE/express/' });
        const area = createTag('div', {}, link);
        expect(utils.hasLanguageLinks(area, testPaths)).to.be.true;
      });

      it('should return false for non-matching express links', () => {
        const link = createTag('a', { href: 'https://adobe.com/other/express/' });
        const area = createTag('div', {}, link);
        expect(utils.hasLanguageLinks(area, testPaths)).to.be.false;
      });

      it('should return false for express links with invalid locale format', () => {
        const link = createTag('a', { href: 'https://adobe.com/123/express/' });
        const area = createTag('div', {}, link);
        expect(utils.hasLanguageLinks(area, testPaths)).to.be.false;
      });

      it('should return false for non-matching domains', () => {
        const link = createTag('a', { href: 'https://example.com/express/' });
        const area = createTag('div', {}, link);
        expect(utils.hasLanguageLinks(area, testPaths)).to.be.false;
      });

      it('should handle multiple links and return true if any match', () => {
        const area = createTag('div', {}, [
          createTag('a', { href: 'https://example.com/' }),
          createTag('a', { href: 'https://adobe.com/de/express/' }),
          createTag('a', { href: 'https://other.com/' }),
        ]);
        expect(utils.hasLanguageLinks(area, testPaths)).to.be.true;
      });

      it('should use default LANGUAGE_BASED_PATHS when no paths provided', () => {
        const link = createTag('a', { href: 'https://news.adobe.com/some/path' });
        const area = createTag('div', {}, link);
        expect(utils.hasLanguageLinks(area)).to.be.true;
      });
    });
  });
});
