import {
    CLASS_NAME_DOWNLOAD,
    CLASS_NAME_UPGRADE,
} from '../src/checkout-mixin.js';

import { CheckoutButton } from '../src/checkout-button.js';
import { Checkout } from '../src/checkout.js';
import { getSettings } from '../src/settings.js';

import {
    CLASS_NAME_FAILED,
    ERROR_MESSAGE_OFFER_NOT_FOUND,
    CheckoutWorkflow,
    CheckoutWorkflowStep,
} from '../src/constants.js';
import { mockFetch } from './mocks/fetch.js';
import { mockIms, unmockIms } from './mocks/ims.js';
import { mockLana, unmockLana } from './mocks/lana.js';
import { withWcs } from './mocks/wcs.js';
import {
    expect,
    sinon,
    initMasCommerceService,
    removeMasCommerceService,
} from './utilities.js';
import { MasError } from '../src/mas-error.js';
import '../src/mas.js';
import { delay } from './utils.js';

const HREF = 'https://test.org/';

/**
 * @param {string} wcsOsi
 * @param {Record<string, any>} options
 * @returns {Commerce.Checkout.Placeholder}
 */
function mockCheckoutButton(wcsOsi, options = {}, append = true) {
    const element = CheckoutButton.createCheckoutButton(
        { wcsOsi, ...options },
        `Buy now: ${wcsOsi}`,
    );
    if (append) document.body.append(element, document.createElement('br'));
    return element;
}

afterEach(() => {
    removeMasCommerceService();
    unmockIms();
    unmockLana();
});

beforeEach(async () => {
    await mockFetch(withWcs);
    mockLana();
});

