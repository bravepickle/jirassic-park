import api from "./api.js";
import StorageProcessor from "./storage.js";
import UtilsClass from "./utils.js";
import GraphClass from "./graph.js";
import Viewer from "./viewer.js";

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
    const view = new Viewer(elements, utils, bs, graph, eventDispatcher);

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
                apiInstance.listFilters().then((response) => view.showFilters(response));
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
                apiInstance.searchIssues(jqlQuery).then((response) => view.showIssues(response));
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

            apiInstance.searchIssues(jqlQuery).then((response) => view.showDiagram(response));
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
        eventDispatcher.publish({
            channel: 'requests',
            topic: 'notify',
            data: message,
        });
    }
})()
