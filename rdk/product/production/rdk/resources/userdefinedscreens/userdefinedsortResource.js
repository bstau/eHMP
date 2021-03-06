/*jslint node: true */
'use strict';

var rdk = require('../../rdk/rdk');
var _ = require('underscore');
var httpUtil = rdk.utils.http;
var nullChecker = require('../../utils/nullchecker/nullchecker');

var apiDocs = {
    get: {
        spec: {
            summary: '',
            notes: '',
            method: 'GET',
            parameters: [
                rdk.docs.swagger.paramTypes.query('id', 'workspace name', 'string', true)
            ],
            responseMessages: []
        }
    },
    post: {
        spec: {
            summary: '',
            notes: '',
            method: 'POST',
            parameters: [
                rdk.docs.swagger.paramTypes.query('id', 'workspace name', 'string', true)
            ],
            responseMessages: []
        }
    },
    delete: {
        spec: {
            summary: '',
            notes: '',
            method: 'DELETE',
            parameters: [
                rdk.docs.swagger.paramTypes.query('id', 'workspace name', 'string', true),
                rdk.docs.swagger.paramTypes.query('instanceId', 'Applet instance ID for which the sorting to be removed', 'string', true)
            ],
            responseMessages: []
        }
    }
};
var interceptors = {
    pep: false,
    operationalDataCheck: false
};
var permissions = ['save-userdefined-screens'];
var healthcheck = {
    dependencies: ['jdsSync']
};

function getResourceConfig() {
    return [{
        name: '',
        path: '',
        get: getSorting,
        parameters: {
            'get': {
                id: {
                    required: true,
                    description: 'workspace name'
                }
            }
        },
        apiDocs: apiDocs.get,
        interceptors: interceptors,
        healthcheck: healthcheck,
        permissions: permissions
    }, {
        name: '',
        path: '',
        post: createSorting,
        parameters: {
            'post': {
                id: {
                    required: true,
                    description: 'workspace name'
                }
            }
        },
        apiDocs: apiDocs.post,
        interceptors: interceptors,
        healthcheck: healthcheck,
        permissions: permissions
    }, {
        name: '',
        path: '',
        delete: removeSort,
        parameters: {
            delete: {
                id: {
                    required: true,
                    description: 'workspace name'
                },
                instanceId: {
                    required: true,
                    description: 'Applet instance ID for which the sorting to be removed'
                }
            }
        },
        apiDocs: apiDocs.delete,
        interceptors: interceptors,
        healthcheck: healthcheck,
        permissions: permissions
    }];
}

function getSorting(req, res) {
    req.audit.dataDomain = 'Sorting';
    req.audit.logCategory = 'UDS';
    req.audit.authuser = '-';

    var sortId = createSortId(req);
    if (!sortId) {
        var sortIdError = new Error('Unable to find sort ID parameter');
        req.logger.error(sortIdError);
        return res.status(rdk.httpstatus.internal_server_error).send(sortIdError);
    }

    getSortData(sortId, req, function(err, data) {
        if (err) {
            req.logger.error(err);
            res.status(rdk.httpstatus.internal_server_error).send(err);
        } else {
            res.status(rdk.httpstatus.ok).send(data);
        }
    });
}

function createSorting(req, res) {
    req.audit.dataDomain = 'Sorting';
    req.audit.logCategory = 'UDS';
    req.audit.authuser = '-';

    var sortId = createSortId(req);
    if (!sortId) {
        var sortIdError = new Error('Unable to find sort ID parameter');
        req.logger.error(sortIdError);
        return res.status(rdk.httpstatus.internal_server_error).send(sortIdError);
    }

    var input = req.body;

    // Check for required data
    var inputCheck = verifyInput(input);

    if (!inputCheck.valid) {
        req.logger.error(inputCheck.errMsg);
        res.send(rdk.httpstatus.internal_server_error, inputCheck.errMsg);
        return;
    }

    //check if sorting data for this workspace already exists
    getSortData(sortId, req, function(err, data) {
        if (err) {
            req.logger.error('Unable to save custom sorting due to error retrieving existing sorting information');
            req.logger.error(err);
            return res.status(rdk.httpstatus.internal_server_error).send(err);
        } else {

            data = processDataForCreate(sortId, input, data);

            //update if it does, create if not
            postSortData(data, req, function(err, finalData) {
                if (err) {
                    req.logger.error(err);
                    res.status(rdk.httpstatus.internal_server_error).send(err);
                } else {
                    //res.status(rdk.httpstatus.ok).send(finalData);
                    res.status(rdk.httpstatus.ok).send(data);
                }
            });
        }
    });

}

