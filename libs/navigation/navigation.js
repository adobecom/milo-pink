import { loadStyle } from '../utils/utils.js';

const blockConfig = [
  {
    key: 'header',
    name: 'global-navigation',
    targetEl: 'header',
    appendType: 'prepend',
    params: ['imsClientId', 'searchEnabled', 'unav', 'customLinks', 'jarvis', 'selfIntegrateUnav', 'miniGnav', 'desktopAppsCta'],
  },
  {
    key: 'footer',
    name: 'global-footer',
    targetEl: 'footer',
    appendType: 'appendChild',
    params: ['privacyId', 'privacyLoadDelay'],
  },
];

const envMap = {
  prod: 'https://www.adobe.com',
  stage: 'https://www.stage.adobe.com',
  qa: 'https://gnav--milo--adobecom.aem.page',
};

const getStageDomainsMap = (stageDomainsMap, env) => {
  const defaultUrls = {
    'www.adobe.com': 'origin',
    'helpx.adobe.com': 'helpx.stage.adobe.com',
    'creativecloud.adobe.com': 'stage.creativecloud.adobe.com',
  };

  const merged = { ...defaultUrls, ...stageDomainsMap };
  const domainMap = { 'www.stage.adobe.com': merged };

  if (env !== 'prod') {
    domainMap[window.location.host] = { ...merged, 'www.adobe.com': 'www.stage.adobe.com' };
  }

  return domainMap;
};

// Production Domain
const prodDomains = [
  'milo.adobe.com',
  'business.adobe.com',
  'www.adobe.com',
  'helpx.adobe.com',
  'stock.adobe.com',
  'adobecom.github.io',
];

function getParamsConfigs(configs) {
  return blockConfig.reduce((acc, block) => {
    block.params.forEach((param) => {
      const value = configs[block.key]?.[param];
      if (value !== undefined) {
        acc[param] = value;
      }
    });
    return acc;
  }, {});
}

/* eslint import/no-relative-packages: 0 */
export default async function loadBlock(configs, customLib) {
  const {
    header,
    footer,
    authoringPath,
    env = 'prod',
    locale = '',
    theme,
    stageDomainsMap = {},
    allowedOrigins = [],
  } = configs || {};
  if (!header && !footer) {
    // eslint-disable-next-line no-console
    console.error('Global navigation Error: header and footer configurations are missing.');
    return;
  }
  const branch = new URLSearchParams(window.location.search).get('navbranch');
  let miloLibs = branch ? `https://${branch}--milo--adobecom.aem.page` : customLib || envMap[env];
  const useLocal = new URLSearchParams(window.location.search).get('useLocal') || false;
  if (useLocal) {
    miloLibs = 'http://localhost:6456';
  }
  // The below css imports will fail when using the non-bundled standalone gnav
  // and fallback to using loadStyle. On the other hand, the bundler will rewrite
  // the css imports to attach the styles to the head (and point to the dist folder
  // using the custom StyleLoader plugin found in build.mjs
  try {
    await import('./base.css');
    if (theme === 'dark') {
      await import('./dark-nav.css');
    }
    await import('./navigation.css');
  } catch (e) {
    if (theme === 'dark') {
      loadStyle(`${miloLibs}/libs/navigation/base.css`, () => loadStyle(`${miloLibs}/libs/navigation/dark-nav.css`));
    } else {
      loadStyle(`${miloLibs}/libs/navigation/base.css`);
    }
    loadStyle(`${miloLibs}/libs/navigation/navigation.css`);
  }

  // Relative paths work just fine since they exist in the context of this file's origin
  const [
    { default: bootstrapBlock },
    { default: locales },
    { setConfig, getConfig }] = await Promise.all([
    import('./bootstrapper.js'),
    import('../utils/locales.js'),
    import('../utils/utils.js'),
  ]);
  const paramConfigs = getParamsConfigs(configs);
  const origin = (() => {
    switch (env) {
      case 'prod': return 'https://www.adobe.com';
      case 'stage': return 'https://www.stage.adobe.com';
      default: return 'https://main--federal--adobecom.aem.page';
    }
  })();
  const clientConfig = {
    theme,
    prodDomains,
    clientEnv: env,
    standaloneGnav: true,
    pathname: `/${locale}`,
    miloLibs: `${miloLibs}/libs`,
    locales: configs.locales || locales,
    contentRoot: authoringPath || footer?.authoringPath,
    stageDomainsMap: getStageDomainsMap(stageDomainsMap, env),
    origin,
    allowedOrigins: [...allowedOrigins, origin],
    onFooterReady: footer?.onReady,
    onFooterError: footer?.onError,
    ...paramConfigs,
  };
  setConfig(clientConfig);
  for await (const block of blockConfig) {
    const configBlock = configs[block.key];

    if (configBlock) {
      const config = getConfig();
      const gnavSource = `${config?.locale?.contentRoot}/gnav`;
      const footerSource = `${config?.locale?.contentRoot}/footer`;
      if (block.key === 'header') {
        try {
          const { default: init, closeGnavOptions } = await import('../blocks/global-navigation/global-navigation.js');
          await bootstrapBlock(init, {
            ...block,
            gnavSource,
            unavComponents: configBlock.selfIntegrateUnav ? [] : configBlock.unav?.unavComponents,
            redirect: configBlock.redirect,
            layout: configBlock.layout,
            noBorder: configBlock.noBorder,
            jarvis: configBlock.jarvis,
            isLocalNav: configBlock.isLocalNav,
            mobileGnavV2: configBlock.mobileGnavV2 || 'on',
          });
          window.closeGnav = closeGnavOptions;
          configBlock.onReady?.();
        } catch (e) {
          configBlock.onError?.(e);
          window.lana.log(`${e.message} | gnav-source: ${gnavSource} | href: ${window.location.href}`, {
            clientId: 'feds-milo',
            tags: 'standalone-gnav',
            errorType: e.errorType,
          });
        }
      }
      if (block.key === 'footer') {
        try {
          import('./footer.css').catch(() => loadStyle(`${miloLibs}/libs/navigation/footer.css`));
          const { default: init } = await import('../blocks/global-footer/global-footer.js');
          await bootstrapBlock(init, {
            ...block,
            footerSource,
            isContainerResponsive: configBlock.isContainerResponsive,
          });
        } catch (e) {
          configBlock.onError?.(e);
          window.lana.log(`${e.message} | footer-source: ${footerSource} | href: ${window.location.href}`, {
            clientId: 'feds-milo',
            tags: 'standalone-footer',
            errorType: e.errorType,
          });
        }
      }
    }
  }
}

window.loadNavigation = loadBlock;
