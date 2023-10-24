function triggerDownload(imgURI, fileName) {
    let a = document.createElement('a')

    if (!openImgEl.checked) {
        a.setAttribute('download', !!fileName ? fileName : 'issues_diagram.svg')
    }

    a.setAttribute('href', imgURI)
    a.setAttribute('target', '_blank')

    a.click()
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

function makeIssueHref(issue) {
    return jiraUri + '/browse/' + issue.key;
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

// function getListExtraParams(paths) {
function parseExtraParams(params) {
    let list = [];
    // let params = extraParamsEl.value.trim();

    if (!paths) {
        return list;
    }

    let els = _.filter(params.split("\n"));

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