function verifyInput(input) {
    var retObj = {
        'valid': true
    };
    retObj.errMsg = '';
    if (nullChecker.isNullish(input.instanceId)) {
        retObj.errMsg += 'The applet instanceId is required.\n';
        retObj.valid = false;
    }
    if (nullChecker.isNullish(input.keyField)) {
        retObj.errMsg += 'The applet keyField is required.\n';
        retObj.valid = false;
    }

    if (nullChecker.isNullish(input.fieldValue)) {
        retObj.errMsg += 'fieldValue is required.\n';
        retObj.valid = false;
    }

    return retObj;
}

function processDataForCreate(sortId, input, data) {
    //look in data for sorting information for this applet
    if (!data.hasOwnProperty('_id')) {
        data._id = sortId;
    }

    if (!data.hasOwnProperty('applets')) {
        data.applets = [];
    }

    var appletIndex = -1;
    var matchedApplet = _.find(data.applets, function(applet) {
        appletIndex++;
        if (applet && applet.hasOwnProperty('instanceId')) {
            if (applet.instanceId === input.instanceId) {
                return true;
            }
        }
        return false;
    });

    if (matchedApplet && matchedApplet.hasOwnProperty('orderSequence')) {

        //remove the value if it is already exists in orderSequence
        matchedApplet.orderSequence = _.without(matchedApplet.orderSequence, input.fieldValue);

        if (nullChecker.isNullish(input.orderAfter)) {
            data.applets[appletIndex].orderSequence.unshift(input.fieldValue);
        } else {
            var prevItemIndex = _.indexOf(data.applets[appletIndex].orderSequence, input.orderAfter);
            if (prevItemIndex !== -1) {
                data.applets[appletIndex].orderSequence.splice(prevItemIndex + 1, 0, input.fieldValue);
            } else {
                data.applets[appletIndex].orderSequence.unshift(input.fieldValue);
            }
        }

    } else {
        //no matching applet id
        data.applets.push({
            instanceId: input.instanceId,
            keyField: input.keyField,
            orderSequence: [input.fieldValue]
        });
    }

    return data;
}

//keep the below comment, as JSHint incorrectly believe this function is never used
// due to 'delete' being a reserved word in JS but also an HTTP verb
/*exported removeSort */
function removeSort(req, res) {
    req.audit.dataDomain = 'Sort';
    req.audit.logCategory = 'UDS';
    req.audit.authuser = '-';

    //fail fast for missing params
    var instanceId = getInstanceIdParameter(req);
    if (!instanceId) {
        var idErr = new Error('Unable to find instance ID parameter');
        req.logger.error(idErr);
        return res.status(rdk.httpstatus.internal_server_error).send(idErr);
    }

    var sortId = createSortId(req);
    if (!sortId) {
        var sortIdError = new Error('Unable to find sort ID parameter');
        req.logger.error(sortIdError);
        return res.status(rdk.httpstatus.internal_server_error).send(sortIdError);
    }

    //check if sort data for this workspace already exists
    getSortData(sortId, req, function(err, data) {
        if (err) {
            req.logger.error('Unable to delete custom sort due to error retrieving existing sort information');
            req.logger.error(err);
            return res.status(rdk.httpstatus.internal_server_error).send(err);
        } else {
            if (!data.hasOwnProperty('_id')) {
                err = new Error('Unable to find sort information with this id');
                req.logger.error(err);
                return res.status(rdk.httpstatus.internal_server_error).send(err);
            }

            if (!data.hasOwnProperty('applets')) {
                err = new Error('None of the applets are sorted.');
                req.logger.error(err);
                return res.status(rdk.httpstatus.internal_server_error).send(err);
            }

            var appletIndex = -1;
            var matchedApplet = _.find(data.applets, function(applet) {
                appletIndex++;
                if (applet && applet.hasOwnProperty('instanceId')) {
                    if (applet.instanceId === instanceId) {
                        return true;
                    }
                }
                return false;
            });

            if (matchedApplet) {
                data.applets.splice(appletIndex, 1);

                //delete entire workspace sort definition if no applets remain
                if (data.applets.length === 0) {
                    deleteSortData(sortId, req, function(err, finalData) {
                        if (err) {
                            req.logger.error(err);
                            res.status(rdk.httpstatus.internal_server_error).send(err);
                        } else {
                            res.status(rdk.httpstatus.ok).send(finalData);
                        }
                    });
                } else {
                    //otherwise save the updated sorting data
                    postSortData(data, req, function(err, finalData) {
                        if (err) {
                            req.logger.error(err);
                            res.status(rdk.httpstatus.internal_server_error).send(err);
                        } else {
                            res.status(rdk.httpstatus.ok).send(data);
                        }
                    });
                }
            } else {
                //no matching applet id
                err = new Error('Unable to find sore data with this instanceid');
                req.logger.error(err);
                return res.status(rdk.httpstatus.internal_server_error).send(err);
            }

        }
    });

}

