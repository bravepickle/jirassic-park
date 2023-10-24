export class AppApi {
    config = {
        uriBaseCallback: undefined,
        apiUserCallack: undefined,
        apiPasswordCallback: undefined,
    };

    constructor(cfg) {
        this.initialize(cfg);
    }

    initialize(cfg) {
        _.assign(this.config, cfg);

        // if (this.config['uriBase']) {
        //     this.config['uriBase'] = _.trimEnd(value, '/');
        // }

        return this;
    }

    makeRequest(uri, method = 'get', params = undefined) {
        let cfg = {
            method: method,
            url: this.config.uriBaseCallback() + uri,
            auth: {
                username: this.config.apiUserCallack(),
                password: this.config.apiPasswordCallback(),
            },
            withCredentials: true,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        };

        if (params) {
            cfg.params = params;
        }

        return axios(cfg);
    }

    listFilters() {
        return this.makeRequest('/filter/my');
    }

    searchIssues(jqlQuery) {
        return this.makeRequest('/search', 'get', {jql: jqlQuery});
        // return axios({
        //     method: 'get',
        //     url: this.config.uriBaseCallback() + '/search',
        //     params: {jql: jqlQuery},
        //     auth: {
        //         username: userEl.value,
        //         password: tokenEl.value
        //     },
        //     withCredentials: true,
        //     headers: {
        //         'X-Requested-With': 'XMLHttpRequest',
        //     },
        // });
    }
}

let apiInstance;

export default function instance(config) {
    if (apiInstance) {
        if (config) {
            apiInstance.initialize(config);
        }
    } else {
        apiInstance = new AppApi(config);
    }

    return apiInstance;
}
