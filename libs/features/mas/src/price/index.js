import {
    createPriceTemplate,
    createPromoPriceTemplate,
    createPriceWithAnnualTemplate,
    createPromoPriceWithAnnualTemplate,
} from './template.js';

import { legalTemplate } from './legal.js';

import { isPromotionActive } from './utilities.js';

const price = createPriceTemplate();
const pricePromo = createPromoPriceTemplate();
const priceOptical = createPriceTemplate({
    displayOptical: true,
});
const priceStrikethrough = createPriceTemplate({
    displayStrikethrough: true,
});
const priceAnnual = createPriceTemplate({
    displayAnnual: true,
});
const priceOpticalAlternative = createPriceTemplate({
    displayOptical: true,
    isAlternativePrice: true,
});
const priceAlternative = createPriceTemplate({
    isAlternativePrice: true,
});
const priceWithAnnual = createPriceWithAnnualTemplate();
const pricePromoWithAnnual = createPromoPriceWithAnnualTemplate();

const legal = legalTemplate;

export {
    legal,
    price,
    pricePromo,
    priceOptical,
    priceStrikethrough,
    priceAnnual,
    priceAlternative,
    priceOpticalAlternative,
    priceWithAnnual,
    pricePromoWithAnnual,
    isPromotionActive,
};
