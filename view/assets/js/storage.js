export default class StorageProcessor {
    config = {
        elements: {},
        defaults: {
            uri: null,
            user: null,
            token: null,
            mermaidCfg: null,
            input: null,
        },
        dispatcher: null,
    }
    constructor(config) {
        this.initialize(config);
    }

    initialize(config) {
        this.config = _.assign(this.config, config);
    }

    notify(message) {
        this.config.dispatcher.publish({
            channel: 'requests',
            topic: 'notify',
            data: message,
        });
    }

    saveInput() {
        const data = {
            uri: _.get(this.config, 'elements.uriBaseEl.value'),
            user: _.get(this.config, 'elements.userEl.value'),
            token: _.get(this.config, 'elements.tokenEl.value'),
            filter: _.get(this.config, 'elements.filterEl.value'),
            hideParents: _.get(this.config, 'elements.hideParentsEl.checked'),
            hideTests: _.get(this.config, 'elements.hideTestsEl.checked'),
            openImage: _.get(this.config, 'elements.openImgEl.checked'),
            shortIssue: _.get(this.config, 'elements.shortIssueEl.checked'),
            disableIcons: _.get(this.config, 'elements.disableIconsEl.checked'),
            extraParams: _.get(this.config, 'elements.extraParamsEl.value'),
            showMatched: _.get(this.config, 'elements.showMatchedEl.checked'),
            mermaidCfg: _.get(this.config, 'elements.cfgEl.value', '').trim(),
            input: _.get(this.config, 'elements.inEl.value', '').trim(),
        };

        if (data.mermaidCfg) {
            try {
                data.mermaidCfg = JSON.parse(data.mermaidCfg);
            } catch (e) {
                this.notify(`Invalid diagram configuration JSON format.\n${e.message}`);

                return;
            }
        }

        localStorage.setItem('input', JSON.stringify(data));

        this.config.dispatcher.publish({
            channel: 'requests',
            topic: 'notify',
            data: 'Form input is stored!',
        });
    }

    restoreInput(silent) {
        let input = localStorage.getItem('input');

        if (!input) {
            if (typeof silent === 'undefined' || !silent) {
                this.notify('Storage is empty');
            }

            return;
        }

        input = JSON.parse(input)

        this.config.elements.uriBaseEl.value = input.uri
        this.config.elements.userEl.value = input.user
        this.config.elements.tokenEl.value = input.token
        this.config.elements.filterEl.value = input.filter
        this.config.elements.hideParentsEl.checked = !!input.hideParents;
        this.config.elements.hideTestsEl.checked = !!input.hideTests;
        this.config.elements.openImgEl.checked = !!input.openImage;
        this.config.elements.shortIssueEl.checked = !!input.shortIssue;
        this.config.elements.disableIconsEl.checked = !!input.disableIcons;
        this.config.elements.extraParamsEl.value = !!input.extraParams ? input.extraParams : '';
        this.config.elements.showMatchedEl.checked = !!input.showMatched;
        this.config.elements.cfgEl.value = JSON.stringify(
            !!input.mermaidCfg ? input.mermaidCfg : this.config.defaults.mermaidCfg,
            null,
            4
        );
        this.config.elements.inEl.value = !!input.input ? input.input : this.config.defaults.input;
    }

    clearInput() {
        localStorage.clear();

        this.config.elements.uriBaseEl.value = this.config.defaults.uri;
        this.config.elements.userEl.value = this.config.defaults.user;
        this.config.elements.tokenEl.value = this.config.defaults.token;
        this.config.elements.filterEl.value = ''
        this.config.elements.hideParentsEl.checked = false;
        this.config.elements.hideTestsEl.checked = false;
        this.config.elements.openImgEl.checked = false;
        this.config.elements.shortIssueEl.checked = false;
        this.config.elements.extraParamsEl.value = '';
        this.config.elements.showMatchedEl.checked = false;
        this.config.elements.cfgEl.checked = this.config.defaults.mermaidCfg;
        this.config.elements.inEl.value = this.config.defaults.input;
    }
}
