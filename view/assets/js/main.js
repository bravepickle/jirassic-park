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

    const dispatcher = postal;

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
        dispatcher: dispatcher,
    });

    const storage = new StorageProcessor({
        elements: elements,
        defaults: {
            uri: window.appConfig.uri,
            user: window.appConfig.user,
            token: window.appConfig.token,
        },
        dispatcher: dispatcher,
    });

    const utils = new UtilsClass(elements, {jiraUri: window.appConfig.jiraUri});
    const graph = new GraphClass(dispatcher, utils, elements, apiInstance);

    const view = new Viewer({
        elements,
        bs,
        dispatcher,
        graph,
        mermaid,
        apiInstance,
        storage,
        utils,
    });

    document.addEventListener('DOMContentLoaded', function () {
        view.initEvents();
        storage.restoreInput(true);
    });

    function notify(message) {
        dispatcher.publish({
            channel: 'requests',
            topic: 'notify',
            data: message,
        });
    }
})()
