/**
 * Toggle Switch – live preview in Field Manager.
 *
 * Shows the YES and NO states with the settings currently entered in the form.
 * Read-only; nothing is saved from this view.
 */
define(
    'toggle-switch:views/admin/field-manager/fields/toggle-preview',
    ['views/fields/base', 'toggle-switch:helper'],
    (BaseFieldView, Helper) => {

    const WATCHED_ATTRIBUTES = [
        'displayAsToggle',
        'toggleSize',
        'toggleOnLabel',
        'toggleOnIcon',
        'toggleOnStyle',
        'toggleOffLabel',
        'toggleOffIcon',
        'toggleOffStyle',
    ];

    return class extends BaseFieldView {

        detailTemplateContent =
            '<div class="tgs-preview{{#unless enabled}} tgs-preview-inactive{{/unless}}">' +
                '{{#each items}}<span class="tgs-preview-item">' + Helper.TEMPLATE + '</span>{{/each}}' +
            '</div>' +
            '{{#unless enabled}}<div class="text-muted small tgs-preview-note">{{note}}</div>{{/unless}}'

        editTemplateContent = this.detailTemplateContent

        setup() {
            super.setup();

            this.listenTo(this.model, 'change', model => {
                if (!WATCHED_ATTRIBUTES.some(attribute => model.hasChanged(attribute))) {
                    return;
                }

                if (this.isRendered()) {
                    this.reRender();
                }
            });
        }

        data() {
            const params = {};

            WATCHED_ATTRIBUTES.forEach(attribute => params[attribute] = this.model.get(attribute));

            const scope = this.options.scope || null;
            const config = Helper.getConfig(params, this.getLanguage(), scope);

            return {
                enabled: !!params.displayAsToggle,
                note: this.translate('previewInactive', 'messages', 'ToggleSwitch'),
                items: [
                    Helper.getTemplateData(config, {isOn: true, ariaLabel: config.onText}),
                    Helper.getTemplateData(config, {isOn: false, ariaLabel: config.offText}),
                ],
            };
        }

        fetch() {
            return {};
        }
    };
});
