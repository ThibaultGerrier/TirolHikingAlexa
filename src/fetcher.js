// const semantifyUrl = 'http://localhost:8081';
const semantifyUrl = 'http://semantify.it';
const request = require('request');

const getJson = (url, cb) => {
    request({
        url,
        json: true,
    }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            cb(body);
        } else {
            cb(null);
        }
    });
};

class Fetcher {
    constructor(apiKey, lang, cb) {
        this.hikingIds = [];
        this.annotations = {};
        this.apiKey = apiKey;
        this.lang = lang;
        this.getGSHikingType(() => {
            this.getSemantifyJsonLd(() => {
                console.log(`Got ${apiKey} data`, Object.keys(this.annotations).length);
                if (typeof cb === 'function') { cb(); }
            });
        });
    }

    getGSHikingType(cb) {
        const that = this;
        getJson(`http://tirol.mapservices.eu/nefos_app/api/resource/search/${this.apiKey}/${this.lang}/fast/hiking`, (json) => {
            json.forEach((res) => {
                that.hikingIds.push(res.id);
            });
            cb();
        });
    }

    getSemantifyJsonLd(cb) {
        let asyncCounter = this.hikingIds.length;
        const that = this;
        this.hikingIds.forEach((id) => {
            getJson(`${semantifyUrl}/api/annotation/cid/GS-${id}-${this.lang}`, (json) => {
                if (!json) {
                    // console.log(this.apiKey, id);
                } else {
                    that.annotations[json.identifier] = json;
                }
                asyncCounter -= 1;
                if (asyncCounter === 0) {
                    cb();
                }
            });
        });
    }
}

module.exports = Fetcher;
