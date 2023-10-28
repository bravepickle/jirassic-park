export default class GraphClass {
    elements;
    dispatcher;
    utils;
    apiInstance;

    constructor(dispatcher, utils, elements, apiInstance) {
        this.dispatcher = dispatcher;
        this.utils = utils;
        this.elements = elements;
        this.apiInstance = apiInstance;
    }

    makeDiagramUrl(type) {
        let source = this.elements.inEl.value.trim();
        const typeName = !!type ? type : 'svg';

        if (source !== '') {
            const url = this.makeMermaidUrl(source, typeName)
            this.utils.triggerDownload(url, 'issues_diagram.' + typeName);

            return url;
        }

        notify('Failed to generate diagram URL. Check if diagram input is defined');

        return null;
    }

    makeMermaidUrl(source, type) {
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

    makeDiagram(issues) {
        const elements = this.elements;

        let out = [
            '---',
            'title: Issues Flowchart at ' + (new Date()).toLocaleString(),
            '---',
            'flowchart LR'
        ];
        let issueKeys = [];

        let addIssueDesc = (issue) => {
            if (issueKeys.indexOf(issue.key) !== -1) {
                return; // already added
            }

            issue.fields.summary = issue.fields.summary.replaceAll('"', '');

            out.push(this.makeNode(issue));
            out.push(`    click ${issue.key} href "${this.utils.makeIssueHref(issue)}" _blank`);
            out.push(''); // separator

            issueKeys.push(issue.key);
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

                return this.apiInstance.searchIssues('issue IN (' + missingIssuesByRef.join(', ') + ')')
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

    makeNode(item) {
        const utils = this.utils;
        const elements = this.elements;
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
}
