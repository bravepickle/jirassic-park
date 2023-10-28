import api from "./api.js";
import StorageProcessor from "./storage.js";
import UtilsClass from "./utils.js";
import GraphClass from "./graph.js";

(function () {
    const elements = {};
    const bs = {};

    elements.uriBaseEl = document.getElementById('uri');
    elements.userEl = document.getElementById('user');
    elements.tokenEl = document.getElementById('token');
    elements.filterEl = document.getElementById('filter');
    elements.hideParentsEl = document.getElementById('hide-parents');
    elements.hideTestsEl = document.getElementById('hide-tests');
    elements.openImgEl = document.getElementById('open-image');
    elements.shortIssueEl = document.getElementById('short-issue-desc');
    elements.disableIconsEl = document.getElementById('disable-icons');
    elements.extraParamsEl = document.getElementById('issue-extra-fields');
    elements.showMatchedEl = document.getElementById('show-matched');

    elements.inputSaveEl = document.getElementById('input-save-btn');
    elements.inputRestoreEl = document.getElementById('input-restore-btn');
    elements.inputClearEl = document.getElementById('input-clear-btn');

    elements.notifyModalEl = document.getElementById('notifyModal');
    bs.notifyModal = new bootstrap.Modal(elements.notifyModalEl);

    elements.inEl = document.getElementById('input');
    bs.inCollapse = new bootstrap.Collapse(elements.inEl, {toggle: false});

    elements.outEl = document.getElementById('output');
    bs.outCollapse = new bootstrap.Collapse(elements.outEl, {toggle: false});

    const eventDispatcher = postal;

    eventDispatcher.subscribe({
        channel: 'requests',
        topic: 'notify',
        callback: (message) => notify(message),
    });

    const apiInstance = api({
        uriBaseCallback: () => _.trimEnd(elements.uriBaseEl.value, '/'),
        apiUserCallback: () => elements.userEl.value,
        apiPasswordCallback: () => elements.tokenEl.value,
        onError: function (e) {
            console.error('[ERROR]', e);
            const msg = [e.message].concat(_.get(e, 'response.data.errorMessages', []));
            notify('[ERROR] ' + msg.join("\n"));

            return Promise.reject(e);
        },
        dispatcher: eventDispatcher,
    });

    const storage = new StorageProcessor({
        elements: elements,
        defaults: {
            uri: '{{ .uri }}',
            user: '{{ .user }}',
            token: '{{ .token }}',
        },
        dispatcher: eventDispatcher,
    });

    const utils = new UtilsClass(elements, {jiraUri: jiraUri});
    const graph = new GraphClass(eventDispatcher, utils, elements, apiInstance);

    document.addEventListener('DOMContentLoaded', function () {
        mermaid.initialize({
            startOnLoad: false,
            flowchart: {useMaxWidth: true, htmlLabels: true},
            securityLevel: 'loose',
            // theme: 'base',
            // theme: 'forest',
        });

        // mermaid.flowchartConfig = {
        //     width: 100%
        // };

        document.getElementById('list-filters-btn')
            .addEventListener('click', function onListFiltersClick(e) {
                e.stopPropagation();
                e.preventDefault();

                if (!elements.userEl.value || !elements.tokenEl.value || !elements.uriBaseEl.value) {
                    notify('[ERROR] Input values are not defined')

                    return;
                }

                bs.inCollapse.hide();
                apiInstance.listFilters().then((response) => showFilters(response));
            });

        document.getElementById('show-tasks-btn')
            .addEventListener('click', function onShowTasks(e) {
                e.preventDefault();
                e.stopPropagation();

                let jqlQuery = _.trim(elements.filterEl.value)
                if (!elements.userEl.value || !elements.tokenEl.value || !jqlQuery) {
                    notify('[ERROR] Input values are not defined')

                    return;
                }

                bs.inCollapse.hide();
                apiInstance.searchIssues(jqlQuery).then((response) => showIssues(response));
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

        function onShowDiagram(e) {
            e.stopPropagation();
            e.preventDefault();

            let jqlQuery = _.trim(elements.filterEl.value)

            if (!elements.userEl.value || !elements.tokenEl.value || !jqlQuery) {
                notify('[ERROR] Input values are not defined')

                return;
            }

            apiInstance.searchIssues(jqlQuery).then((response) => showDiagram(response));
        }

        document.getElementById('download-diagram-png-btn')
            .addEventListener('click', function onShowDiagramPng(e) {
                e.preventDefault();
                e.stopPropagation();

                try {
                    graph.makeDiagramUrl('png');
                } catch (e) {
                    console.error('[ERROR] ', e);
                    notify('[ERROR] ' + e.message);
                }
            });

        document.getElementById('download-diagram-svg-btn')
            .addEventListener('click', function onShowDiagramSvg(e) {
                e.preventDefault();
                e.stopPropagation();

                try {
                    // TODO: cleanup font awesome icons (fa:), links (click)
                    graph.makeDiagramUrl('svg');
                } catch (e) {
                    console.error('[ERROR] ', e);
                    notify('[ERROR] ' + e.message);
                }
            });

        document.getElementById('render-diagram-btn')
            .addEventListener('click', function onRenderDiagram(e) {
                e.preventDefault();
                e.stopPropagation();

                const diagramContent = elements.inEl.value.trim();
                if (!diagramContent) {
                    notify('Click "Show diagram" button or edit manually "Input" before trying to render');

                    return;
                }

                try {
                    bs.outCollapse.show();
                    // TODO: move to graph.js module. Together with mermaid calls
                    mermaid.render('mermaid', diagramContent).then((v) => {
                        elements.outEl.innerHTML = v.svg;
                        // console.log('[RENDER] ', elements.outEl.innerHTML, diagramContent);
                    });
                } catch (e) {
                    console.error('[ERROR] ', e);
                    notify('[ERROR] ' + e.message);
                }
            });

        storage.restoreInput(true);
    });

    function notify(message) {
        elements.notifyModalEl.querySelector('.modal-body').innerText = message
        bs.notifyModal.show();
    }

    function showDiagram(data) {
        elements.outEl.innerHTML = '';

        if (!data) {
            notify('No issues found for the query');
            bs.outCollapse.show();

            return;
        }

        if (data.total >= data.maxResults) {
            notify('Reached page items limit. Not all issues will be displayed. Update JQL query if possible');
        }

        let tplEl = document.getElementById('mermaid-tpl');
        let el = tplEl.content.cloneNode(true);

        elements.outEl.appendChild(el.firstElementChild);
        bs.outCollapse.show();

        graph.makeDiagram(data.issues).then(function (diagram) {
            mermaid.render('mermaid', diagram).then((v) => {
                elements.inEl.value = diagram
                elements.outEl.innerHTML = v.svg;
                // console.log('[RENDER]', elements.outEl.innerHTML);
            });
        });
    }

    function showFilters(data) {
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

    function showIssues(data) {
        let tplEl = document.getElementById('issue-tpl')
        let issueTplEl = document.getElementById('issue-link-tpl')
        let extraParams = utils.parseExtraParams();

        elements.outEl.innerHTML = ''; // clear input

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

        bs.outCollapse.show();
    }
})()
