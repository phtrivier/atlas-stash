"use strict";
var _ = require("lodash"),
    url = require("url"),
    request = require("request"),
    EventEmitter = require("events").EventEmitter,
    util = require("util"),
    API_BASE = "/rest/api/1.0/";

/**
 *
 * Events:
 * start:    Fired when the very first request is sent
 * newPage:  Fired whenever a page is returned
 * allPages: Fired if once all the pages are gathered together (if requested)
 * end:      Fired after the late page is recieved. This will be fired after all
 *           other events
 * error:    Fired on any error
 *
 **/
var PagedRequest = exports.PagedRequest = function(connectionDetails, limit) {
    this.connectionDetails = connectionDetails;
    this.cursor = 0;
    this.limit = limit || 10;
};

util.inherits(PagedRequest, EventEmitter);

(function(){

    var _request = function(options, callback, errback) {
        if(!_.isObject(options)) {
            options = {};
        }

        options.uri = decodeURIComponent(url.format({
            protocol: this.connectionDetails.protocol,
            hostname: this.connectionDetails.hostname,
            port:     this.connectionDetails.port,
            pathname: API_BASE + options.endpoint
        }));
        options.uri += "?limit="+this.limit+"&start="+this.cursor;
        options.json = true;
        options.auth = {
            user: this.connectionDetails.user,
            pass: this.connectionDetails.password
        };

        options.strictSSL = this.connectionDetails.strictSSL;

        console.log("Getting pages ", options);

        request(options, _.bind(function(error, response, body) {
            if(error) {
                errback(error);
                return;
            }
            this.atLastPage  = body.isLastPage;
            this.cursor     += body.nextPageStart || 0;

            callback(body.values);
        }, this));
    },

    _reportPage = function (page) {
        this.emit("newPage", page);
        if(this.isLastPage) {
            this.emit("end");
        }
    },
    _reportError = function(error) {
        this.emit("error", error);
    };

    this.start = function(method, endpoint) {
        this.reset();
        this.method     = method;
        this.endpoint   = endpoint;

        return this;
    };


    this.setIndex = function(newIndex){
        this.cursor = newIndex;
    };

    this.setLimit = function(newLimit) {
        this.limit = newLimit;
    };

    this.hasNext = function() {
        return !this.atLastPage;
    };

    this.next = function(){
        if(this.cursor === 0) {
            this.emit("start");
        }
        if(!this.atLastPage) {
            _request.call(this, {
                method: this.method,
                endpoint: this.endpoint
            },
            _.bind(_reportPage, this),
            _.bind(_reportError, this));
        }
        else {
            if(this.cursor === 0) {
                this.emit("end");
            }
        }
    };

    this.all = function() {
        this.reset();
        this.remaining();
    };

    var _buildValues = function(values) {
        if(this.hasNext()) {
            _request.call(this,
                {
                    method: this.method,
                    endpoint: this.endpoint
                },
                _.bind(function(newValues) {
                    var accumulatedValues = values.concat(newValues);
                    if(this.atLastPage) {
                        this.emit("allPages", accumulatedValues);
                        _reportPage.call(this, newValues);
                    }
                    else {
                        _reportPage.call(this, newValues);
                        _buildValues.call(this, accumulatedValues);
                    }
                }, this),
                _.bind(_reportError, this)
            );
        }
    };

    this.remaining = function() {
        _buildValues.call(this, []);
    };

    this.reset = function(){
        this.setIndex(0);
        this.atLastPage = false;
        return this;
    };

}).call(PagedRequest.prototype);
