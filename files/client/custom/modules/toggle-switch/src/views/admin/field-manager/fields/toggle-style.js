/**
 * Toggle Switch – YES/NO color picker in Field Manager.
 *
 * Same list, order, names and look as EspoCRM's own option style picker
 * (Entity Manager → Enum field → Options): Default, Success, Danger, Warning, Info, Primary,
 * each shown in its color, with a check mark on the selected one.
 * Names come from the core translation (LayoutManager → options → style).
 */
define(
    'toggle-switch:views/admin/field-manager/fields/toggle-style',
    ['views/fields/base', 'toggle-switch:helper'],
    (BaseFieldView, Helper) => {

    const ITEMS_TEMPLATE =
        '{{#each items}}' +
        '<li><a role="button" tabindex="0" data-action="selectToggleStyle" data-style="{{style}}">' +
            '<span class="check-icon fas fa-check pull-right{{#unless selected}} hidden{{/unless}}"></span>' +
            '<div class="text-{{style}}">{{label}}</div>' +
        '</a></li>' +
        '{{/each}}';

    return class extends BaseFieldView {

        editTemplateContent =
            '<div class="btn-group tgs-style-picker">' +
                '<button type="button" class="form-control dropdown-toggle tgs-style-button"' +
                    ' data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
                    '<span class="tgs-style-current text-{{style}}">{{label}}</span>' +
                    '<span class="caret"></span>' +
                '</button>' +
                '<ul class="dropdown-menu tgs-style-menu">' + ITEMS_TEMPLATE + '</ul>' +
            '</div>'

        detailTemplateContent = '<span class="text-{{style}}">{{label}}</span>'

        setup() {
            super.setup();

            // Fields saved before this setting existed show (and save) the real default.
            if (!Helper.STYLE_LIST.includes(this.model.get(this.name))) {
                this.model.set(this.name, this.getDefaultStyle(), {silent: true});
            }

            this.addActionHandler('selectToggleStyle', (e, target) => {
                this.selectStyle(target.dataset.style);
            });
        }

        /**
         * @private
         * @return {string}
         */
        getDefaultStyle() {
            const value = this.params.default;

            return Helper.STYLE_LIST.includes(value) ? value : 'default';
        }

        /**
         * @private
         * @return {string}
         */
        getStyle() {
            const value = this.model.get(this.name);

            return Helper.STYLE_LIST.includes(value) ? value : this.getDefaultStyle();
        }

        /**
         * @private
         * @param {string} style
         * @return {string}
         */
        translateStyle(style) {
            return this.getLanguage().translateOption(style, 'style', 'LayoutManager');
        }

        data() {
            const style = this.getStyle();

            return {
                style: style,
                label: this.translateStyle(style),
                items: Helper.STYLE_LIST.map(item => ({
                    style: item,
                    label: this.translateStyle(item),
                    selected: item === style,
                })),
            };
        }

        /**
         * @private
         * @param {string} style
         */
        selectStyle(style) {
            if (!Helper.STYLE_LIST.includes(style) || style === this.getStyle()) {
                return;
            }

            // `ui: true` marks the Field Manager form as changed; the preview listens to it too.
            this.model.set(this.name, style, {ui: true});

            this.reRender().then(() => {
                const root = this.element || (this.$el && this.$el.get(0));
                const button = root && root.querySelector('.tgs-style-button');

                if (button) {
                    button.focus();
                }
            });
        }

        focusOnInlineEdit() {
            const root = this.element || (this.$el && this.$el.get(0));
            const button = root && root.querySelector('.tgs-style-button');

            if (button) {
                button.focus();
            }
        }

        fetch() {
            return {[this.name]: this.getStyle()};
        }
    };
});
