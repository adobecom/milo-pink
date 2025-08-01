import { SELECTOR_MAS_INLINE_PRICE } from './constants.js';
import { UptLink } from './upt-link.js';
import { createTag } from './utils.js';

const DEFAULT_BADGE_COLOR = '#000000';
const DEFAULT_BADGE_BACKGROUND_COLOR = '#F8D904';
const DEFAULT_BORDER_COLOR = '#EAEAEA';
const DEFAULT_TRIAL_BADGE_BORDER_COLOR = '#31A547';
const CHECKOUT_STYLE_PATTERN = /(accent|primary|secondary)(-(outline|link))?/;
export const ANALYTICS_TAG = 'mas:product_code/';
export const ANALYTICS_LINK_ATTR = 'daa-ll';
export const ANALYTICS_SECTION_ATTR = 'daa-lh';
const SPECTRUM_BUTTON_SIZES = ['XL', 'L', 'M', 'S'];
const TEXT_TRUNCATE_SUFFIX = '...';

export function appendSlot(fieldName, fields, el, mapping) {
    const config = mapping[fieldName];
    if (fields[fieldName] && config) {
        const attributes = { slot: config?.slot };
        let content = fields[fieldName];

        // Handle maxCount if specified in the config
        if (config.maxCount && typeof content === 'string') {
            const [truncatedContent, cleanContent] = getTruncatedTextData(
                content,
                config.maxCount,
                config.withSuffix,
            );
            if (truncatedContent !== content) {
                attributes.title = cleanContent; // Add full text as title attribute for tooltip
                content = truncatedContent;
            }
        }

        const tag = createTag(config.tag, attributes, content);
        el.append(tag);
    }
}

export function processMnemonics(fields, merchCard, mnemonicsConfig) {
    const mnemonics = fields.mnemonicIcon?.map((icon, index) => ({
        icon,
        alt: fields.mnemonicAlt[index] ?? '',
        link: fields.mnemonicLink[index] ?? '',
    }));

    mnemonics?.forEach(({ icon: src, alt, link: href }) => {
        if (href && !/^https?:/.test(href)) {
            try {
                href = new URL(`https://${href}`).href.toString();
            } catch (e) {
                /* c8 ignore next 2 */
                href = '#';
            }
        }

        const attrs = {
            slot: 'icons',
            src,
            loading: merchCard.loading,
            size: mnemonicsConfig?.size ?? 'l',
        };
        if (alt) attrs.alt = alt;
        if (href) attrs.href = href;
        const merchIcon = createTag('merch-icon', attrs);
        merchCard.append(merchIcon);
    });

    const slotIcons = merchCard.shadowRoot.querySelector('slot[name="icons"]');
    if (!mnemonics?.length && slotIcons) {
      slotIcons.remove();
    }
}

function processBadge(fields, merchCard, mapping) {
    if (mapping.badge?.slot) {
        if (fields.badge?.length && !fields.badge?.startsWith('<merch-badge')) {
            let badgeDefaultBgColor = DEFAULT_BADGE_BACKGROUND_COLOR;
            let setBorderColorForBadge = false;

            if (mapping.allowedBadgeColors?.includes(mapping.badge?.default)) {
                badgeDefaultBgColor = mapping.badge?.default;
                if (!fields.borderColor) {
                    setBorderColorForBadge = true;
                }
            }

            const bgColorToUse = fields.badgeBackgroundColor || badgeDefaultBgColor;
            let borderColorToUse = fields.borderColor || '';
            if (setBorderColorForBadge) {
                borderColorToUse = mapping.badge?.default;
                fields.borderColor = mapping.badge?.default;
            }
            
            fields.badge = `<merch-badge variant="${fields.variant}" background-color="${bgColorToUse}" border-color="${borderColorToUse}">${fields.badge}</merch-badge>`;
        }
        appendSlot('badge', fields, merchCard, mapping);
    } else {
        if (fields.badge) {
            merchCard.setAttribute('badge-text', fields.badge);
            merchCard.setAttribute(
                'badge-color',
                fields.badgeColor || DEFAULT_BADGE_COLOR,
            );
            merchCard.setAttribute(
                'badge-background-color',
                fields.badgeBackgroundColor || DEFAULT_BADGE_BACKGROUND_COLOR,
            );
            merchCard.setAttribute(
                'border-color',
                fields.badgeBackgroundColor || DEFAULT_BADGE_BACKGROUND_COLOR,
            );
        } else {
            merchCard.setAttribute(
                'border-color',
                fields.borderColor || DEFAULT_BORDER_COLOR,
            );
        }
    }
}

