import api from "./api.js";

// console.log('[module.api]', api);

(function() {
    let jiraUri = '{{ .jira_uri }}';

    let uriBaseEl = document.getElementById('uri');
    let userEl = document.getElementById('user');
    let tokenEl = document.getElementById('token');
    let actionEl = document.getElementById('action');
    let filterEl = document.getElementById('filter');
    let hideParentsBtn = document.getElementById('hide-parents');
    let hideTestsBtn = document.getElementById('hide-tests');
    let openImgEl = document.getElementById('open-image');
    let shortIssueEl = document.getElementById('short-issue-desc');
    let disableIconsEl = document.getElementById('disable-icons');
    let extraParamsEl = document.getElementById('issue-extra-fields');
    let showMatchedEl = document.getElementById('show-matched');

    let inputSaveEl = document.getElementById('input-save-btn');
    let inputRestoreEl = document.getElementById('input-restore-btn');
    let inputClearEl = document.getElementById('input-clear-btn');

    let notifyModalEl = document.getElementById('notifyModal');
    let notifyModal = new bootstrap.Modal(notifyModalEl);

    let inEl = document.getElementById('input');
    var inCollapse = new bootstrap.Collapse(inEl, {toggle: false});

    let outEl = document.getElementById('output');
    var outCollapse = new bootstrap.Collapse(outEl, {toggle: false});

    const apiInstance = api({
        uriBaseCallback: () => _.trimEnd(uriBaseEl.value, '/'),
        apiUserCallack: () => userEl.value,
        apiPasswordCallback: () => tokenEl.value,
    });

    document.addEventListener('DOMContentLoaded', function () {
        console.info('[api.instance]', apiInstance)

        mermaid.initialize({
            startOnLoad: false,
            flowchart: { useMaxWidth: true, htmlLabels: true },
            securityLevel: 'loose',
            // theme: 'base',
            // theme: 'forest',
        });

        // mermaid.flowchartConfig = {
        //     width: 100%
        // };

        document.getElementById('list-filters-btn').addEventListener('click', function onListFiltersClick(e) {
            e.stopPropagation();
            e.preventDefault();

            if (!userEl.value || !tokenEl.value || !uriBaseEl.value) {
                notify('[ERROR] Input values are not defined')

                return;
            }

            inCollapse.hide();

            apiInstance
                .listFilters()
                .then((response) => showFilters(response.data))
                .catch(function (e) {
                    console.error(e);
                    const msg = [e.message].concat(_.get(e, 'response.data.errorMessages', []));
                    notify('[ERROR] ' + msg.join("\n"));
                });
        });

        document.getElementById('show-tasks-btn').addEventListener('click', function onShowTasks(e) {
            e.preventDefault();
            e.stopPropagation();

            let jqlQuery = _.trim(filterEl.value)

            if (!userEl.value || !tokenEl.value || !jqlQuery) {
                notify('[ERROR] Input values are not defined')

                return;
            }

            inCollapse.hide();

            searchIssues(jqlQuery).then((response) => showIssues(response.data))
        });

        inputSaveEl.addEventListener('click', () => saveInput());
        inputRestoreEl.addEventListener('click', () => restoreInput());
        inputClearEl.addEventListener('click', () => clearInput());


        document.getElementById('show-diagram-btn').addEventListener('click', onShowDiagram);
        document.getElementById('main-form').addEventListener('submit', onShowDiagram);

        function onShowDiagram(e) {
            e.stopPropagation();
            e.preventDefault();

            let jqlQuery = _.trim(filterEl.value)

            if (!userEl.value || !tokenEl.value || !jqlQuery) {
                notify('[ERROR] Input values are not defined')

                return;
            }

            apiInstance
                .searchIssues(jqlQuery)
                .then((response) => showDiagram(response.data))
                .catch(function (e) {
                    console.error(e);
                    const msg = [e.message].concat(_.get(e, 'response.data.errorMessages', []));
                    notify('[ERROR] ' + msg.join("\n"));
                });
        }

        document.getElementById('download-diagram-png-btn').addEventListener('click', function onShowDiagramPng(e) {
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

        document.getElementById('download-diagram-svg-btn').addEventListener('click', function onShowDiagramSvg(e) {
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

        document.getElementById('render-diagram-btn').addEventListener('click', function onRenderDiagram(e) {
            e.preventDefault();
            e.stopPropagation();

            const diagramContent = inEl.value.trim();
            if (!diagramContent) {
                notify('Click "Show diagram" button or edit manually "Input" before trying to render');

                return;
            }

            try {
                outCollapse.show();
                mermaid.render('mermaid', diagramContent).then((v) => {
                    outEl.innerHTML = v.svg;
                    // console.log('[RENDER] ', outEl.innerHTML, diagramContent);
                });
            } catch (e) {
                console.error('[ERROR] ', e);
                notify('[ERROR] ' + e.message);
            }
        });

        function saveInput() {
            let data = {
                uri: uriBaseEl.value,
                user: userEl.value,
                token: tokenEl.value,
                filter: filterEl.value,
                hideParents: hideParentsBtn.checked,
                hideTests: hideTestsBtn.checked,
                openImage: openImgEl.checked,
                shortIssue: shortIssueEl.checked,
                disableIcons: disableIconsEl.checked,
                extraParams: extraParamsEl.value,
                showMatched: showMatchedEl.checked,
            };

            localStorage.setItem('input', JSON.stringify(data));

            notify('Form input is stored!')
        }

        function restoreInput(silent) {
            let input = localStorage.getItem('input');

            if (!input) {
                if (typeof silent === 'undefined' || !silent) {
                    notify('Storage is empty');
                }

                return;
            }

            input = JSON.parse(input)

            uriBaseEl.value = input.uri
            userEl.value = input.user
            tokenEl.value = input.token
            filterEl.value = input.filter
            hideParentsBtn.checked = !!input.hideParents;
            hideTestsBtn.checked = !!input.hideTests;
            openImgEl.checked = !!input.openImage;
            shortIssueEl.checked = !!input.shortIssue;
            disableIconsEl.checked = !!input.disableIcons;
            extraParamsEl.value = !!input.extraParams ? input.extraParams : '';
            showMatchedEl.checked = !!input.showMatched;
        }

        function clearInput() {
            localStorage.clear();

            uriBaseEl.value = '{{ .uri }}'
            userEl.value = '{{ .user }}'
            tokenEl.value = '{{ .token }}'
            filterEl.value = ''
            hideParentsBtn.checked = false;
            hideTestsBtn.checked = false;
            openImgEl.checked = false;
            shortIssueEl.checked = false;
            extraParamsEl.value = '';
            showMatchedEl.checked = false;

            notifyModalEl.querySelector('.modal-body').innerText = 'Form input storage is cleared!'
            notifyModal.show();
        }

        restoreInput(true);
    });

    function notify(message) {
        notifyModalEl.querySelector('.modal-body').innerText = message
        notifyModal.show();
    }

    function downloadDiagramAsPng() {
        let svgEl = document.querySelector('svg');
        if (!svgEl) {
            notify('Click "Show diagram" button before trying to export');

            return;
        }

        svgEl.crossOrigin = 'anonymous';
        const svgString = (new XMLSerializer()).serializeToString(svgEl);
        const svgBlob = new Blob([svgString], {
            type: 'image/svg+xml;charset=utf-8'
        });
        svgBlob.crossOrigin = 'anonymous';

        const DOMURL = window.URL || window.webkitURL || window;
        const url = DOMURL.createObjectURL(svgBlob);

        const image = new Image();
        image.width = svgEl.width.baseVal.value;
        image.height = svgEl.height.baseVal.value;

        image.onload = function () {
            const canvas = document.createElement('CANVAS');
            // const canvas = document.querySelector('canvas');

            canvas.width = image.width;
            canvas.height = image.height;

            try {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);
                DOMURL.revokeObjectURL(url);

                const imgURI = canvas
                    .toDataURL('image/svg')
                    .replace('image/svg', 'image/octet-stream');

                triggerDownload(imgURI, 'issues_diagram.png');
            } catch (e) {
                console.error('[ERROR] ', e, image);
                notify('[ERROR] ' + e.message + "\n\nTry downloading by righ clicking the image");

                outEl.innerHTML = '';
                outEl.appendChild(canvas); // stupid dirty hack...
            }

        };

        image.crossOrigin = 'anonymous';
        image.referrerPolicy = 'no-referrer';
        image.src = url;
    }

    let triggerDownload = (imgURI, fileName) => {
        let a = document.createElement('a')

        if (!openImgEl.checked) {
            a.setAttribute('download', !!fileName ? fileName : 'issues_diagram.svg')
        }
        a.setAttribute('href', imgURI)
        a.setAttribute('target', '_blank')

        a.click()
    }

    function downloadDiagramAsSvg() {
        // var btn = document.querySelector('button')
        var svg = document.querySelector('svg')

        if (!svg) {
            notify('Click "Show diagram" button before trying to export');

            return;
        }

        let data = (new XMLSerializer()).serializeToString(svg)
        let svgBlob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'})
        let url = URL.createObjectURL(svgBlob)

        triggerDownload(url, 'issues_diagram.svg')
    }

    function showDiagram(data) {
        outEl.innerHTML = '';

        if (!data) {
            notify('No issues found for the query');
            outCollapse.show();

            return;
        }

        if (data.total >= data.maxResults) {
            notify('Reached page items limit. Not all issues will be displayed. Update JQL query if possible');
        }

        let tplEl = document.getElementById('mermaid-tpl');
        let el = tplEl.content.cloneNode(true);

        outEl.appendChild(el.firstElementChild);
        outCollapse.show();

        makeDiagram(data.issues).then(function (diagram) {
            mermaid.render('mermaid', diagram).then((v) => {
                inEl.value = diagram
                outEl.innerHTML = v.svg;
                // console.log('[RENDER]', outEl.innerHTML);
            });
        });
    }

    function formatTime(seconds) {
        if (!seconds) {
            return '';
        }

        var sec_num = parseInt(seconds, 10);
        var hours   = parseInt(Math.floor(sec_num / 3600), 10);
        var minutes = parseInt(Math.floor((sec_num - (hours * 3600)) / 60), 10);
        // var seconds = parseInt(sec_num - (hours * 3600) - (minutes * 60), 1);

        var parts = [];
        if (hours > 0) {
            parts.push(hours + 'h');
        }

        if (minutes > 0) {
            parts.push(minutes + 'm');
        }

        return parts.join(' ');

        // if (hours   < 10) {hours   = "0"+hours;}
        // if (minutes < 10) {minutes = "0"+minutes;}
        // if (seconds < 10) {seconds = "0"+seconds;}

        // return hours + ':' + minutes + ':' + seconds;
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
        let timespent = _.get(item, 'fields.aggregatetimespent')

        if (!timespent) {
            timespent = _.get(item, 'fields.timespent')
        }

        return formatTime(timespent)
    }

    function makeNode(item) {
        let title = makeTitle(item, shortIssueEl.checked, true);

        let left, right;
        let fillColor;
        let styles = []
        const strokeWidth = shortIssueEl.checked ? '2px' : '4px'

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

        if (!shortIssueEl.checked) {
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
        let hideParentsBtn = document.getElementById('hide-parents');
        let hideTestsBtn = document.getElementById('hide-tests');
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
            if (hideTestsBtn.checked && ( _.get(from, 'fields.issuetype.name') === 'Test' || _.get(to, 'fields.issuetype.name') === 'Test')) {
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

        issues.forEach((item)  => addIssueDesc(item));

        issues.forEach(function (item) {
            if (
                item.fields.parent &&
                !hideParentsBtn.checked &&
                (!showMatchedEl.checked || issueKeys.includes(item.fields.parent.key))
            ) {
                // if (!hideTestsBtn.checked || _.get(item.fields.parent, 'fields.issuetype.name') !== 'Test') {
                //     addIssueDesc(item.fields.parent);
                // }

                if (
                    !hideParentsBtn.checked &&
                    !issueLinks.includes(item.fields.parent.key) &&
                    (!hideTestsBtn.checked || _.get(item.fields.parent, 'fields.issuetype.name') !== 'Test')
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
                        if (showMatchedEl.checked && !issueKeys.includes(issue.key)) {
                            return; // skip adding references to not matched issue refs
                        }

                        issueLinks.push(issue.key);
                    }

                    if (_.get(item, 'fields.parent.id') === issue.id) {
                        return; // if references parent issue then skip
                    }

                    // if (!hideTestsBtn.checked || _.get(issue, 'fields.issuetype.name') !== 'Test') {
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

        if (!showMatchedEl.checked) {
            const missingIssuesByRef = _.difference(issueLinks, issueKeys);
            if (missingIssuesByRef.length > 0) {
                console.info('[missing by link keys]', missingIssuesByRef);

                return searchIssues('issue IN (' + missingIssuesByRef.join(', ') + ')')
                    .then((response) => {
                        response.data.issues.forEach((item) => {
                            if (!hideTestsBtn.checked || _.get(item, 'fields.issuetype.name') !== 'Test') {
                                addIssueDesc(item);
                            }
                        })
                    }).then(finished);
            }
        }

        return new Promise((resolve) => resolve(finished()));
    }

    function searchIssues(jqlQuery) {
        return apiInstance
            .searchIssues(jqlQuery)
            .catch(function (e) {
                console.error(e);
                const msg = [e.message].concat(_.get(e, 'response.data.errorMessages', []));
                notify('[ERROR] ' + msg.join("\n"));
            });
    }


    function showFilters(data) {
        outEl.innerHTML = '';
        if (!data) {
            outCollapse.show();

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

            outEl.appendChild(el.firstElementChild)
        });

        outCollapse.show();
    }

    function makeTitle(issue, shortIssue, useIcons) {

        let title = '';
        if (!!useIcons && !disableIconsEl.checked) {
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
                _.get(issue, 'fields.status.name') + ' | ' + issue.key  + ' ] ' + "\n";
        } else {
            title += '[' + _.get(issue, 'fields.issuetype.name') + '|' +
                _.get(issue, 'fields.status.name') + '|' + issue.key  + '] '
        }

        return title + _.get(issue, 'fields.summary');
    }

    function makeIssueHref(issue) {
        return jiraUri + '/browse/' + issue.key;
    }

    function textEncode (str) {
        if (window.TextEncoder) {
             return new TextEncoder('utf-8').encode(str);
        }

        var utf8 = unescape(encodeURIComponent(str));
        var result = new Uint8Array(utf8.length);
        for (var i = 0; i < utf8.length; i++) {
            result[i] = utf8.charCodeAt(i);
        }

        return result;
    }

    function makeMermaidUrl(source, type) {
        let data = JSON.stringify({
            code: source,
            mermaid: "{\"theme\": \"default\"}",
            autoSync: true,
            updateDiagram:false,
            panZoom:false,
            editorMode:"code"
        });

        const _hasBuffer = typeof Buffer == "function";

        const _fromCC = String.fromCharCode.bind(String);
        // const _U8Afrom = typeof Uint8Array.from == "function" ? Uint8Array.from.bind(Uint8Array) : t => new Uint8Array(Array.prototype.slice.call(t, 0))
        const _mkUriSafe = t => t.replace(/=/g, "").replace(/[+\/]/g, e => e == "+" ? "-" : "_");

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

    function makeKrokiUrl(source, type, diagramType = 'mermaid') {
        const compressed = window.btoa(pako.deflate(textEncode(source), { level: 9, to: 'string' }))
                .replace(/\+/g, '-')
                .replace(/\//g, '_');

        // Kroki usage - good for different diagrams
        var urlPath = diagramType + '/' + type + '/' + compressed;

        return 'https://kroki.io/' + urlPath;
    }

    function makeDiagramUrl(type) {
        let url;
        let source = inEl.value.trim();
        const typeName = !!type ? type : 'svg';

        // if (typeName === 'svg') {
        //     // source = source.replaceAll(/fa:\S+ ?/g, ''); // remove font awesome
        //     source = source.replaceAll(/\n[ ]*click [^\n]+/gi, ''); // remove links that cause problems for svg
        // }

        // console.log('[SRC]', source)

        if (source != '') {
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
        let paths = extraParamsEl.value.trim();

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
        let outEl = document.getElementById('output');
        let tplEl = document.getElementById('issue-tpl')
        let issueTplEl = document.getElementById('issue-link-tpl')
        let extraParams = getListExtraParams();

        outEl.innerHTML = ''; // clear input

        data.issues.forEach(function (item) {
            let el = tplEl.content.cloneNode(true);
            el.querySelector('.card-header').innerText = makeTitle(item, shortIssueEl.checked, false);
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


            outEl.appendChild(el.firstElementChild)
        });

        outCollapse.show();
    }
})()
