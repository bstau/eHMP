/*jslint node: true */
'use strict';
var ra = require('../common/entities/conditionObjects.js'),
    errors = require('../common/errors'),
    //   helpers = require('../common/utils/helpers.js'),
    domains = require('../common/domainmap.js'),
    fhirResource = require('../common/entities/fhirResource'),
    fhirUtils = require('../common/utils/fhirUtils'),
    constants = require('../common/utils/constants'),
    rdk = require('../../rdk/rdk'),
    querystring = require('querystring'),
    _ = rdk.utils.underscore,
    nullchecker = rdk.utils.nullchecker,
    parameters = {
        get: {
            'subject.identifier': {
                required: true,
                description: 'patient id'
            },
            uid: {
                required: false,
                description: 'must be a uid inside the data of this patient'
            },
            start: {
                required: false,
                regex: /\d+/,
                description: 'start showing results from this 0-based index'
            },
            limit: {
                required: false,
                regex: /\d+/,
                description: 'show this many results'
            }
        }
    };

//http://10.2.2.110:9080/vpr/all/find/problem?filter=like(%22problemText%22,%22%25%22)
//get all problems in the system

//http://10.2.2.110:9080/vpr/9E7A;20/find/problem
//get all problems for a specific pid

var apiDocs = {
    spec: {
        path: '/fhir/condition',
        nickname: 'fhir-condition',
        summary: 'Converts a vpr \'Problem\' resource into a FHIR \'Condition\' resource.',
        notes: '',
        method: 'GET',
        parameters: [
            rdk.docs.commonParams.fhir.si,
            rdk.docs.commonParams.uid(false),
            rdk.docs.commonParams.jds.start,
            rdk.docs.commonParams.jds.limit
        ],
        responseMessages: []
    }
};

function getResourceConfig() {
    return [{
        name: 'getProblems',
        path: '',
        get: getProblems,
        interceptors: {
            synchronize: true
        },
        parameters: parameters,
        apiDocs: apiDocs,
        healthcheck: {
            dependencies: ['patientrecord', 'jds', 'solr', 'authorization']
        },
        permissions: []
    }];
}



function getProblems(req, res) {
    getData(req, function(err, data) {
        if (err) {
            req.logger.error(err.message);
            res.send(rdk.httpstatus.internal_server_error, err.message);
        } else {
            res.send(rdk.httpstatus.ok,
                buildBundle(convertToFhir(data, req), req) // convertToFhir(data, req)
            );
        }
    });
}



function getData(req, callback, next) {

    var pid = req.param('subject.identifier'),
        uid = req.param('uid'),
        start = req.param('start') || 0,
        limit = req.param('limit'),
        config = req.app.config,
        jdsResource,
        jdsPath,
        jdsQuery = {
            start: start
        };
    if (nullchecker.isNullish(pid)) {
        return next();
    }
    if (limit) {
        jdsQuery.limit = limit;
    }
    if (uid) {
        jdsQuery.filter = 'like("uid","' + uid + '")';
    }
    jdsResource = '/vpr/' + pid + '/index/' + domains.jds('problem');
    jdsPath = jdsResource + '?' + querystring.stringify(jdsQuery);
    var options = _.extend({}, config.jdsServer, {
            path: jdsPath,
            method: 'GET'
        }),
        httpConfig = {
            protocol: 'http',
            timeoutMillis: 120000,
            logger: req.logger,
            options: options
        };
    rdk.utils.http.fetch(httpConfig, function(error, result) {

        if (error) {
            callback(new errors.FetchError('Error fetching pid=' + pid + ' - ' + (error.message || error), error));
        } else {
            var obj = JSON.parse(result);
            if ('data' in obj) {
                return callback(null, obj);
            } else if ('error' in obj) {
                if (errors.isNotFound(obj)) {
                    return callback(new errors.NotFoundError('Object not found', obj));
                }
            }
            return callback(new Error('There was an error processing your request. The error has been logged.'));
        }
    });
}

function convertToFhir(inputJSON, req) {
    var outJSON = [],
        items = inputJSON.data.items;
    for (var i = 0, l = items.length; i < l; i++) {
        //add meta to item
        items[i].fhirMeta = {
            _pid: req._pid,
            _originalUrl: req.originalUrl,
            _host: req.headers.host,
            _protocol: req.protocol
        };
        outJSON.push(ra.conditionFactory('ConditionItem', items[i]));
    }
    return outJSON;
}

function buildBundle(results, req) {
    var b = new fhirResource.Bundle();
    b.updated = fhirUtils.convertDate2FhirDateTime(new Date());
    b.author.push(new fhirResource.Author());
    if (req) {
        b.link.push(new fhirResource.Link(req.protocol + '://' + req.headers.host + req.originalUrl, 'self'));
        if (req._pid !== undefined) {
            b.title = 'Condition with subject.identifier \'' + req._pid + '\'';
        }
    }
    b.totalResults += results.length;
    for (var i in results) {
        if (nullchecker.isNotNullish(results[i])) {
            var e = new fhirResource.Entry(results[i]);
            e.title = 'condition for patient [' + req._pid + ']';
            e.id = constants.conditionsFhir.CONDITION_PREFIX + (e.content._id || e.content.id || 'null');
            e.link.push(new fhirResource.Link(req.protocol + '://' + req.headers.host + '/fhir/condition/' + (e.content._id || e.content.id || '@null'), 'self'));
            e.updated = fhirUtils.convertDate2FhirDateTime(new Date());
            e.published = fhirUtils.convertDate2FhirDateTime(new Date());
            e.author.push(new fhirResource.Author());

            b.entry.push(e);
        }
    }

    return b;
}
module.exports.convertToFhir = convertToFhir;
module.exports.getResourceConfig = getResourceConfig;
