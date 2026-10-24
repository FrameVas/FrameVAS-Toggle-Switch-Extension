/**
 * Toggle Switch – enum parameter in Field Manager.
 *
 * Fields created before the extension was installed have no value for these params.
 * A plain dropdown would then display its first option, which may differ from what
 * the switch actually uses. This view shows (and saves) the effective default instead.
 */
define('toggle-switch:views/admin/field-manager/fields/toggle-enum', ['views/fields/enum'], (EnumFieldView) => {

    return class extends EnumFieldView {

        setup() {
            super.setup();

            const value = this.model.get(this.name);
            const defaultValue = this.params.default;

            if (
                (value === null || value === undefined || value === '') &&
                defaultValue &&
                (this.params.options || []).includes(defaultValue)
            ) {
                this.model.set(this.name, defaultValue, {silent: true});
            }
        }
    };
});
