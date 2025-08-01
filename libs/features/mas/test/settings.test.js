import { Landscape, WCS_PROD_URL, WCS_STAGE_URL, PARAM_ENV, PARAM_LANDSCAPE, FF_DEFAULTS } from '../src/constants.js';
import { Defaults } from '../src/defaults.js';
import { Env } from '../src/constants.js';
import { getPreviewSurface, getSettings } from '../src/settings.js';

import { expect } from './utilities.js';

const mockService = {
  featureFlags: { [FF_DEFAULTS]: true },
};

describe('getSettings', () => {
    let href;

    after(() => {
        document.head.querySelectorAll('meta').forEach((meta) => meta.remove());
        window.history.replaceState({}, '', href);
    });

    afterEach(() => {
        window.sessionStorage.clear();
        window.history.replaceState({}, '', href);
    });

    before(() => {
        ({ href } = window.location);
    });

    it('returns default settings, if called without arguments', () => {
        expect(getSettings(undefined, mockService)).to.deep.equal({
            ...Defaults,
            locale: `${Defaults.language}_${Defaults.country}`,
            masIOUrl: 'https://www.adobe.com/mas/io',
            quantity: [Defaults.quantity],
        });
    });

    it('overrides with search parameters', () => {
        const checkoutClientId = 'adobe_com';
        const checkoutWorkflowStep = 'segmentation';
        const promotionCode = 'nicopromo';

        const url = new URL(window.location.href);
        url.searchParams.set('checkoutClientId', checkoutClientId);
        url.searchParams.set('checkoutWorkflowStep', checkoutWorkflowStep);
        url.searchParams.set('promotionCode', promotionCode);
        url.searchParams.set('displayOldPrice', 'false');
        url.searchParams.set('displayPerUnit', 'true');
        url.searchParams.set('displayRecurrence', 'false');
        url.searchParams.set('displayTax', 'true');
        url.searchParams.set('displayPlanType', 'true');
        url.searchParams.set('entitlement', 'true');
        url.searchParams.set('modal', 'true');
        url.searchParams.set('commerce.landscape', 'DRAFT');
        url.searchParams.set('commerce.env', 'STAGE');
        url.searchParams.set('quantity', '2');
        url.searchParams.set('wcsApiKey', 'testapikey');
        url.searchParams.set('mas-io-url', 'https://mycustomurl');
        window.history.replaceState({}, '', url.toString());

        const config = { commerce: { allowOverride: '' } };
        expect(getSettings(config, mockService)).to.deep.equal({
            ...Defaults,
            checkoutClientId,
            checkoutWorkflowStep,
            promotionCode,
            displayOldPrice: false,
            displayPerUnit: true,
            displayRecurrence: false,
            displayTax: true,
            displayPlanType: true,
            entitlement: true,
            modal: true,
            landscape: 'DRAFT',
            quantity: [2],
            wcsApiKey: 'testapikey',
            locale: 'en_US',
            masIOUrl: 'https://mycustomurl',
            env: 'STAGE',
            wcsURL: WCS_STAGE_URL,
        });
    });

    it('uses document metadata and storage', () => {
        const wcsApiKey = 'wcs-api-key';
        const meta = document.createElement('meta');
        meta.content = wcsApiKey;
        meta.name = 'wcs-api-key';
        document.head.append(meta);
        window.sessionStorage.setItem(PARAM_ENV, 'stage');

        const commerce = {
            forceTaxExclusive: true,
            promotionCode: 'promo1',
            allowOverride: 'true',
            'commerce.landscape': 'DRAFT',
        };
        expect(
            getSettings({
                commerce,
                locale: 'nb_NO',
            }, mockService),
        ).to.deep.equal({
            ...Defaults,
            forceTaxExclusive: true,
            promotionCode: 'promo1',
            country: 'NO',
            env: Env.STAGE,
            language: 'nb',
            locale: 'nb_NO',
            masIOUrl: 'https://www.stage.adobe.com/mas/io', // because env === Env.STAGE
            quantity: [Defaults.quantity],
            wcsApiKey,
            wcsURL: WCS_STAGE_URL,
            landscape: Landscape.DRAFT,
        });
        window.sessionStorage.removeItem(PARAM_ENV);
    });

    it('host env "local" -> WCS prod origin + prod akamai', () => {
      const config = { commerce: {}, env: { name: 'local' }, };
        const settings = getSettings(config, mockService);
        expect(settings.wcsURL).to.equal(WCS_PROD_URL);
        expect(settings.env).to.equal(Env.PRODUCTION);
    });

    it('host env "stage" -> WCS prod origin + prod akamai', () => {
      const config = { commerce: {}, env: { name: 'stage' }, };
        const settings = getSettings(config, mockService);
        expect(settings.wcsURL).to.equal(WCS_PROD_URL);
        expect(settings.env).to.equal(Env.PRODUCTION);
    });

    it('host env "prod" -> WCS prod origin + prod akamai', () => {
      const config = { commerce: {}, env: { name: 'prod' }, };
        const settings = getSettings(config, mockService);
        expect(settings.wcsURL).to.equal(WCS_PROD_URL);
        expect(settings.env).to.equal(Env.PRODUCTION);
    });

    it('host env "stage" - override landscape and WCS origin (_stage)', () => {
        window.sessionStorage.setItem(PARAM_ENV, 'stage');
        window.sessionStorage.setItem(PARAM_LANDSCAPE, 'DRAFT');
        const config = { commerce: { allowOverride: 'true' } };
        const settings = getSettings(config, mockService);
        expect(settings.wcsURL).to.equal(WCS_STAGE_URL);
        expect(settings.landscape).to.equal(Landscape.DRAFT);
        expect(settings.env).to.equal(Env.STAGE);
    });

    it('if host env is "prod" - cant override landscape or WCS origin', () => {
        window.sessionStorage.setItem(PARAM_ENV, 'stage');
        window.sessionStorage.setItem(PARAM_LANDSCAPE, 'DRAFT');
        const config = { commerce: {} };
        const settings = getSettings(config, mockService);
        expect(settings.wcsURL).to.equal(WCS_PROD_URL);
        expect(settings.landscape).to.equal(Landscape.PUBLISHED);
        expect(settings.env).to.equal(Env.PRODUCTION);
    });
  
    it('sets correctly preview configuration from configuration', () => {
      const config = { commerce: {}, preview: '' };
      window.sessionStorage.setItem('wcsApiKey', 'wcms-commerce-ims-ro-user-milo');
      const settings = getSettings(config, mockService);
      expect(settings.preview).to.equal(true);
    });
  
    it('sets correctly preview configuration from parameter mas.preview', () => {
      const config = { commerce: {} };
      window.sessionStorage.setItem('wcsApiKey', 'wcms-commerce-ims-ro-user-milo');
      window.sessionStorage.setItem('mas.preview', 'on');
      const settings = getSettings(config, mockService);
      expect(settings.preview).to.equal(true);
    });
  
    it('unset correctly preview configuration from parameter mas.preview', () => {
      const config = { commerce: {}, preview: '' };
      window.sessionStorage.setItem('wcsApiKey', 'wcms-commerce-ims-ro-user-milo');
      window.sessionStorage.setItem('mas.preview', 'off');
      const settings = getSettings(config, mockService);
      expect(settings.preview).to.be.undefined;
    });
});
