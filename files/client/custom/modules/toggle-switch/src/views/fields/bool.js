/**
 * Toggle Switch for Boolean Fields – Boolean field view.
 *
 * Registered as the default view of the `bool` field type. When a field has
 * "Display as Toggle Switch" disabled, every method falls through to the core view,
 * so standard checkboxes behave exactly as before. Search filters always use the core control.
 */
define('toggle-switch:views/fields/bool', ['views/fields/bool', 'toggle-switch:helper'], (BoolFieldView, Helper) => {

    return class extends BoolFieldView {

        /**
         * Whether this field is configured to be shown as a toggle switch.
         *
         * @return {boolean}
         */
        isToggleDisplay() {
            return !!(this.params && this.params.displayAsToggle);
        }

        /**
         * @private
         * @param {string} mode
         * @return {boolean}
         */
        isToggleMode(mode) {
            return this.isToggleDisplay() &&
                [this.MODE_LIST, this.MODE_DETAIL, this.MODE_EDIT].includes(mode);
        }

        setMode(mode) {
            const promise = super.setMode(mode);

            // Called by the core during init (params are already resolved) and on every
            // detail ↔ edit switch. Content set after setTemplate takes precedence.
            if (this.isToggleMode(mode)) {
                this.setTemplateContent(Helper.TEMPLATE);
            }

            return promise;
        }

        /**
         * Whether a click in detail or list view saves the value immediately.
         *
         * @return {boolean}
         */
        isInstantSaveAvailable() {
            if (!this.isToggleDisplay() || !this.params.toggleInstantSave) {
                return false;
            }

            if (!this.isDetailMode() && !this.isListMode()) {
                return false;
            }

            if (this.readOnly || this.disabled || this.inlineEditDisabled) {
                return false;
            }

            if (!this.model.id || this.model.isNew()) {
                return false;
            }

            const entityType = this.entityType || this.model.entityType;

            if (!entityType) {
                return false;
            }

            const acl = this.getAcl();

            // List rows only carry the layout columns plus assignedUserId/createdById. For "team"
            // access, multiple assigned users and collaborators the client can't decide (null).
            // Then the click is allowed and the server decides; a refusal flips the switch back.
            if (acl.checkModel(this.model, 'edit', true) === false) {
                return false;
            }

            if (acl.getScopeForbiddenFieldList(entityType, 'edit').includes(this.name)) {
                return false;
            }

            return true;
        }

        data() {
            const data = super.data();

            if (!this.isToggleMode(this.mode)) {
                return data;
            }

            const config = Helper.getConfig(this.params, this.getLanguage(), this.entityType);

            if (this.isReadMode() && !data.valueIsSet) {
                data.tgsShow = false;
                data.tgsLoading = this.isDetailMode();

                return data;
            }

            const isInstant = this.isInstantSaveAvailable();

            // Keep list rows compact.
            const size = this.isListMode() && config.size === 'large' ? 'medium' : config.size;

            return {
                ...data,
                ...Helper.getTemplateData(config, {
                    isOn: !!this.model.get(this.name),
                    isEdit: this.isEditMode(),
                    isInteractive: this.isEditMode() || isInstant,
                    isInstant: isInstant,
                    size: size,
                    ariaLabel: this.getLabelText(),
                }),
            };
        }

        afterRender() {
            super.afterRender();

            if (!this.isToggleMode(this.mode)) {
                return;
            }

            this.syncCellState();

            if (!this.isReadMode()) {
                return;
            }

            const root = this.getRootElement();
            const input = root ? root.querySelector('input.tgs-input') : null;

            if (!input) {
                return;
            }

            // Keep clicks from reaching list-row or panel handlers.
            input.closest('label.tgs').addEventListener('click', e => e.stopPropagation());

            input.addEventListener('change', () => this.onInstantChange(input));
        }

        /**
         * Dynamic logic can make a field read-only while it is shown in detail mode.
         * The core does not re-render then, so the switch is (un)locked here.
         */
        setReadOnly(locked) {
            const result = super.setReadOnly(locked);

            this.syncInteractivity();

            return result;
        }

        setNotReadOnly() {
            const result = super.setNotReadOnly();

            this.syncInteractivity();

            return result;
        }

        /**
         * @private
         * @return {HTMLElement|null}
         */
        getRootElement() {
            return this.element || (this.$el && this.$el.get(0)) || null;
        }

        /**
         * @private
         * @return {HTMLElement|null}
         */
        getCellDomElement() {
            const cell = this.getCellElement ? this.getCellElement() : null;

            if (!cell) {
                return null;
            }

            // 9.x returns jQuery, 10.x returns an element.
            return cell.jquery ? (cell.get(0) || null) : cell;
        }

        /**
         * Hides the pencil (inline edit) link when a click already saves the value.
         *
         * @private
         */
        syncCellState() {
            const cell = this.getCellDomElement();

            if (!cell) {
                return;
            }

            cell.classList.toggle('tgs-cell-instant', this.isDetailMode() && this.isInstantSaveAvailable());
        }

        /** @private */
        syncInteractivity() {
            if (!this.isToggleMode(this.mode) || !this.isReadMode() || !this.isRendered()) {
                return;
            }

            const root = this.getRootElement();
            const input = root ? root.querySelector('input.tgs-input') : null;

            if (!input) {
                return;
            }

            const isInstant = this.isInstantSaveAvailable();

            input.disabled = !isInstant;
            input.closest('label.tgs').classList.toggle('tgs-interactive', isInstant);
            input.closest('label.tgs').classList.toggle('tgs-instant', isInstant);

            this.syncCellState();
        }

        /**
         * @private
         * @param {HTMLInputElement} input
         */
        async onInstantChange(input) {
            const value = input.checked;
            const previous = this.model.get(this.name);

            if (this._tgsSaving || !this.isInstantSaveAvailable()) {
                input.checked = !!previous;

                return;
            }

            if (!!previous === value) {
                return;
            }

            const label = input.closest('label.tgs');

            this._tgsSaving = true;
            label.classList.add('tgs-busy');

            let isSaved = false;

            try {
                isSaved = await this.saveInstantValue(value, {});
            }
            finally {
                this._tgsSaving = false;
                label.classList.remove('tgs-busy');
            }

            if (!isSaved) {
                this.model.set(this.name, previous, {fromField: this.name});
                input.checked = !!previous;

                return;
            }

            Espo.Ui.success(this.translate('Saved'));

            this.trigger('after:inline-save');
            this.trigger('after:save');
            this.model.trigger('after:save');

            // A server-side hook or formula may have set a different value.
            if (!!this.model.get(this.name) !== input.checked && this.isRendered()) {
                await this.reRender();
            }
        }

        /**
         * Saves the value. Handles the server's duplicate warning the same way EspoCRM's own
         * record save does ("Duplicate check on update"): the core dialog lists the possible
         * duplicates; Save sends again with the duplicate check skipped, Cancel keeps the old value.
         *
         * @private
         * @param {boolean} value
         * @param {Record<string, string>} extraHeaders
         * @return {Promise<boolean>} Whether the value was saved.
         */
        async saveInstantValue(value, extraHeaders) {
            const headers = {...extraHeaders};

            if (
                this.getMetadata().get(['entityDefs', this.entityType, 'optimisticConcurrencyControl']) &&
                this.model.get('versionNumber') != null
            ) {
                headers['X-Version-Number'] = this.model.get('versionNumber');
            }

            Espo.Ui.notify(this.translate('saving', 'messages'));

            try {
                // `fromField` keeps this view from re-rendering under the cursor.
                // Other views of the same record update as usual.
                await this.model.save({[this.name]: value}, {
                    patch: true,
                    fromField: this.name,
                    headers: headers,
                });

                return true;
            }
            catch (xhr) {
                const error = this.parseSaveError(xhr);

                if (error && error.reason === 'duplicate' && !extraHeaders['X-Skip-Duplicate-Check']) {
                    // Set before the global AJAX handler runs, so it doesn't show "Error 409".
                    xhr.errorIsHandled = true;

                    Espo.Ui.notify(false);

                    const confirmed = await this.confirmDuplicate(error.data);

                    if (!confirmed) {
                        return false;
                    }

                    return this.saveInstantValue(value, {...extraHeaders, 'X-Skip-Duplicate-Check': 'true'});
                }

                // Any other error: the core AJAX handler shows the message.
                return false;
            }
        }

        /**
         * Opens EspoCRM's own "The record ... might already exist" dialog.
         *
         * @private
         * @param {Object[]} duplicates
         * @return {Promise<boolean>} True if the user chose Save.
         */
        confirmDuplicate(duplicates) {
            return new Promise(resolve => {
                let confirmed = false;

                this.createView('tgsDuplicate', 'views/modals/duplicate', {
                    scope: this.entityType,
                    duplicates: Array.isArray(duplicates) ? duplicates : [],
                    model: this.model,
                })
                    .then(view => {
                        // `save` fires before the dialog closes; Cancel, × and Esc only close it.
                        this.listenToOnce(view, 'save', () => confirmed = true);
                        this.listenToOnce(view, 'close', () => resolve(confirmed));

                        return view.render();
                    })
                    .catch(() => resolve(false));
            });
        }

        /**
         * Reads the reason of a failed save the same way the core record view does.
         *
         * @private
         * @param {*} xhr
         * @return {{reason: string, data: *}|null}
         */
        parseSaveError(xhr) {
            if (!xhr || typeof xhr.getResponseHeader !== 'function' || ![409, 500].includes(xhr.status)) {
                return null;
            }

            const statusReason = xhr.getResponseHeader('X-Status-Reason');

            if (!statusReason) {
                return null;
            }

            let parsed = null;

            try {
                parsed = JSON.parse(statusReason);
            }
            catch (e) {}

            if (parsed && typeof parsed === 'object' && parsed.reason) {
                return {reason: parsed.reason, data: parsed.data};
            }

            let data = null;

            try {
                data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            }
            catch (e) {}

            return {reason: statusReason.toString(), data: data};
        }
    };
});