export function processTrialBadge(fields, merchCard, mapping) {
    if (mapping.trialBadge && fields.trialBadge) {
        if (!fields.trialBadge.startsWith('<merch-badge')) {
            const borderColorToUse = fields.trialBadgeBorderColor || DEFAULT_TRIAL_BADGE_BORDER_COLOR;
            fields.trialBadge = `<merch-badge variant="${fields.variant}" border-color="${borderColorToUse}">${fields.trialBadge}</merch-badge>`;
        }
        appendSlot('trialBadge', fields, merchCard, mapping);
    }
}

export function processSize(fields, merchCard, sizeConfig) {
    if (sizeConfig?.includes(fields.size)) {
        merchCard.setAttribute('size', fields.size);
    }
}

export function processTitle(fields, merchCard, titleConfig) {
    appendSlot('cardTitle', fields, merchCard, { cardTitle: titleConfig });
}

export function processSubtitle(fields, merchCard, mapping) {
    appendSlot('subtitle', fields, merchCard, mapping);
}

export function processBackgroundColor(fields, merchCard, allowedColors, backgroundColorConfig) {
    if (
        !fields.backgroundColor ||
        fields.backgroundColor.toLowerCase() === 'default'
    ) {
        merchCard.style.removeProperty('--merch-card-custom-background-color');
        merchCard.removeAttribute('background-color');
        return;
    }

    if (allowedColors?.[fields.backgroundColor]) {
        merchCard.style.setProperty(
            '--merch-card-custom-background-color',
            `var(${allowedColors[fields.backgroundColor]})`,
        );
        merchCard.setAttribute('background-color', fields.backgroundColor);
    } else if (backgroundColorConfig?.attribute && fields.backgroundColor) {
        merchCard.setAttribute(backgroundColorConfig.attribute, fields.backgroundColor);
        merchCard.style.removeProperty('--merch-card-custom-background-color');
    }
}

export function processBorderColor(fields, merchCard, variantMapping) {
    const borderColorConfig = variantMapping?.borderColor;
    const customBorderColor = '--merch-card-custom-border-color';

    if (fields.borderColor?.toLowerCase() === 'transparent') {
        merchCard.style.removeProperty(customBorderColor);
        if (variantMapping?.allowedBorderColors?.includes(variantMapping?.badge?.default)) {
            merchCard.style.setProperty(customBorderColor, 'transparent');
        }
    } else if (fields.borderColor && borderColorConfig) {
        if (/-gradient/.test(fields.borderColor)) {
            merchCard.setAttribute('gradient-border', 'true');
            merchCard.style.removeProperty(customBorderColor);
        } else {
            merchCard.style.setProperty(
                customBorderColor,
                `var(--${fields.borderColor})`,
            );
        }
    }
}

export function processBackgroundImage(
    fields,
    merchCard,
    backgroundImageConfig,
) {
    if (fields.backgroundImage) {
        const imgAttributes = {
            loading: merchCard.loading ?? 'lazy',
            src: fields.backgroundImage,
        };
        if (fields.backgroundImageAltText) {
            imgAttributes.alt = fields.backgroundImageAltText;
        } else {
            imgAttributes.role = 'none';
        }
        if (!backgroundImageConfig) return;
        if (backgroundImageConfig?.attribute) {
            merchCard.setAttribute(
                backgroundImageConfig.attribute,
                fields.backgroundImage,
            );
            return;
        }
        merchCard.append(
            createTag(
                backgroundImageConfig.tag,
                { slot: backgroundImageConfig.slot },
                createTag('img', imgAttributes),
            ),
        );
    }
}

export function processPrices(fields, merchCard, mapping) {
    appendSlot('prices', fields, merchCard, mapping);
}

