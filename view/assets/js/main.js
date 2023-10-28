import api from "./api.js";
import storageClass from "./storage.js";

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

    document.addEventListener('DOMContentLoaded', function () {
        console.info('[api.instance]', apiInstance)

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

                eventDispatcher.publish({
                    channel: 'requests',
                    topic: 'api.listFilters',
                    data: {foo: 'bar'},
                });

                apiInstance
                    .listFilters()
                    .then((response) => showFilters(response));
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

                apiInstance.searchIssues(jqlQuery)
                    .then((response) => showIssues(response));
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

            apiInstance
                .searchIssues(jqlQuery)
                .then((response) => showDiagram(response));
        }

        document.getElementById('download-diagram-png-btn')
            .addEventListener('click', function onShowDiagramPng(e) {
                e.preventDefault();
                e.stopPropagation();

                try {
                    makeDiagramUrl('png');
                    // downloadDiagramAsPng();
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

        // TODO: either remove me later or enable
        // document.getElementById('download-diagram-svg-btn-v2').addEventListener('click', function onShowDiagramV2() {
        //     try {
        //         // TODO: cleanup font links
        //         downloadDiagramAsSvg();
        //     } catch (e) {
        //         console.error('[ERROR] ', e);
        //         notify('[ERROR] ' + e.message);
        //     }
        // });

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

    let triggerDownload = (imgURI, fileName) => {
        let a = document.createElement('a')

        if (!elements.openImgEl.checked) {
            a.setAttribute('download', !!fileName ? fileName : 'issues_diagram.svg')
        }
        a.setAttribute('href', imgURI)
        a.setAttribute('target', '_blank')

        a.click()
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

    function formatTime(seconds) {
        if (!seconds) {
            return '';
        }

        const sec_num = parseInt(seconds, 10);
        const hours = parseInt(Math.floor(sec_num / 3600), 10);
        const minutes = parseInt(Math.floor((sec_num - (hours * 3600)) / 60), 10);
        // var seconds = parseInt(sec_num - (hours * 3600) - (minutes * 60), 1);

        const parts = [];
        if (hours > 0) {
            parts.push(hours + 'h');
        }

        if (minutes > 0) {
            parts.push(minutes + 'm');
        }

        return parts.join(' ');
    }

    function makeEstimate(item) {
        if (!item) {
            return ''
        }

        let estimate = _.get(item, 'fields.aggregatetimeoriginalestimate');

        if (!estimate && _.get(item, 'fields.aggregatetimeestimate')) {
            estimate = item.fields.aggregatetimeestimate;
        }

        if (!estimate && _.get(item, 'fields.timeoriginalestimate')) {
            estimate = item.fields.timeoriginalestimate;
        }

        if (!estimate && _.get(item, 'fields.timeestimate')) {
            estimate = item.fields.timeestimate;
        }

        return formatTime(estimate)
    }

    function makeTimeSpent(item) {
        const timespent = _.get(item, 'fields.aggregatetimespent')

        if (!timespent) {
            timespent = _.get(item, 'fields.timespent')
        }

        return formatTime(timespent)
    }

    function makeNode(item) {
        let title = makeTitle(item, elements.shortIssueEl.checked, true);

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

            default:
            // nothing
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

            const estimate = makeEstimate(item)
            const timespent = makeTimeSpent(item)

            if (!!estimate) {
                out.push(`**Estimate:** ${estimate}`);
            }

            if (!!timespent) {
                out.push(`**Spent:** ${timespent}`);
            }

            const assignee = _.get(item, 'fields.assignee.displayName')
            if (assignee) {
                out.push(`**Assignee:** ${assignee}`)
            }

            const extraParams = getListExtraParams();
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
        // let hideParentsEl = document.getElementById('hide-parents');
        // let hideTestsEl = document.getElementById('hide-tests');
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
            out.push(`    click ${item.key} href "${makeIssueHref(item)}" _blank`);
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

        const finished = () => {
            // console.info('[Diagram] ', out.join("\n"));

            return out.join("\n");
        };

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

    function makeTitle(issue, shortIssue, useIcons) {

        let title = '';
        if (!!useIcons && !elements.disableIconsEl.checked) {
            let symbol;
            switch (_.get(issue, 'fields.status.name')) {
                case 'To Do':
                case 'New':
                case 'Ready for Development':
                case 'Ready for Grooming':
                    symbol = 'fa:fa-spinner'
                    break;

                case 'Blocked/Hold':
                    symbol = 'fa:fa-lock'
                    break;

                case 'In Progress':
                    symbol = 'fa:fa-star'
                    break;

                case 'Done':
                case 'Ready For Release':
                    symbol = 'fa:fa-check';
                    break;

                case 'Abandoned':
                    symbol = 'fa:fa-ban'
                    break;

                case 'Ready for Testing':
                case 'Testing':
                    symbol = 'fa:fa-microscope'
                    break;

                default:
                    symbol = ''
            }

            if (!!symbol) {
                title += symbol + ' ';
            }
        }


        if (!shortIssue) {
            title += '[ ' + _.get(issue, 'fields.issuetype.name') + ' | ' +
                _.get(issue, 'fields.status.name') + ' | ' + issue.key + ' ] ' + "\n";
        } else {
            title += '[' + _.get(issue, 'fields.issuetype.name') + '|' +
                _.get(issue, 'fields.status.name') + '|' + issue.key + '] '
        }

        return title + _.get(issue, 'fields.summary');
    }

    function makeIssueHref(issue) {
        return jiraUri + '/browse/' + issue.key;
    }

    // function textEncode(str) {
    //     if (window.TextEncoder) {
    //         return new TextEncoder('utf-8').encode(str);
    //     }
    //
    //     var utf8 = unescape(encodeURIComponent(str));
    //     var result = new Uint8Array(utf8.length);
    //     for (var i = 0; i < utf8.length; i++) {
    //         result[i] = utf8.charCodeAt(i);
    //     }
    //
    //     return result;
    // }

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

    // function makeKrokiUrl(source, type, diagramType = 'mermaid') {
    //     const compressed = window.btoa(pako.deflate(textEncode(source), {level: 9, to: 'string'}))
    //         .replace(/\+/g, '-')
    //         .replace(/\//g, '_');
    //
    //     // Kroki usage - good for different diagrams
    //     var urlPath = diagramType + '/' + type + '/' + compressed;
    //
    //     return 'https://kroki.io/' + urlPath;
    // }

    function makeDiagramUrl(type) {
        // let url;
        let source = elements.inEl.value.trim();
        const typeName = !!type ? type : 'svg';

        // if (typeName === 'svg') {
        //     // source = source.replaceAll(/fa:\S+ ?/g, ''); // remove font awesome
        //     source = source.replaceAll(/\n[ ]*click [^\n]+/gi, ''); // remove links that cause problems for svg
        // }

        // console.log('[SRC]', source)

        if (source !== '') {
            const url = makeMermaidUrl(source, typeName)
            // console.log('[URL]', url);

            triggerDownload(url, 'issues_diagram.' + typeName);

            return url;
        }

        notify('Failed to generate diagram URL. Check if diagram input is defined');

        return null;
    }

    function getListExtraParams() {
        let list = [];
        let paths = elements.extraParamsEl.value.trim();

        if (paths === '') {
            return list;
        }

        let els = _.filter(paths.split("\n"));

        els.forEach((el) => {
            const parts = el.split(':', 2).map((v) => v.trim());

            if (parts.length >= 2) {
                list.push({label: parts[1], path: parts[0]});
            } else {
                list.push({label: parts[0], path: parts[0]});
            }
        });

        // console.info('[extra params RAW]', els, list);

        return list;
    }

    function showIssues(data) {
        // let outEl = document.getElementById('output');
        let tplEl = document.getElementById('issue-tpl')
        let issueTplEl = document.getElementById('issue-link-tpl')
        let extraParams = getListExtraParams();

        elements.outEl.innerHTML = ''; // clear input

        data.issues.forEach(function (item) {
            let el = tplEl.content.cloneNode(true);
            el.querySelector('.card-header').innerText = makeTitle(item, elements.shortIssueEl.checked, false);
            el.querySelector('.issue-desc').innerText = _.truncate(item.fields.description, {length: 300});

            el.querySelector('.issue-self').href = makeIssueHref(item);

            let parentEl = el.querySelector('.issue-parent');
            if (!item.fields.parent) {
                parentEl.parentNode.removeChild(parentEl);
            } else {
                let parentInfo = item.fields.parent;
                parentEl.href = makeIssueHref(parentInfo);
                parentEl.title = makeTitle(parentInfo, true, false);
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
                    linkEl.innerText = makeTitle(issue, true, false);
                    linkEl.href = makeIssueHref(issue);

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
