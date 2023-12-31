export default class Viewer {
    config = {
        elements: null,
        bs: null,
        dispatcher: null,
        graph: null,
        mermaid: null,
        apiInstance: null,
        storage: null,
    };

    constructor(config) {
        this.config = config;
    }

    initEvents() {
        const elements = this.config.elements;
        const mermaid = this.config.mermaid;
        const bs = this.config.bs;
        const graph = this.config.graph;
        const apiInstance = this.config.apiInstance;
        const storage = this.config.storage;
        const dispatcher = this.config.dispatcher;

        dispatcher.subscribe({
            channel: 'requests',
            topic: 'notify',
            callback: (msg) => this.notify(msg),
        });

        /** @see https://mermaid.js.org/config/schema-docs/config-defs-flowchart-diagram-config.html */
        mermaid.initialize({startOnLoad: false});

        const onShowDiagram = (e) => {
            e.stopPropagation();
            e.preventDefault();

            let jqlQuery = _.trim(elements.filterEl.value)

            if (!elements.userEl.value || !elements.tokenEl.value || !jqlQuery) {
                this.notify('[ERROR] Input values are not defined')

                return;
            }

            apiInstance.searchIssues(jqlQuery).then((response) => this.showDiagram(response));
        }

        document.getElementById('list-filters-btn')
            .addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                if (!elements.userEl.value || !elements.tokenEl.value || !elements.uriBaseEl.value) {
                    this.notify('[ERROR] Input values are not defined')

                    return;
                }

                bs.inCollapse.hide();
                apiInstance.listFilters().then((response) => this.showFilters(response));
            });

        document.getElementById('show-tasks-btn')
            .addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                let jqlQuery = _.trim(elements.filterEl.value)
                if (!elements.userEl.value || !elements.tokenEl.value || !jqlQuery) {
                    this.notify('[ERROR] Input values are not defined')

                    return;
                }

                bs.inCollapse.hide();
                apiInstance.searchIssues(jqlQuery).then((response) => this.showIssues(response));
            });

        elements.inputSaveEl.addEventListener('click', () => storage.saveInput());
        elements.inputRestoreEl.addEventListener('click', () => storage.restoreInput());
        elements.inputClearEl.addEventListener('click', () => {
            storage.clearInput();

            elements.notifyModalEl.querySelector('.modal-body').innerText = 'Form input storage is cleared!'
            bs.notifyModal.show();
        });

        document.getElementById('show-diagram-btn').addEventListener('click', onShowDiagram);
        document.getElementById('main-form').addEventListener('submit', onShowDiagram);

        document.getElementById('download-diagram-png-btn')
            .addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                try {
                    graph.makeDiagramUrl('png');
                } catch (e) {
                    console.error('[ERROR] ', e);
                    this.notify('[ERROR] ' + e.message);
                }
            });

        document.getElementById('download-diagram-svg-btn')
            .addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                try {
                    graph.makeDiagramUrl('svg');
                } catch (e) {
                    console.error('[ERROR] ', e);
                    this.notify('[ERROR] ' + e.message);
                }
            });

        document.getElementById('render-diagram-btn')
            .addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const diagramContent = elements.inEl.value.trim();
                if (!diagramContent) {
                    this.notify('Click "Show diagram" button or edit manually "Input" before trying to render');

                    return;
                }

                try {
                    bs.outCollapse.show();
                    // TODO: move to graph.js module. Together with mermaid calls
                    try {
                        mermaid.mermaidAPI.setConfig(JSON.parse(elements.cfgEl.value.trim()));
                    } catch (e) {
                        this.notify(`Invalid diagram configuration JSON format.\n${e.message}`);

                        return;
                    }

                    this.renderDiagram(diagramContent);
                } catch (e) {
                    console.error('[ERROR] ', e);
                    this.notify('[ERROR] ' + e.message);
                }
            });
    }

    showIssues(data) {
        const elements = this.config.elements;
        const utils = this.config.utils;

        let tplEl = document.getElementById('issue-tpl')
        let issueTplEl = document.getElementById('issue-link-tpl')
        let extraParams = utils.parseExtraParams();

        elements.outEl.innerHTML = `<div class="text-end counter">${data.issues.length} issues found</div>`; // clear input

        data.issues.forEach(function (item) {
            let el = tplEl.content.cloneNode(true);
            el.querySelector('.card-header').innerText = utils.makeTitle(item, elements.shortIssueEl.checked, false);
            el.querySelector('.issue-desc').innerText = _.truncate(item.fields.description, {length: 300});
            el.querySelector('.issue-self').href = utils.makeIssueHref(item);

            let parentEl = el.querySelector('.issue-parent');
            if (!item.fields.parent) {
                parentEl.parentNode.removeChild(parentEl);
            } else {
                let parentInfo = item.fields.parent;
                parentEl.href = utils.makeIssueHref(parentInfo);
                parentEl.title = utils.makeTitle(parentInfo, true, false);
            }

            let linksEl = el.querySelector('.issue-links');

            let linksCount = 0;
            if (item.fields.issuelinks && item.fields.issuelinks.length > 0) {
                item.fields.issuelinks.forEach(function (ref) {
                    let issue;
                    let refType;

                    if (ref.outwardIssue) {
                        issue = ref.outwardIssue;
                        refType = ref.type.outward;
                    } else {
                        issue = ref.inwardIssue;
                        refType = ref.type.inward;
                    }

                    if (_.get(item, 'fields.parent.id') === issue.id) {
                        return; // if references parent issue then skip
                    }

                    let itemEl = issueTplEl.content.cloneNode(true);

                    itemEl.querySelector('.issue-label').innerText = refType;

                    let linkEl = itemEl.querySelector('.issue-ref');
                    linkEl.innerText = utils.makeTitle(issue, true, false);
                    linkEl.href = utils.makeIssueHref(issue);

                    linksEl.appendChild(itemEl);
                    linksCount += 1;
                });
            }

            if (linksCount === 0) {
                linksEl.parentNode.removeChild(linksEl);

                let refHeaderEl = el.querySelector('.issue-ref-header');
                refHeaderEl.parentNode.removeChild(refHeaderEl);
            }

            let extraParamsContainer = el.querySelector('.issue-extra');
            if (extraParams.length > 0) {
                extraParams.forEach((param) => {
                    let subEl = document.createElement('DIV');
                    subEl.classList.add('row', 'mb-2');
                    let val = _.get(item, param.path);
                    if (typeof val === 'object') {
                        val = JSON.stringify(val);
                    }

                    subEl.innerHTML = `<div class="col-2"><strong>${param.label}</strong></div><div class="col-10">${val}</div>`;

                    extraParamsContainer.appendChild(subEl);
                });
            } else {
                extraParamsContainer.parentNode.removeChild(extraParamsContainer);
            }

            elements.outEl.appendChild(el.firstElementChild)
        });

        this.config.bs.outCollapse.show();
    }

    showFilters(data) {
        const elements = this.config.elements;
        const bs = this.config.bs;

        elements.outEl.innerHTML = '';
        if (!data) {
            bs.outCollapse.show();

            return;
        }

        let tplEl = document.getElementById('filter-tpl');

        data.forEach(function (item) {
            let el = tplEl.content.cloneNode(true)
            el.querySelector('.card-title').innerText = '[' + item.id + '] ' + item.name;
            el.querySelector('.filter-desc').innerText = item.description;
            el.querySelector('.filter-code').innerText = item.jql;
            el.querySelector('.filter-self').href = item.self;
            el.querySelector('.filter-search').href = item.searchUrl;
            el.querySelector('.filter-issues').href = item.viewUrl;

            elements.outEl.appendChild(el.firstElementChild)
        });

        bs.outCollapse.show();
    }

    showDiagram(data) {
        const elements = this.config.elements;
        const bs = this.config.bs;

        elements.outEl.innerHTML = '';

        if (!data) {
            this.notify('No issues found for the query');
            bs.outCollapse.show();

            return;
        }

        if (data.total >= data.maxResults) {
            this.notify('Reached page items limit. Not all issues will be displayed. Update JQL query if possible');
        }

        let tplEl = document.getElementById('mermaid-tpl');
        let el = tplEl.content.cloneNode(true);

        elements.outEl.appendChild(el.firstElementChild);
        bs.outCollapse.show();

        this.config.graph.makeDiagram(data.issues).then((diagram) => {
            const promise = this.renderDiagram(diagram);

            if (promise) {
                promise.then(() => {elements.inEl.value = diagram});
            }
        });
    }

    renderDiagram(diagram) {
        const elements = this.config.elements;
        const mermaid = this.config.mermaid;

        try {
            mermaid.mermaidAPI.setConfig(JSON.parse(elements.cfgEl.value.trim()));
        } catch (e) {
            this.notify(`Invalid diagram configuration JSON format.\n${e.message}`);

            return null;
        }

        return mermaid.render('mermaid', diagram)
            .then((v) => {
                elements.outEl.innerHTML = v.svg;
                // console.log('[RENDER]', elements.outEl.innerHTML);

                return v;
            }).catch((e) => {
                console.error('[ERROR] ', e);
                this.notify('[ERROR] ' + e.message);
            });
    }

    notify(msg) {
        this.config.elements.notifyModalEl.querySelector('.modal-body').innerText = msg;
        this.config.bs.notifyModal.show();
    }
}