function transformLinkToButton(linkElement, merchCard, aemFragmentMapping) {
    const isCheckoutLink = linkElement.hasAttribute('data-wcs-osi') && Boolean(linkElement.getAttribute('data-wcs-osi'));
    const originalClassName = linkElement.className || '';
    const checkoutLinkStyle = CHECKOUT_STYLE_PATTERN.exec(originalClassName)?.[0] ?? 'accent';
    const isAccent = checkoutLinkStyle.includes('accent');
    const isPrimary = checkoutLinkStyle.includes('primary');
    const isSecondary = checkoutLinkStyle.includes('secondary');
    const isOutline = checkoutLinkStyle.includes('-outline');
    const isLinkStyle = checkoutLinkStyle.includes('-link');

    linkElement.classList.remove('accent', 'primary', 'secondary');

    let newButtonElement;

    if (merchCard.consonant) {
        newButtonElement = createConsonantButton(linkElement, isAccent, isCheckoutLink, isLinkStyle);
    } else if (isLinkStyle) {
        newButtonElement = linkElement;
    } else {
        let variant;
        if (isAccent) {
            variant = 'accent';
        } else if (isPrimary) {
            variant = 'primary';
        } else if (isSecondary) {
            variant = 'secondary';
        }

        newButtonElement = merchCard.spectrum === 'swc'
            ? createSpectrumSwcButton(
                  linkElement,
                  aemFragmentMapping, 
                  isOutline,
                  variant,
                  isCheckoutLink
              )
            : createSpectrumCssButton(
                  linkElement,
                  aemFragmentMapping,
                  isOutline,
                  variant,
                  isCheckoutLink
              );
    }
    return newButtonElement;
}

function processDescriptionLinks(merchCard, aemFragmentMapping) {
    const { slot } = aemFragmentMapping?.description
    const links = merchCard.querySelectorAll(`[slot="${slot}"] a[data-wcs-osi]`);
    if(!links.length) return;
    links.forEach(link => {
            const checkoutLink = transformLinkToButton(link, merchCard, aemFragmentMapping);
                link.replaceWith(checkoutLink);
    });
}

export function processDescription(fields, merchCard, mapping) {
    appendSlot('promoText', fields, merchCard, mapping);
    appendSlot('description', fields, merchCard, mapping);
    processDescriptionLinks(merchCard, mapping);
    appendSlot('callout', fields, merchCard, mapping);
    appendSlot('quantitySelect', fields, merchCard, mapping);
    appendSlot('whatsIncluded', fields, merchCard, mapping);
}

export function processAddon(fields, merchCard, mapping) {
    if (!mapping.addon) return;
    let addonField = fields.addon?.replace(/[{}]/g, '');
    if (!addonField) return;
    if (/disabled/.test(addonField)) return;
    const addon = createTag('merch-addon', { slot: 'addon' }, addonField);
    [...addon.querySelectorAll(SELECTOR_MAS_INLINE_PRICE)].forEach((span) => {
        const parent = span.parentElement;
        if (parent?.nodeName !== 'P') return;
        parent.setAttribute('data-plan-type', '');
    });
    merchCard.append(addon);
}

export function processAddonConfirmation(fields, merchCard, mapping) {
    if (fields.addonConfirmation) {
        appendSlot('addonConfirmation', fields, merchCard, mapping);
    }
}

export function processStockOffersAndSecureLabel(
    fields,
    merchCard,
    aemFragmentMapping,
    settings,
) {
    if (settings?.secureLabel && aemFragmentMapping?.secureLabel) {
        merchCard.setAttribute('secure-label', settings.secureLabel);
    }
}

export function getTruncatedTextData(text, limit, withSuffix = true) {
    try {
        const _text = typeof text !== 'string' ? '' : text;
        const cleanText = clearTags(_text);
        if (cleanText.length <= limit) return [_text, cleanText];

        let index = 0;
        let inTag = false;
        let remaining = withSuffix
            ? limit - TEXT_TRUNCATE_SUFFIX.length < 1
                ? 1
                : limit - TEXT_TRUNCATE_SUFFIX.length
            : limit;
        let openTags = [];

        for (const char of _text) {
            index++;
            if (char === '<') {
                inTag = true;
                // Check next character
                if (_text[index] === '/') {
                    openTags.pop();
                } else {
                    let tagName = '';
                    for (const tagChar of _text.substring(index)) {
                        if (tagChar === ' ' || tagChar === '>') break;
                        tagName += tagChar;
                    }
                    openTags.push(tagName);
                }
            }
            if (char === '/') {
                // Check next character
                if (_text[index] === '>') {
                    openTags.pop();
                }
            }
            if (char === '>') {
                inTag = false;
                continue;
            }
            if (inTag) continue;
            remaining--;
            if (remaining === 0) break;
        }

        let trimmedText = _text.substring(0, index).trim();
        if (openTags.length > 0) {
            if (openTags[0] === 'p') openTags.shift();
            for (const tag of openTags.reverse()) {
                trimmedText += `</${tag}>`;
            }
        }
        let truncatedText = `${trimmedText}${withSuffix ? TEXT_TRUNCATE_SUFFIX : ''}`;
        return [truncatedText, cleanText];
    } catch (error) {
        // Fallback to original text without truncation
        const fallbackText = typeof text === 'string' ? text : '';
        const cleanFallback = clearTags(fallbackText);
        return [fallbackText, cleanFallback];
    }
}

