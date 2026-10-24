/**
 * Toggle Switch – YES/NO icon in Field Manager.
 *
 * Reuses EspoCRM's own icon field and icon library (the picker used for entity icons in
 * Entity Manager). Only difference: the change is flagged as a user edit, so Field Manager
 * tracks it as unsaved and the live preview updates.
 */
define(
    'toggle-switch:views/admin/field-manager/fields/toggle-icon',
    ['views/admin/entity-manager/fields/icon-class', 'toggle-switch:helper'],
    (IconClassFieldView, Helper) => {

    return class extends IconClassFieldView {

        selectIcon() {
            this.createView('dialog', 'views/admin/entity-manager/modals/select-icon', {})
                .then(view => {
                    this.listenToOnce(view, 'select', value => {
                        // "None" in the picker returns an empty string.
                        this.model.set(this.name, Helper.sanitizeIcon(value), {ui: true});

                        view.close();

                        // Changes flagged `ui` don't re-render the field by themselves.
                        this.reRender();
                    });

                    return view.render();
                });
        }

        fetch() {
            return {[this.name]: Helper.sanitizeIcon(this.model.get(this.name))};
        }
    };
});
