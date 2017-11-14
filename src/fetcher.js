"use strict";

const semantifyUrl = "http://localhost:8081";
const request = require("request");

class Fetcher {

    constructor(apiKey, cb) {
        this.hikingIds = [];
        this.annotations = [];
        this.apiKey = apiKey;
        let that = this;
        this.getGSHikingType(() => {
            this.getSemantifyJsonLd(() => {
                console.log("Got " + apiKey + " data");
                if (typeof cb === "function")
                    cb();
            });
        });
    }

    getGSHikingType(cb) {
        const that = this;
        this.getJson("http://tirol.mapservices.eu/nefos_app/api/resource/search/" + this.apiKey + "/de/fast/hiking", (json) => {
            for (let res of json) {
                that.hikingIds.push(res["id"]);
            }
            cb();
        });
    }

    getSemantifyJsonLd(cb) {
        let asyncCounter = this.hikingIds.length;
        const that = this;
        for (let id of this.hikingIds) {
            this.getJson(semantifyUrl + "/api/annotation/cid/GS-" + id + "-en", (json) => {
                that.annotations.push(json);
                asyncCounter--;
                if (asyncCounter === 0) {
                    cb();
                }
            });
        }
    }

    getJson(url, cb) {
        request({
            url: url,
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                return cb(body);
            }
            else {
                cb(null);
            }
        });
    }

}

module.exports = Fetcher;