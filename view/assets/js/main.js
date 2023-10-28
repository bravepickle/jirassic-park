import api from "./api.js";
import storageClass from "./storage.js";
import UtilsClass from "./utils.js";

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

    const storage = new storageClass({
        elements: elements,
        defaults: {
            uri: '{{ .uri }}',
            user: '{{ .user }}',
            token: '{{ .token }}',
        },
        dispatcher: eventDispatcher,
    });

    const utils = new UtilsClass(elements, {jiraUri: jiraUri});

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
                    makeDiagramUrl('png');
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
                    makeDiagramUrl('svg');
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

        makeDiagram(data.issues).then(function (diagram) {
            mermaid.render('mermaid', diagram).then((v) => {
                elements.inEl.value = diagram
                elements.outEl.innerHTML = v.svg;
                // console.log('[RENDER]', elements.outEl.innerHTML);
            });
        });
    }

    function makeNode(item) {
        let title = utils.makeTitle(item, elements.shortIssueEl.checked, true);

        let left, right;
        // let fillColor;
        let styles = []
        const strokeWidth = elements.shortIssueEl.checked ? '2px' : '4px'

        switch (_.get(item, 'fields.status.name')) {
            case 'To Do':
            case 'Ready for Development':
            case 'Blocked/Hold':
                styles.push('stroke:#990000')
                styles.push(`stroke-width:${strokeWidth}`)
                break;

            case 'In Progress':
                styles.push('stroke:#cc5200')
                styles.push(`stroke-width:${strokeWidth}`)
                break;

            case 'Done':
            case 'Abandoned':
                styles.push('stroke:#4d9900')
                styles.push(`stroke-width:${strokeWidth}`)
                break;

            default: // nothing
        }

        switch (_.get(item, 'fields.issuetype.name')) {
            case 'Bug':
                left = '{' + '{';
                right = '}' + '}';
                styles.push('fill:#e60073')
                break;

            case 'Epic':
                left = '>';
                right = ']';
                styles.push('fill:#cc00cc')
                break;

            case 'Sub-task':
                left = '([';
                right = '])';
                styles.push('fill:#66ccff')
                break;

            case 'Task':
                left = '(';
                right = ')';
                styles.push('fill:#9999ff')
                break;

            case 'Story':
                left = '(';
                right = ')';
                styles.push('fill:#009900')
                break;

            default:
                left = '[[';
                right = ']]'
        }

        let out = []

        if (!elements.shortIssueEl.checked) {
            out.push(`    ${item.key}${left}"\`${title}`);

            const estimate = utils.makeEstimate(item)
            const timeSpent = utils.makeTimeSpent(item)

            if (!!estimate) {
                out.push(`**Estimate:** ${estimate}`);
            }

            if (!!timeSpent) {
                out.push(`**Spent:** ${timeSpent}`);
            }

            const assignee = _.get(item, 'fields.assignee.displayName')
            if (assignee) {
                out.push(`**Assignee:** ${assignee}`)
            }

            const extraParams = utils.parseExtraParams();
            extraParams.forEach((param) => {
                let val = _.get(item, param.path);
                if (typeof val === 'object') {
                    val = JSON.stringify(val);
                }

                out.push(`**${param.label}:** ${val}`)
            });

            out.push(`\`"${right}`);
        } else {
            out.push(`    ${item.key}${left}"${title}"${right}`);
        }

        if (styles.length > 0) {
            out.push(`    style ${item.key} ${styles.join(',')}`);
        }

        return out.join("\n")
    }

    function makeDiagram(issues) {
        let out = [
            '---',
            'title: Issues Flowchart at ' + (new Date()).toLocaleString(),
            '---',
            'flowchart LR'
        ];
        let issueKeys = [];

        let addIssueDesc = function (item) {
            if (issueKeys.indexOf(item.key) !== -1) {
                return; // already added
            }

            item.fields.summary = item.fields.summary.replaceAll('"', '');

            out.push(makeNode(item));
            out.push(`    click ${item.key} href "${utils.makeIssueHref(item)}" _blank`);
            out.push(''); // separator

            issueKeys.push(item.key);
        };

        let issueLinks = []
        let refKeys = [];
        let addRefIssue = function (type, from, to) {
            if (elements.hideTestsEl.checked && (_.get(from, 'fields.issuetype.name') === 'Test' || _.get(to, 'fields.issuetype.name') === 'Test')) {
                return; // skip test issue refs from display
            }

            let key = type.name + '.' + _.sortBy([from.key, to.key]).join('.');
            if (refKeys.indexOf(key) !== -1) {
                return; // already added
            }

            switch (type.name) {
                case 'Parent':
                    out.push(`    ${from.key} -. parent .-> ${to.key}`);
                    break;
                case 'Blocks':
                    if (type.dir === 'blocks') {
                        out.push(`    ${from.key} -- blocks --> ${to.key}`);
                    } else {
                        out.push(`    ${to.key} -- blocks --> ${from.key}`);
                    }
                    break;
                case 'Cloners':
                    if (type.dir === 'clones') {
                        out.push(`    ${from.key} -- clones --x ${to.key}`);
                    } else {
                        out.push(`    ${to.key} -- clones --x ${from.key}`);
                    }
                    break;
                case 'Relates':
                    out.push(`    ${from.key} -- relates --- ${to.key}`);
                    break;
                default:
                    out.push(`    ${from.key} o-- ${type.dir} --o ${to.key}`);
            }

            refKeys.push(key);
        };

        // TODO: group by parent task instead of relations. 2. fix links arrows, e.g. blocks. 3. multi lines to split parent, issues and refs

        issues.forEach((item) => addIssueDesc(item));

        issues.forEach(function (item) {
            if (
                item.fields.parent &&
                !elements.hideParentsEl.checked &&
                (!elements.showMatchedEl.checked || issueKeys.includes(item.fields.parent.key))
            ) {
                // if (!elements.hideTestsEl.checked || _.get(item.fields.parent, 'fields.issuetype.name') !== 'Test') {
                //     addIssueDesc(item.fields.parent);
                // }

                if (
                    !elements.hideParentsEl.checked &&
                    !issueLinks.includes(item.fields.parent.key) &&
                    (!elements.hideTestsEl.checked || _.get(item.fields.parent, 'fields.issuetype.name') !== 'Test')
                ) {
                    issueLinks.push(item.fields.parent.key);
                }

                addRefIssue({name: 'Parent', dir: 'parent'}, item, item.fields.parent);
            }

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

                    if (!issueLinks.includes(issue.key)) {
                        if (elements.showMatchedEl.checked && !issueKeys.includes(issue.key)) {
                            return; // skip adding references to not matched issue refs
                        }

                        issueLinks.push(issue.key);
                    }

                    if (_.get(item, 'fields.parent.id') === issue.id) {
                        return; // if references parent issue then skip
                    }

                    // if (!elements.hideTestsEl.checked || _.get(issue, 'fields.issuetype.name') !== 'Test') {
                    //     addIssueDesc(issue);
                    // }

                    addRefIssue({name: ref.type.name, dir: refType}, item, issue);
                });
            }
        });

        const finished = () => out.join("\n");
        if (!elements.showMatchedEl.checked) {
            const missingIssuesByRef = _.difference(issueLinks, issueKeys);
            if (missingIssuesByRef.length > 0) {
                console.info('[missing by link keys]', missingIssuesByRef);

                return apiInstance.searchIssues('issue IN (' + missingIssuesByRef.join(', ') + ')')
                    .then((response) => {
                        response.issues.forEach((item) => {
                            if (!elements.hideTestsEl.checked || _.get(item, 'fields.issuetype.name') !== 'Test') {
                                addIssueDesc(item);
                            }
                        })
                    }).then(finished);
            }
        }

        return new Promise((resolve) => resolve(finished()));
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

    function makeMermaidUrl(source, type) {
        let data = JSON.stringify({
            code: source,
            mermaid: "{\"theme\": \"default\"}",
            autoSync: true,
            updateDiagram: false,
            panZoom: false,
            editorMode: "code"
        });

        const _hasBuffer = typeof Buffer == "function";

        const _fromCC = String.fromCharCode.bind(String);
        const _mkUriSafe = t => t.replace(/=/g, "").replace(/[+\/]/g, e => e === "+" ? "-" : "_");

        // const _fromUint8Array = t => Buffer.from(t).toString("base64")
        const _fromUint8Array = _hasBuffer ? t => Buffer.from(t).toString("base64") : t => {
            let r = [];
            for (let n = 0, o = t.length; n < o; n += 4096) r.push(_fromCC.apply(null, t.subarray(n, n + 4096)));

            return window.btoa(r.join(""))
        };

        const fromUint8Array = (t, encode = true) => encode ? _mkUriSafe(_fromUint8Array(t)) : _fromUint8Array(t)

        const encoded = new TextEncoder().encode(data);
        const serialized = pako.deflate(encoded, {level: 9});

        const compressed = fromUint8Array(serialized, true);

        if (type === 'svg') {
            return 'https://mermaid.ink/svg/pako:' + compressed;
        }

        return 'https://mermaid.ink/img/pako:' + compressed + '?type=' + type;
    }

    function makeDiagramUrl(type) {
        let source = elements.inEl.value.trim();
        const typeName = !!type ? type : 'svg';

        if (source !== '') {
            const url = makeMermaidUrl(source, typeName)
            utils.triggerDownload(url, 'issues_diagram.' + typeName);

            return url;
        }

        notify('Failed to generate diagram URL. Check if diagram input is defined');

        return null;
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