function clearTags(text) {
    if (!text) return '';

    let result = '';
    let inTag = false;
    for (const char of text) {
        if (char === '<') inTag = true;
        if (char === '>') {
            inTag = false;
            continue;
        }
        if (inTag) continue;
        result += char;
    }
    return result;
}

export function processUptLinks(fields, merchCard) {
    const placeholders = merchCard.querySelectorAll('a.upt-link');
    placeholders.forEach((placeholder) => {
        const uptLink = UptLink.createFrom(placeholder);
        placeholder.replaceWith(uptLink);
        uptLink.initializeWcsData(fields.osi, fields.promoCode);
    });
}

function createSpectrumCssButton(cta, aemFragmentMapping, isOutline, variant, isCheckout) {
    let button = cta;
    if (isCheckout) {
        const CheckoutButton = customElements.get('checkout-button');
        button = CheckoutButton.createCheckoutButton({}, cta.innerHTML);
    }
    else {
        button.innerHTML = `<span>${button.textContent}</span>`
    }
    button.setAttribute('tabindex', 0);
    for (const attr of cta.attributes) {
        if (['class', 'is'].includes(attr.name)) continue;
        button.setAttribute(attr.name, attr.value);
    }
    button.firstElementChild?.classList.add('spectrum-Button-label');
    const size = aemFragmentMapping?.ctas?.size ?? 'M';
    const variantClass = `spectrum-Button--${variant}`;
    const sizeClass = SPECTRUM_BUTTON_SIZES.includes(size)
        ? `spectrum-Button--size${size}`
        : 'spectrum-Button--sizeM';
    const spectrumClass = ['spectrum-Button', variantClass, sizeClass];
    if (isOutline) {
        spectrumClass.push('spectrum-Button--outline');
    }

    button.classList.add(...spectrumClass);
    return button;
}

function createSpectrumSwcButton(cta, aemFragmentMapping, isOutline, variant, isCheckout) {
    let button = cta;
    if (isCheckout) {
        const CheckoutButton = customElements.get('checkout-button');
        button = CheckoutButton.createCheckoutButton(cta.dataset);
        button.connectedCallback();
        button.render();
    }

    let treatment = 'fill';

    if (isOutline) {
        treatment = 'outline';
    }
    const spectrumCta = createTag(
        'sp-button',
        {
            treatment,
            variant,
            tabIndex: 0,
            size: aemFragmentMapping?.ctas?.size ?? 'm',
            ...(cta.dataset.analyticsId && {
                'data-analytics-id': cta.dataset.analyticsId,
            }),
        },
        cta.innerHTML,
    );

    spectrumCta.source = button;
    (isCheckout ? button.onceSettled() : Promise.resolve(button)).then((target) => {
        spectrumCta.setAttribute('data-navigation-url', target.href);
    });

    spectrumCta.addEventListener('click', (e) => {
        if (e.defaultPrevented) return;
        button.click();
    });

    return spectrumCta;
}

function createConsonantButton(cta, isAccent, isCheckout, isLinkStyle) {
    let button = cta;
    if (isCheckout) {
        const CheckoutLink = customElements.get('checkout-link');
        button = CheckoutLink.createCheckoutLink(
            cta.dataset,
            cta.innerHTML,
        );
    }
    if(!isLinkStyle) {
        button.classList.add('con-button');
        if (isAccent) {
            button.classList.add('blue');
        }
    }
    return button;
}

export function processCTAs(fields, merchCard, aemFragmentMapping, variant) {
    if (fields.ctas) {
        const { slot } = aemFragmentMapping.ctas;
        const footer = createTag('div', { slot }, fields.ctas);
        const ctas = [...footer.querySelectorAll('a')].map((cta) => {
            const checkoutButton = transformLinkToButton(cta, merchCard, aemFragmentMapping);
            return checkoutButton;
        });

        footer.innerHTML = '';
        footer.append(...ctas);
        merchCard.append(footer);
    }
}

