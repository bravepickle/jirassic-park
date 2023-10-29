
export default class UtilsClass {
    elements;
    config = {
        jiraUri: null,
    };

    constructor(elements, config) {
        this.elements = elements;
        this.config = _.assign(this.config, config);
    }

    triggerDownload(imgURI, fileName) {
        let a = document.createElement('a')

        if (!this.elements.openImgEl.checked) {
            a.setAttribute('download', !!fileName ? fileName : 'issues_diagram.svg')
        }
        a.setAttribute('href', imgURI)
        a.setAttribute('target', '_blank')

        a.click()
    }

    formatTime(seconds) {
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

    makeEstimate(issue) {
        if (!issue) {
            return ''
        }

        let estimate = _.get(issue, 'fields.aggregatetimeoriginalestimate');

        if (!estimate && _.get(issue, 'fields.aggregatetimeestimate')) {
            estimate = issue.fields.aggregatetimeestimate;
        }

        if (!estimate && _.get(issue, 'fields.timeoriginalestimate')) {
            estimate = issue.fields.timeoriginalestimate;
        }

        if (!estimate && _.get(issue, 'fields.timeestimate')) {
            estimate = issue.fields.timeestimate;
        }

        return this.formatTime(estimate)
    }

    makeTimeSpent(item) {
        let timeSpent = _.get(item, 'fields.aggregatetimespent')

        if (!timeSpent) {
            timeSpent = _.get(item, 'fields.timespent')
        }

        return this.formatTime(timeSpent)
    }

    makeIssueHref(issue) {
        return this.config.jiraUri + '/browse/' + issue.key;
    }

    makeTitle(issue, shortIssue, useIcons) {
        let title = '';
        if (!!useIcons && !this.elements.disableIconsEl.checked) {
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

    parseExtraParams(params) {
        let list = [];
        let paths = this.elements.extraParamsEl.value.trim();

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

        return list;
    }
}