describe('class "CheckoutButton"', () => {
    it('renders button', async () => {
        initMasCommerceService();
        const checkoutButton = mockCheckoutButton('abm');
        await checkoutButton.onceSettled();
        expect(checkoutButton.href).to.equal(
            'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=632B3ADD940A7FBB7864AA5AD19B8D28&cli=adobe_com&ctx=fp&co=US&lang=en',
        );
        expect(checkoutButton.value).to.be.not.empty;
        expect(checkoutButton.options).to.be.not.empty;
    });

    it('renders button with workflow step from settings', async () => {
        await initMasCommerceService({
            'checkout-workflow-step': CheckoutWorkflowStep.SEGMENTATION,
        });
        const checkoutButton = mockCheckoutButton('abm');
        await checkoutButton.onceSettled();
        expect(checkoutButton.href).to.equal(
            'https://commerce.adobe.com/store/segmentation?cli=adobe_com&ctx=fp&co=US&lang=en&ms=COM&ot=BASE&cs=INDIVIDUAL&pa=ccsn_direct_individual',
        );
    });

    it('renders button with workflow step from dataset', async () => {
        initMasCommerceService();
        const checkoutButton = mockCheckoutButton('abm', {
            checkoutWorkflowStep: CheckoutWorkflowStep.SEGMENTATION,
        });
        await checkoutButton.onceSettled();
        expect(checkoutButton.href).to.equal(
            'https://commerce.adobe.com/store/segmentation?cli=adobe_com&ctx=fp&co=US&lang=en&ms=COM&ot=BASE&cs=INDIVIDUAL&pa=ccsn_direct_individual',
        );
    });

    it('renders button with ims country', async () => {
        mockIms('CH');
        const service = initMasCommerceService();
        const checkoutButton = mockCheckoutButton('abm');
        await service.imsCountryPromise;
        await delay(1);
        await checkoutButton.onceSettled();
        expect(checkoutButton.href).to.equal(
            'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=632B3ADD940A7FBB7864AA5AD19B8D28&cli=adobe_com&ctx=fp&co=CH&lang=en',
        );
    });

    it('renders button with promo from dataset', async () => {
        initMasCommerceService();
        const checkoutButton = mockCheckoutButton('abm-promo', {
            promotionCode: 'nicopromo',
        });
        await checkoutButton.onceSettled();
        expect(checkoutButton.href).to.equal(
            'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=632B3ADD940A7FBB7864AA5AD19B8D28&apc=nicopromo&cli=adobe_com&ctx=fp&co=US&lang=en',
        );
        checkoutButton.dataset.promotionCode = 'testpromo';
        await checkoutButton.onceSettled();
        expect(checkoutButton.href).to.equal(
            'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=632B3ADD940A7FBB7864AA5AD19B8D28&apc=testpromo&cli=adobe_com&ctx=fp&co=US&lang=en',
        );
    });

    it('renders multiple checkout buttons', async () => {
        initMasCommerceService();
        const abm = mockCheckoutButton('abm');
        const puf = mockCheckoutButton('puf');
        const m2m = mockCheckoutButton('m2m');
        await Promise.all([
            abm.onceSettled(),
            puf.onceSettled(),
            m2m.onceSettled(),
        ]);
        expect([abm.href, puf.href, m2m.href]).to.deep.equal([
            'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=632B3ADD940A7FBB7864AA5AD19B8D28&cli=adobe_com&ctx=fp&co=US&lang=en',
            'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=9E618D5A589EF8D6364DFBE02FC2C264&cli=adobe_com&ctx=fp&co=US&lang=en',
            'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=257E1D82082387D152029F93C1030624&cli=adobe_com&ctx=fp&co=US&lang=en',
        ]);
    });

    it('render button with multiple OSIs', async () => {
        initMasCommerceService();
        const checkoutButton = mockCheckoutButton('abm,stock-abm', {
            quantity: '2,2',
        });
        await checkoutButton.onceSettled();
        expect(checkoutButton.href).to.equal(
            'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=632B3ADD940A7FBB7864AA5AD19B8D28&items%5B0%5D%5Bq%5D=2&items%5B1%5D%5Bid%5D=7164A328080BC96CC60FEBF33F64342D&items%5B1%5D%5Bq%5D=2&cli=adobe_com&ctx=fp&co=US&lang=en',
        );
    });

    it('fails with missing offer', async () => {
        initMasCommerceService();
        const checkoutButton = mockCheckoutButton('no-offer');
        await expect(checkoutButton.onceSettled()).eventually.be.rejectedWith(
            ERROR_MESSAGE_OFFER_NOT_FOUND,
        );
    });

    it('fails with bad request', async () => {
        initMasCommerceService();
        const checkoutButton = mockCheckoutButton('xyz');

        try {
            await checkoutButton.onceSettled();
            // Should not reach here
            expect.fail('Promise should have been rejected');
        } catch (error) {
            // Verify it's a MasError instance
            expect(error).to.be.instanceOf(MasError);
            expect(error.context).to.have.property('measure');
            expect(error.context).to.include({
                status: 404,
                url: 'https://www.adobe.com//web_commerce_artifact?offer_selector_ids=xyz&country=US&locale=en_US&landscape=PUBLISHED&api_key=wcms-commerce-ims-ro-user-milo&language=MULT',
            });
        }
    });

    it('renders button for perpetual offers', async () => {
        initMasCommerceService();
        const checkoutButton = mockCheckoutButton('perpetual', {
            perpetual: 'true',
        });
        await checkoutButton.onceSettled();
        expect(checkoutButton.href).to.equal(
            'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=C5AC20C8AAF4892B67DE2E89B26D8ACA&cli=adobe_com&ctx=fp&co=US&lang=en',
        );
        expect(fetch.lastCall.args[0]).to.not.contain('language=');

        // no more perpetual offer
        checkoutButton.dataset.perpetual = 'false';
        const promise = checkoutButton.onceSettled();
        await expect(promise).eventually.be.rejectedWith(
            ERROR_MESSAGE_OFFER_NOT_FOUND,
        );
        expect(fetch.lastCall.args[0]).to.contain('language=MULT');
    });

    it('renders button with extra options and cleans up once unset', async () => {
        initMasCommerceService();
        const checkoutButton = mockCheckoutButton('abm', {
            extraOptions: '{"mv":1, "mv2":2, "promoid": "abc"}',
        });
        await checkoutButton.onceSettled();
        expect(checkoutButton.href).to.equal(
            'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=632B3ADD940A7FBB7864AA5AD19B8D28&cli=adobe_com&ctx=fp&co=US&mv=1&mv2=2&promoid=abc&lang=en',
        );
        delete checkoutButton.dataset.extraOptions;
        await checkoutButton.onceSettled();
        expect(checkoutButton.href).to.equal(
            'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=632B3ADD940A7FBB7864AA5AD19B8D28&cli=adobe_com&ctx=fp&co=US&lang=en',
        );
    });

    describe('property "isCheckoutButton"', () => {
        it('returns true', async () => {
            initMasCommerceService();
            const checkoutButton = mockCheckoutButton('abm');
            expect(checkoutButton.isCheckoutButton).to.be.true;
        });
    });

    describe('method "renderOffers"', () => {
        it('returns false and renders failed placeholder if offers array is empty', async () => {
            initMasCommerceService();
            const checkoutButton = mockCheckoutButton('no-offer', {});
            checkoutButton.setCheckoutUrl(HREF);
            expect(await checkoutButton.renderOffers([])).to.be.true;
            expect(checkoutButton.classList.contains(CLASS_NAME_FAILED)).to.be
                .true;
            expect(checkoutButton.href).to.equal('#');
        });

        it('skips rendering if version has changed', async () => {
            initMasCommerceService();
            const checkoutButton = mockCheckoutButton('no-offer', {}, false);
            checkoutButton.setCheckoutUrl(HREF);
            checkoutButton.masElement.togglePending();
            expect(checkoutButton.href).to.equal(HREF);
        });
    });

    describe('method "updateOptions"', () => {
        it('updates element data attributes', async () => {
            initMasCommerceService();
            const button = CheckoutButton.createCheckoutButton({
                quantity: ['1'],
                wcsOsi: 'abm',
                upgrade: 'true',
            });
            expect(button.dataset.upgrade).to.be.equal('true');
            const options = {
                checkoutMarketSegment: 'test',
                checkoutWorkflow: CheckoutWorkflow.V3,
                checkoutWorkflowStep: CheckoutWorkflowStep.EMAIL,
                perpetual: true,
                promotionCode: 'promo',
                quantity: ['1', '2'],
                wcsOsi: ['m2m', 'puf'],
                upgrade: 'false',
            };
            button.updateOptions(options);
            const { dataset } = button;
            expect(dataset.checkoutMarketSegment).to.equal(
                options.checkoutMarketSegment,
            );
            expect(dataset.checkoutWorkflowStep).to.equal(
                options.checkoutWorkflowStep,
            );
            expect(dataset.perpetual).to.equal(String(options.perpetual));
            expect(dataset.promotionCode).to.equal(
                String(options.promotionCode),
            );
            expect(dataset.quantity).to.equal(String(options.quantity));
            expect(dataset.wcsOsi).to.equal(String(options.wcsOsi));
            expect(dataset.upgrade).to.be.equal('false');
        });
    });

    describe('logged-in features', () => {
        it('renders download button', async () => {
            mockIms('US');
            await initMasCommerceService({}, () => {
                return {
                    text: 'Download',
                    className: CLASS_NAME_DOWNLOAD,
                    url: 'https://helpx.adobe.com/download-install.html',
                };
            });
            const checkoutButton = mockCheckoutButton('abm');
            await checkoutButton.onceSettled();
            expect(checkoutButton.textContent.trim()).to.equal('Download');
            expect(checkoutButton.classList.contains('download')).to.be.true;
            expect(checkoutButton.href).to.equal(
                'https://helpx.adobe.com/download-install.html',
            );
        });

        it('renders upgrade button', async () => {
            mockIms('US');
            const handler = sinon.stub();
            await initMasCommerceService({}, () => {
                return {
                    text: 'Upgrade',
                    className: CLASS_NAME_UPGRADE,
                    handler,
                };
            });
            const checkoutButton = mockCheckoutButton('abm');
            await checkoutButton.onceSettled();
            expect(checkoutButton.classList.contains('upgrade')).to.be.true;
            checkoutButton.click();
            expect(checkoutButton.textContent.trim()).to.equal('Upgrade');
            sinon.assert.calledOnce(handler);
            expect(checkoutButton.href).to.equal('#');
        });

        it('skips entitlements check', async () => {
            initMasCommerceService();
            const checkoutButton = mockCheckoutButton('abm');
            checkoutButton.dataset.entitlement = 'false';
            await checkoutButton.onceSettled();
            expect(checkoutButton.textContent.trim()).to.equal('Buy now: abm');
            expect(checkoutButton.href).to.equal(
                'https://commerce.adobe.com/store/email?items%5B0%5D%5Bid%5D=632B3ADD940A7FBB7864AA5AD19B8D28&cli=adobe_com&ctx=fp&co=US&lang=en',
            );
            checkoutButton.requestUpdate();
        });
    });
});

describe('commerce service', async () => {
    describe('function "buildCheckoutURL"', () => {
        it('returns empty string if no offers provided', async () => {
            initMasCommerceService();
            const service = initMasCommerceService();
            expect(service.buildCheckoutURL([])).to.be.empty;
        });
    });

    describe('function "direct checkout calls"', () => {
        it('works as expected', async () => {
            initMasCommerceService();
            const service = initMasCommerceService();
            const { collectCheckoutOptions, buildCheckoutURL } = new Checkout({
                literals: { price: {} },
                providers: {
                    checkout: [
                        (p, o) => {
                            /*nop*/
                        },
                    ],
                },
                settings: getSettings(service.config, service),
            });
            const checkoutButton1 = mockCheckoutButton('abm');
            const options = collectCheckoutOptions({}, checkoutButton1);
            expect(options).not.to.be.empty;
            buildCheckoutURL(
                [{ offerid: 'a', marketSegments: ['COM'], priceDetails: {} }],
                options,
            );
        });
    });
});