export function processAnalytics(fields, merchCard) {
    const { tags } = fields;
    const cardAnalyticsId = tags
        ?.find((tag) => tag.startsWith(ANALYTICS_TAG))
        ?.split('/')
        .pop();
    if (!cardAnalyticsId) return;
    merchCard.setAttribute(ANALYTICS_SECTION_ATTR, cardAnalyticsId);
    const elements = [
        ...merchCard.shadowRoot.querySelectorAll(
            `a[data-analytics-id],button[data-analytics-id]`,
        ),
        ...merchCard.querySelectorAll(
            `a[data-analytics-id],button[data-analytics-id]`,
        ),
    ];
    elements.forEach((el, index) => {
        el.setAttribute(
            ANALYTICS_LINK_ATTR,
            `${el.dataset.analyticsId}-${index + 1}`,
        );
    });
}

export function updateLinksCSS(merchCard) {
    if (merchCard.spectrum !== 'css') return;
    [
        ['primary-link', 'primary'],
        ['secondary-link', 'secondary'],
    ].forEach(([className, variant]) => {
        merchCard.querySelectorAll(`a.${className}`).forEach((link) => {
            link.classList.remove(className);
            link.classList.add('spectrum-Link', `spectrum-Link--${variant}`);
        });
    });
}

export function cleanup(merchCard) {
    // remove all previous slotted content except the default slot
    merchCard.querySelectorAll('[slot]').forEach((el) => {
        el.remove();
    });
    merchCard.variant = undefined;
    const attributesToRemove = [
        'checkbox-label',
        'stock-offer-osis',
        'secure-label',
        'background-image',
        'background-color',
        'border-color',
        'badge-background-color',
        'badge-color',
        'badge-text',
        'gradient-border',
        'size',
        ANALYTICS_SECTION_ATTR,
    ];
    attributesToRemove.forEach((attr) => merchCard.removeAttribute(attr));
    const classesToRemove = ['wide-strip', 'thin-strip'];
    merchCard.classList.remove(...classesToRemove);
}

export async function hydrate(fragment, merchCard) {
    // Guard against missing fragment or fragment.fields
    if (!fragment) {
        const cardIdForError = merchCard?.id || 'unknown';
        console.error(`hydrate: Fragment is undefined. Cannot hydrate card (merchCard id: ${cardIdForError}).`);
        throw new Error(`hydrate: Fragment is undefined for card (merchCard id: ${cardIdForError}).`);
    }
    if (!fragment.fields) {
        const problemId = fragment.id || 'unknown';
        const cardIdForError = merchCard?.id || 'unknown';
        console.error(`hydrate: Fragment for card ID '${problemId}' (merchCard id: ${cardIdForError}) is missing 'fields'. Cannot hydrate.`);
        throw new Error(`hydrate: Fragment for card ID '${problemId}' (merchCard id: ${cardIdForError}) is missing 'fields'.`);
    }

    const { id, fields, settings = {}, priceLiterals } = fragment;
    const { variant } = fields;
    if (!variant) throw new Error(`hydrate: no variant found in payload ${id}`);
    cleanup(merchCard);
    merchCard.settings = settings;
    if (priceLiterals) merchCard.priceLiterals = priceLiterals;
    merchCard.id ??= fragment.id;
    merchCard.variant = variant;
    await merchCard.updateComplete;

    const { aemFragmentMapping: mapping } = merchCard.variantLayout;
    if (!mapping) throw new Error (`hydrate: variant mapping not found for ${id}`);

    if (mapping.style === 'consonant') {
        merchCard.setAttribute('consonant', true);
    }
    processMnemonics(fields, merchCard, mapping.mnemonics);
    processBadge(fields, merchCard, mapping);
    processTrialBadge(fields, merchCard, mapping);
    processSize(fields, merchCard, mapping.size);
    processTitle(fields, merchCard, mapping.title);
    processSubtitle(fields, merchCard, mapping);
    processPrices(fields, merchCard, mapping);
    processBackgroundImage(
        fields,
        merchCard,
        mapping.backgroundImage,
    );
    processBackgroundColor(fields, merchCard, mapping.allowedColors, mapping.backgroundColor);
    processBorderColor(fields, merchCard, mapping);
    processDescription(fields, merchCard, mapping);
    processAddon(fields, merchCard, mapping);
    processAddonConfirmation(fields, merchCard, mapping);
    processStockOffersAndSecureLabel(
        fields,
        merchCard,
        mapping,
        settings,
    );
    processUptLinks(fields, merchCard);
    processCTAs(fields, merchCard, mapping, variant);
    processAnalytics(fields, merchCard);
    updateLinksCSS(merchCard);
}
