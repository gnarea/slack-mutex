/* eslint-env jasmine */

// Generic Webtask.io test utilities


class MockStorage {
    constructor(data) {
        this.data = data;
    }

    get(callback) {
        callback(null, this.data);
    }

    set(data, callback) {
        this.data = data;
        callback(null);
    }
}


export function makeContext(
    {meta={}, query={}, body=null, secrets={}, headers={}, storageData=undefined}
) {
    // Deprecated properties (i.e., data, params) are excluded
    return {
        meta: meta,
        query: query,
        body: body,
        secrets: secrets,
        headers: headers,
        storage: new MockStorage(storageData)
    };
}


export function testWebtaskResult(webtask, context, done, resultCallback) {
    testWebtask(webtask, context, done, (error, result) => {
        expect(error).toBe(null);
        resultCallback(result);
    });
}


export function testWebtaskError(webtask, context, done, errorCallback) {
    testWebtask(webtask, context, done, (error, result) => {
        expect(result).toBe(null);
        errorCallback(error);
    });
}


function testWebtask(webtask, context, done, callback) {
    let webtaskCallbackCalls = 0;
    const webtaskCallback = (error, result) => {
        done();

        webtaskCallbackCalls++;
        expect(webtaskCallbackCalls).toBe(1);

        callback(error, result);
    };

    webtask(context, webtaskCallback);
}
