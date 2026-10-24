/**
 * Toggle Switch for Boolean Fields – shared rendering helper.
 *
 * Used by the Boolean field view and by the Field Manager preview.
 */
define('toggle-switch:helper', [], () => {

    const SIZE_LIST = ['small', 'medium', 'large'];
    // Same order as EspoCRM's own option style picker.
    const STYLE_LIST = ['default', 'success', 'danger', 'warning', 'info', 'primary'];

    /** Theme-aware colors. Fallbacks are the default Espo theme values. */
    const STYLE_BG = {
        success: 'var(--brand-success, #6fc374)',
        primary: 'var(--brand-primary, #6092d0)',
        info: 'var(--brand-info, #a595c9)',
        warning: 'var(--brand-warning, #e4a133)',
        danger: 'var(--brand-danger, #d7657d)',
        default: 'var(--label-default-bg, #999999)',
    };

    const STYLE_FG = {
        success: 'var(--btn-success-color, #ffffff)',
        primary: 'var(--btn-primary-color, #ffffff)',
        info: 'var(--btn-info-color, #ffffff)',
        warning: 'var(--btn-warning-color, #ffffff)',
        danger: 'var(--btn-danger-color, #ffffff)',
        default: '#ffffff',
    };

    const LABEL_SCOPE = 'ToggleSwitch';

    /** EspoCRM's icon library classes, e.g. "fas fa-check" or "far fa-circle". */
    const ICON_RE = /^(fas|far|fab) fa-[a-z0-9-]+$/;

    /**
     * One template for list, detail and edit modes. All dynamic values are escaped by Handlebars.
     * The native checkbox carries the state, so CSS (`:checked`) drives the visuals without re-rendering.
     */
    const TEMPLATE =
        '{{#if tgsShow}}' +
        '<label class="tgs tgs-{{tgsSize}}{{#if tgsInteractive}} tgs-interactive{{/if}}' +
            '{{#if tgsInstant}} tgs-instant{{/if}}" style="{{tgsStyle}}">' +
        '<input type="checkbox" role="switch" class="tgs-input{{#if tgsEdit}} main-element{{/if}}"' +
            '{{#if tgsEdit}} data-name="{{name}}"{{/if}}' +
            '{{#if tgsOn}} checked{{/if}}' +
            '{{#unless tgsInteractive}} disabled{{/unless}}' +
            ' aria-label="{{tgsAriaLabel}}">' +
        '<span class="tgs-track" aria-hidden="true">' +
            '<span class="tgs-text tgs-text-on">' +
                '{{#if tgsOnIcon}}<span class="tgs-icon {{tgsOnIcon}}"></span>{{/if}}' +
                '{{#if tgsOnText}}<span class="tgs-label">{{tgsOnText}}</span>{{/if}}' +
            '</span>' +
            '<span class="tgs-text tgs-text-off">' +
                '{{#if tgsOffIcon}}<span class="tgs-icon {{tgsOffIcon}}"></span>{{/if}}' +
                '{{#if tgsOffText}}<span class="tgs-label">{{tgsOffText}}</span>{{/if}}' +
            '</span>' +
            '<span class="tgs-knob"></span>' +
        '</span>' +
        '</label>' +
        '{{else}}{{#if tgsLoading}}<span class="loading-value"></span>{{/if}}{{/if}}';

    /**
     * @param {*} value
     * @return {string|null} A valid icon class or null.
     */
    function sanitizeIcon(value) {
        if (typeof value !== 'string') {
            return null;
        }

        const icon = value.trim().replace(/\s+/g, ' ');

        return ICON_RE.test(icon) ? icon : null;
    }

    /**
     * Text shown inside the switch. Empty → translated default (or nothing when an icon is set). Text matching a known label
     * (this extension's labels, then the entity's, then global) is shown in the user's language.
     *
     * @param {module:language} language
     * @param {string|null} raw
     * @param {'Yes'|'No'} fallbackKey
     * @param {string|null} entityType
     * @param {boolean} [hasIcon]
     * @return {string}
     */
    function resolveText(language, raw, fallbackKey, entityType, hasIcon) {
        const text = typeof raw === 'string' ? raw.trim() : '';

        if (text === '') {
            // With an icon and no text, only the icon is shown.
            return hasIcon ? '' : language.translate(fallbackKey, 'labels', LABEL_SCOPE);
        }

        if (language.has(text, 'labels', LABEL_SCOPE)) {
            return language.translate(text, 'labels', LABEL_SCOPE);
        }

        if (entityType && language.has(text, 'labels', entityType)) {
            return language.translate(text, 'labels', entityType);
        }

        if (language.has(text, 'labels', 'Global')) {
            return language.translate(text, 'labels', 'Global');
        }

        return text;
    }

    /**
     * @param {Record<string, *>} params Field params.
     * @param {module:language} language
     * @param {string|null} [entityType]
     * @return {{
     *     size: string,
     *     onIcon: string|null,
     *     offIcon: string|null,
     *     onText: string,
     *     offText: string,
     *     onBg: string,
     *     onFg: string,
     *     offBg: string,
     *     offFg: string,
     * }}
     */
    function getConfig(params, language, entityType) {
        params = params || {};

        const size = SIZE_LIST.includes(params.toggleSize) ? params.toggleSize : 'medium';
        const onStyle = STYLE_LIST.includes(params.toggleOnStyle) ? params.toggleOnStyle : 'success';
        const offStyle = STYLE_LIST.includes(params.toggleOffStyle) ? params.toggleOffStyle : 'default';

        const onIcon = sanitizeIcon(params.toggleOnIcon);
        const offIcon = sanitizeIcon(params.toggleOffIcon);

        return {
            size: size,
            onIcon: onIcon,
            offIcon: offIcon,
            onText: resolveText(language, params.toggleOnLabel, 'Yes', entityType || null, !!onIcon),
            offText: resolveText(language, params.toggleOffLabel, 'No', entityType || null, !!offIcon),
            onBg: STYLE_BG[onStyle],
            onFg: STYLE_FG[onStyle],
            offBg: STYLE_BG[offStyle],
            offFg: STYLE_FG[offStyle],
        };
    }

    /**
     * @param {ReturnType<getConfig>} config
     * @param {{
     *     isOn: boolean,
     *     isEdit?: boolean,
     *     isInteractive?: boolean,
     *     isInstant?: boolean,
     *     size?: string,
     *     ariaLabel?: string,
     * }} state
     * @return {Record<string, *>}
     */
    function getTemplateData(config, state) {
        return {
            tgsShow: true,
            tgsSize: state.size || config.size,
            tgsOn: !!state.isOn,
            tgsEdit: !!state.isEdit,
            tgsInteractive: !!state.isInteractive,
            tgsInstant: !!state.isInstant,
            tgsOnText: config.onText,
            tgsOffText: config.offText,
            tgsOnIcon: config.onIcon,
            tgsOffIcon: config.offIcon,
            tgsAriaLabel: state.ariaLabel || '',
            tgsStyle:
                `--tgs-on-bg: ${config.onBg}; --tgs-on-fg: ${config.onFg}; ` +
                `--tgs-off-bg: ${config.offBg}; --tgs-off-fg: ${config.offFg};`,
        };
    }

    return {
        TEMPLATE: TEMPLATE,
        SIZE_LIST: SIZE_LIST,
        STYLE_LIST: STYLE_LIST,
        getConfig: getConfig,
        getTemplateData: getTemplateData,
        sanitizeIcon: sanitizeIcon,
    };
});
