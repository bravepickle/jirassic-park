export class AppApi {
    config = {
        uriBaseCallback: undefined,
        apiUserCallback: undefined,
        apiPasswordCallback: undefined,
        onError: undefined,
        dispatcher: postal,
    };

    /**
     * @type {null,Axios}
     */
    instance = null;

    constructor(cfg) {
        this.initialize(cfg);
    }

    initialize(cfg) {
        _.assign(this.config, cfg);

        // if (this.config['uriBase']) {
        //     this.config['uriBase'] = _.trimEnd(value, '/');
        // }

        this.config.dispatcher.subscribe({
            channel: 'requests',
            topic: 'api.listFilters',
            callback: function onListFilters(data, envelope) {
                console.log('[requests][api.listFilters]', data, envelope);
            },
        });

        this.instance = axios.create({
            withCredentials: true,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        this.instance.interceptors.response.use((response) => {
            if (!response.data) {
                return null;
            }

            // Any status code that lie within the range of 2xx cause this function to trigger
            // Do something with response data
            return response.data;
        }, (error) => {
            if (this.config.onError) {
                this.config.onError(error);
            }

            // Any status codes that falls outside the range of 2xx cause this function to trigger
            // Do something with response error
            return Promise.reject(error);
        });

        return this;
    }

    makeRequest(uri, method = 'get', params = undefined) {
        let cfg = {
            baseURL: this.config.uriBaseCallback(),
            auth: {
                username: this.config.apiUserCallback(),
                password: this.config.apiPasswordCallback(),
            },
            method: method,
            url: uri,
        };

        if (params) {
            cfg.params = params;
        }

        return this.instance.request(cfg);
    }

    listFilters() {
        return this.makeRequest('/filter/my');
    }

    searchIssues(jqlQuery) {
        return this.makeRequest('/search', 'get', {jql: jqlQuery});
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
