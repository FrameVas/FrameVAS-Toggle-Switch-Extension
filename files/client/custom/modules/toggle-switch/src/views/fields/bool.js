/**
 * Toggle Switch for Boolean Fields – Boolean field view.
 *
 * Registered as the default view of the `bool` field type. When a field has
 * "Display as Toggle Switch" disabled, every method falls through to the core view,
 * so standard checkboxes behave exactly as before. Search filters always use the core control.
 */
define(
    'toggle-switch:views/fields/bool',
    ['views/fields/bool', 'toggle-switch:helper', 'dynamic-logic'],
    (BoolFieldView, Helper, DynamicLogic) => {

    /**
     * Collects the record attributes a Dynamic Logic condition group reads.
     * Special attributes such as $user.id and $user.teamsIds are not record data.
     *
     * @param {*} item
     * @param {Set<string>} result
     */
    function collectAttributes(item, result) {
        if (!item || typeof item !== 'object') {
            return;
        }

        if (Array.isArray(item)) {
            item.forEach(it => collectAttributes(it, result));

            return;
        }

        if (['and', 'or', 'not'].includes(item.type)) {
            collectAttributes(item.value, result);

            return;
        }

        if (typeof item.attribute === 'string' && item.attribute && !item.attribute.startsWith('$')) {
            result.add(item.attribute);
        }
    }

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

            if (this.disabled || this.inlineEditDisabled) {
                return false;
            }

            if (this.isListMode()) {
                // List rows and Kanban cards. Kanban creates every card field with `readOnly: true`
                // only to display it, so here the field's own read-only settings count
                // (read-only, read-only after create), plus Dynamic Logic, which the core runs
                // on record pages only.
                if (this.readOnlyLocked) {
                    return false;
                }

                // true: read-only by a rule; null: the data a rule needs is still loading.
                if (this.getLogicReadOnlyState() !== false) {
                    return false;
                }
            }
            else if (this.readOnly) {
                // Record page: the record view already applies Dynamic Logic via setReadOnly().
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

            let access = acl.checkModel(this.model, 'edit', true);

            if (access === null && this.isListMode()) {
                // List rows only carry the layout columns plus assignedUserId/createdById. "Team"
                // access, multiple assigned users and collaborators need more: load it for the
                // whole list (one request), keeping the switch locked meanwhile.
                const aclAttributes = this.getAclAttributes();

                if (aclAttributes.length && !this.isLogicDataReady(this.model, aclAttributes)) {
                    const request = this.loadLogicData(aclAttributes);

                    if (!request.settled) {
                        request.promise.then(() => this.syncInteractivity());
                    }

                    return false;
                }

                access = acl.checkModel(this.model, 'edit', true);
            }

            // Still undecidable (e.g. the user can't read teams): the click is allowed and the
            // server decides; a refusal flips the switch back.
            if (access === false) {
                return false;
            }

            if (acl.getScopeForbiddenFieldList(entityType, 'edit').includes(this.name)) {
                return false;
            }

            return true;
        }

        /**
         * Record attributes EspoCRM's access check uses besides assignedUserId/createdById.
         *
         * @private
         * @return {string[]}
         */
        getAclAttributes() {
            const entityType = this.entityType || this.model.entityType;
            const fields = this.getMetadata().get(['entityDefs', entityType, 'fields']) || {};

            return [
                ['teams', 'teamsIds'],
                ['assignedUsers', 'assignedUsersIds'],
                ['collaborators', 'collaboratorsIds'],
            ]
                .filter(([field]) => fields[field] && !fields[field].disabled)
                .map(([, attribute]) => attribute)
                .sort();
        }

        /**
         * The field's read-only Dynamic Logic conditions: "Conditions making field read-only" and,
         * in EspoCRM 9.1+, "Saved state conditions making field read-only".
         * 9.0 keeps the rules in clientDefs, newer versions in logicDefs.
         *
         * @private
         * @return {Array[]} Condition groups.
         */
        getReadOnlyConditionGroups() {
            const entityType = this.entityType || this.model.entityType;

            const defs =
                this.getMetadata().get(['logicDefs', entityType]) ||
                this.getMetadata().get(['clientDefs', entityType, 'dynamicLogic']) ||
                {};

            const item = (defs.fields || {})[this.name] || {};

            return ['readOnly', 'readOnlySaved']
                .map(type => item[type] && item[type].conditionGroup)
                .filter(group => Array.isArray(group) && group.length);
        }

        /**
         * Whether Dynamic Logic makes the field read-only for this record.
         * List rows and Kanban cards only hold saved data, so "saved state" rules are evaluated
         * against the same values as on the record page.
         *
         * @private
         * @return {boolean|null} Null while data needed by a rule is being loaded.
         */
        getLogicReadOnlyState() {
            const groups = this.getReadOnlyConditionGroups();

            if (!groups.length) {
                return false;
            }

            const attributeSet = new Set();

            groups.forEach(group => collectAttributes(group, attributeSet));

            const attributes = [...attributeSet].sort();

            if (!this.isLogicDataReady(this.model, attributes)) {
                const request = this.loadLogicData(attributes);

                // Re-check once the data arrives. A failed request stays settled without data,
                // so the switch simply stays locked (no retry loop).
                if (!request.settled) {
                    request.promise.then(() => this.syncInteractivity());
                }

                return null;
            }

            // EspoCRM's own condition evaluation. It reads the record and the current user
            // ($user.id, $user.teamsIds) through this minimal record-view interface.
            const recordView = {
                model: this.model,
                getUser: () => this.getUser(),
                getPreSaveAttributes: () => ({...this.model.attributes}),
                getMetadata: () => this.getMetadata(),
                getFieldManager: () => this.getFieldManager(),
                getAcl: () => this.getAcl(),
                getConfig: () => this.getConfig(),
            };

            try {
                const logic = new DynamicLogic({}, recordView);

                return groups.some(group => logic.checkConditionGroup(group));
            }
            catch (e) {
                console.error('Toggle Switch: could not evaluate Dynamic Logic.', e);

                // Fail safe: keep the switch locked rather than bypass a rule.
                return true;
            }
        }

        /**
         * @private
         * @param {module:model} model
         * @param {string[]} attributes
         * @return {boolean}
         */
        isLogicDataReady(model, attributes) {
            const key = attributes.join(',');

            if (model._tgsLogicLoaded && model._tgsLogicLoaded[key]) {
                return true;
            }

            return attributes.every(attribute => model.has(attribute));
        }

        /**
         * Loads attributes used by Dynamic Logic that are not list columns. One request covers all
         * rows of the list (or Kanban column) that miss them; rows share the pending request.
         *
         * @private
         * @param {string[]} attributes
         * @return {{promise: Promise, settled: boolean}}
         */
        loadLogicData(attributes) {
            const key = attributes.join(',');
            const collection = this.model.collection;
            const holder = collection || this.model;
            const store = holder._tgsLogicRequests || (holder._tgsLogicRequests = {});
            const requestKey = key + '|' + this.model.id;

            if (store[requestKey]) {
                return store[requestKey];
            }

            const candidates = collection && Array.isArray(collection.models) ?
                collection.models : [this.model];

            if (!candidates.includes(this.model)) {
                candidates.push(this.model);
            }

            const targets = candidates.filter(model =>
                model.id &&
                !store[key + '|' + model.id] &&
                !this.isLogicDataReady(model, attributes)
            );

            const entityType = this.entityType || this.model.entityType;

            const request = {promise: null, settled: false};

            request.promise = Espo.Ajax
                .getRequest(entityType, {
                    select: ['id', ...attributes].join(','),
                    maxSize: targets.length,
                    where: [{type: 'in', attribute: 'id', value: targets.map(model => model.id)}],
                })
                .then(response => {
                    const rows = {};

                    ((response && response.list) || []).forEach(row => rows[row.id] = row);

                    targets.forEach(model => {
                        const row = rows[model.id] || {};
                        const values = {};

                        attributes
                            .filter(attribute => !model.has(attribute) && attribute in row)
                            .forEach(attribute => values[attribute] = row[attribute]);

                        if (Object.keys(values).length) {
                            model.set(values, {silent: true});
                        }

                        // Attributes the user may not read stay absent, as on the record page.
                        model._tgsLogicLoaded = model._tgsLogicLoaded || {};
                        model._tgsLogicLoaded[key] = true;
                    });
                })
                .catch(xhr => {
                    // Background check only: no error popup.
                    if (xhr && typeof xhr === 'object') {
                        xhr.errorIsHandled = true;
                    }
                })
                .then(() => request.settled = true);

            targets.forEach(model => store[key + '|' + model.id] = request);

            return store[requestKey] || request;
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

            const label = input.closest('label.tgs');

            // Keep clicks from reaching list-row, Kanban card or panel handlers.
            label.addEventListener('click', e => e.stopPropagation());

            // An active switch must not start dragging the Kanban card it sits on.
            const stopDrag = e => {
                if (!input.disabled) {
                    e.stopPropagation();
                }
            };

            label.addEventListener('mousedown', stopDrag);
            label.addEventListener('touchstart', stopDrag, {passive: true});

            input.addEventListener('change', () => this.onInstantChange(input));

            // Data needed by a Dynamic Logic rule may have arrived during rendering.
            this.syncInteractivity();
        }

        setup() {
            super.setup();

            if (!this.isToggleDisplay() || !this.params.toggleInstantSave) {
                return;
            }

            // Re-check rules when other values of the record change, e.g. a Kanban card moved
            // to another column or another field saved. The field's own value re-renders anyway.
            this.listenTo(this.model, 'change', () => {
                if (this.isListMode()) {
                    this.syncInteractivity();
                }
            });
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

                return;
            }

            // A Dynamic Logic rule may depend on the value just saved.
            this.syncInteractivity();
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
