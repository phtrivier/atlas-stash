"use strict";
var _ = require("lodash"),
    url = require("url"),
    request = require("request"),
    PagedRequest = require("./paged-request").PagedRequest,
    API_BASE = "/rest/api/1.0/";

var StashApi = exports.StashApi = function(protocol, hostname, port, user, password, strictSSL) {
    this.protocol = protocol || "http";
    this.hostname = hostname;
    this.port     = port;
    this.user     = user;
    this.password = password;
    this.strictSSL = (strictSSL !== false);
};

(function(){

    var _connectionDetails = function (obj) {
        return {
            protocol: obj.protocol,
            hostname: obj.hostname,
            port:     obj.port,
            user:     obj.user,
            password: obj.password,
            strictSSL : obj.strictSSL
        };
    };

    this.request = function(options, callback, errback) {
        if(!_.isObject(options)) {
            options = {};
        }
        if(!_.isFunction(errback)) {
            errback = function(error) {
                callback(null, error);
            };
        }

        options.uri = decodeURIComponent(url.format({
            protocol: this.protocol,
            hostname: this.hostname,
            port: this.port,
            pathname: API_BASE + options.endpoint
        }));
        options.json = true;
        options.auth = {
            user: this.user,
            pass: this.password
        };
        console.log(options);

        request(options, function(error, response, body) {
            if(error) {
                errback(error);
                return;
            }

            callback(body);
        });
    };

    /**
     * Generically get an URL
     */
    this.get = function (url) {
        var pReq = new PagedRequest(_connectionDetails(this));
        _.defer(_.bind(pReq.remaining, pReq));
        return pReq.start("GET", url);
    };

    /**
     * Get a list of all projects in Stash
     *
     * @return {PagedRequest}
     */
    this.projects = function () {
        var pReq = new PagedRequest(_connectionDetails(this));
        _.defer(_.bind(pReq.remaining, pReq));
        return pReq.start("GET", "projects");
    };

    /**
     * Get a list of all repos associated with a project
     *
     * @param {string} projectKey
     * @return {PagedRequest}
     */
    this.repos = function (projectKey) {
        var pReq = new PagedRequest(_connectionDetails(this));
        _.defer(_.bind(pReq.remaining, pReq));
        return pReq.start("GET", "projects/"+projectKey+"/repos");
    };

    this.branches = function (projectKey, repositorySlug) {
        return this.get(["projects", projectKey, "repos", repositorySlug, "branches"].join("/"));
    };

    this.prs = function (projectKey, repositorySlug) {
        return this.get(["projects", projectKey, "repos", repositorySlug, "pull-requests"].join("/"));
    };

    this.prsCommits = function(projectKey, repositorySlug, prid) {
        return this.get(["projects", projectKey, "repos", repositorySlug, "pull-requests", prid, "commits"].join("/"));
    };


}).call(StashApi.prototype);
