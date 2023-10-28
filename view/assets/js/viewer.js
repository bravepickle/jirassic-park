export default class Viewer {
    elements;
    utils;
    bs;
    dispatcher;
    graph;

    constructor(elements, utils, bs, graph, dispatcher) {
        this.elements = elements;
        this.utils = utils;
        this.bs = bs;
        this.graph = graph;
        this.dispatcher = dispatcher;

        this.dispatcher.subscribe({
            channel: 'requests',
            topic: 'notify',
            callback: (msg) => this.notify(msg),
        });
    }

    showIssues(data) {
        const elements = this.elements;
        const utils = this.utils;

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

        this.bs.outCollapse.show();
    }

    showFilters(data) {
        const elements = this.elements;
        const bs = this.bs;

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
        const elements = this.elements;
        const bs = this.bs;

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

        this.graph.makeDiagram(data.issues).then(function (diagram) {
            mermaid.render('mermaid', diagram).then((v) => {
                elements.inEl.value = diagram
                elements.outEl.innerHTML = v.svg;
                // console.log('[RENDER]', elements.outEl.innerHTML);
            });
        });
    }

    notify(msg) {
        this.elements.notifyModalEl.querySelector('.modal-body').innerText = msg;
        this.bs.notifyModal.show();
    }
}