function getSortData(sortId, req, callback) {

    var options = _.extend({}, req.app.config.generalPurposeJdsServer, {
        method: 'GET',
        path: '/user/get/' + sortId
    });

    var config = {
        options: options,
        protocol: 'http',
        timeoutMillis: 120000,
        logger: req.logger || {}
    };

    httpUtil.fetch(config, function(err, result) {
        if (err) {
            config.logger.error(err.message);
            callback(err);
            return;
        }
        var returnedData;
        try {
            returnedData = JSON.parse(result);
        } catch (ex) {
            config.logger.error(ex);
            callback(ex);
            return;
        }

        callback(null, returnedData);
    });
}

function postSortData(content, req, callback) {
    var options = _.extend({}, req.app.config.generalPurposeJdsServer, {
        method: 'POST',
        path: '/user/set/this'
    });

    var config = {
        options: options,
        protocol: 'http',
        timeoutMillis: 120000,
        logger: req.logger || {}
    };

    httpUtil.post(content, config,
        function(err, data) {
            if (err) {
                config.logger.error('Unable to POST sorting data. Error: ' + err);
                if (callback) {
                    callback(err);
                }
            } else {
                if (callback) {
                    callback(null, data);
                }
            }
        },
        function responseProcessor(statusCode, data) {
            return data;
        }
    );
}

function duplicateSortData(req, sourceSortId, destinationSortId, callback) {
    //get the sort from the source workspace
    getSortData(sourceSortId, req, function(err, data) {
        if (err) {
            callback(err);
        } else {
            //Post the same sort to the new workspace after updating the _id
            if (data && data.hasOwnProperty('_id')) {
                data._id = destinationSortId;
                postSortData(data, req, callback);
            } else {
                callback(null, data);
            }
        }
    });
}

//delete entire sort data for a workspace
//this is only called when sorting is removed from all applets in a workspace
function deleteSortData(sortId, req, callback) {
    var options = _.extend({}, req.app.config.generalPurposeJdsServer, {
        method: 'GET',
        path: '/user/destroy/' + sortId
    });

    var config = {
        options: options,
        protocol: 'http',
        timeoutMillis: 120000,
        logger: req.logger || {}
    };

    httpUtil.fetch(config, function(err, result) {
        if (err) {
            config.logger.error(err.message);
            callback(err);
            return;
        }
        var returnedData;
        try {
            returnedData = JSON.parse(result);
            config.logger.debug(returnedData);
        } catch (ex) {
            config.logger.error(err.message);
            callback(err);
            return;
        }
        if (result === '{}') {
            callback(null, returnedData);
        } else {
            //malformed json
            err = new Error('Unexpected JSON format');
            callback(err);
            return;
        }

    });
}

function createSortId(req) {
    var userSession = req.session.user || {};
    var id = req.param('id') || null;
    var site = userSession.site || null;
    var ien = userSession.duz[site] || null;

    if (ien && site && id) {
        return site + ';' + ien + '_' + id + '_sort';
    } else {
        return null;
    }
}

function createSortIdFromString(req, id) {
    var userSession = req.session.user || {};
    var site = userSession.site || null;
    var ien = userSession.duz[site] || null;

    if (ien && site && id) {
        return site + ';' + ien + '_' + id + '_sort';
    } else {
        return null;
    }
}

function getInstanceIdParameter(req) {
    return req.param('instanceId') || null;
}

module.exports.getResourceConfig = getResourceConfig;
module.exports.createSortId = createSortId;
module.exports.deleteSortData = deleteSortData;
module.exports.createSortIdFromString = createSortIdFromString;
module.exports._processDataForCreate = processDataForCreate;
module.exports._verifyInput = verifyInput;
module.exports.duplicateSortData = duplicateSortData;
