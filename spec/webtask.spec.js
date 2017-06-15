/* eslint-env jasmine */

import webtask from "../src/webtask";
import {
    makeContext,
    testWebtaskResult,
    testWebtaskError
} from "./webtaskTestHelpers";


const STUB_SLACK_COMMAND = "/mutex";

const STUB_RESOURCE = "kings-landing";

const STUB_SLACK_USERNAME = "khaleesi";
const STUB_ALT_SLACK_USERNAME = "cersei";


describe("Webtask subcommand", () => {
    describe("'help'", () => {
        it("is run upon request", (done) => {
            const context = makeCommandContext("help");

            testResult(context, done, expectStringToBeHelpText);
        });

        it("is run when subcommand isn't recognised", (done) => {
            const context = makeCommandContext("stop-winter");

            testResult(context, done, expectStringToBeHelpText);
        });

        it("is run when no arguments are provided", (done) => {
            const context = makeCommandContext("");

            testResult(context, done, expectStringToBeHelpText);
        });

        it("is run when resource is required but not provided", (done) => {
            const context = makeCommandContext("show");

            testResult(context, done, expectStringToBeHelpText);
        });
    });

    describe("'show'", () => {
        it("tells when no-one locked the resource", (done) => {
            const context = makeCommandContext(`show ${STUB_RESOURCE}`);

            testResult(context, done, (result) => {
                expect(result).toBe(`${STUB_RESOURCE} is unclaimed`);
            });
        });

        it("tells who locked the resource", (done) => {
            const claimant = STUB_SLACK_USERNAME;
            const context = makeCommandContext(
                `show ${STUB_RESOURCE}`,
                {resourceClaims: {[STUB_RESOURCE]: claimant}}
            );

            testResult(context, done, (result) => {
                expect(result)
                    .toBe(`${STUB_RESOURCE} is claimed by @${claimant}`);
            });
        });
    });

    describe("'lock'", () => {
        it("locks the resource if claimant is eligible", (done) => {
            const context = makeCommandContext(`lock ${STUB_RESOURCE}`);

            testResult(context, done, (result) => {
                expect(result).toBe(`You've successfully claimed ${STUB_RESOURCE}`);
                expect(context.storage.data).toEqual({[STUB_RESOURCE]: STUB_SLACK_USERNAME});
            });
        });

        it("fails if claimant is ineligible", (done) => {
            const originalClaimant = STUB_ALT_SLACK_USERNAME;
            const originalResourceClaims = {[STUB_RESOURCE]: originalClaimant};
            const context = makeCommandContext(
                `lock ${STUB_RESOURCE}`,
                {resourceClaims: originalResourceClaims}
                );

            testResult(context, done, (result) => {
                expect(result).toBe(`Sorry, ${STUB_RESOURCE} is claimed by @${originalClaimant}`);
                expect(context.storage.data).toBe(originalResourceClaims);
            });
        });
    });

    describe("'unlock'", () => {
        it("unlocks the resource if claimant is eligible", (done) => {
            const originalResourceClaims =
                {[STUB_RESOURCE]: STUB_SLACK_USERNAME};
            const context = makeCommandContext(
                `unlock ${STUB_RESOURCE}`,
                {resourceClaims: originalResourceClaims}
                );

            testResult(context, done, (result) => {
                expect(result).toBe(`You've successfully released ${STUB_RESOURCE}`);
                expect(context.storage.data).toEqual({[STUB_RESOURCE]: null});
            });
        });

        it("fails if claimant is ineligible", (done) => {
            const originalClaimant = STUB_ALT_SLACK_USERNAME;
            const originalResourceClaims = {[STUB_RESOURCE]: originalClaimant};
            const context = makeCommandContext(
                `unlock ${STUB_RESOURCE}`,
                {resourceClaims: originalResourceClaims}
                );

            testResult(context, done, (result) => {
                expect(result).toBe(`Sorry, ${STUB_RESOURCE} is claimed by @${originalClaimant}`);
                expect(context.storage.data).toBe(originalResourceClaims);
            });
        });
    });
});


describe("Webtask", () => {
    it("fails when storage fails to retrieve data", (done) => {
        const context = makeCommandContext(`show ${STUB_RESOURCE}`);
        const stubStorageError = new Error("Can't read");
        context.storage.get = (cb) => cb(stubStorageError, null);

        testError(context, done, (error) => {
            expect(error).toEqual(stubStorageError);
        });
    });

    it("fails when storage fails to save data", (done) => {
        const context = makeCommandContext(`lock ${STUB_RESOURCE}`);
        const stubStorageError = new Error("Can't write");
        context.storage.set = (_, cb) => cb(stubStorageError);

        testError(context, done, (error) => {
            expect(error).toEqual(stubStorageError);
        });
    });

    it("fails when the 'resources' secret is unset", (done) => {
        const context = makeCommandContext(`show ${STUB_RESOURCE}`);
        context.secrets = {};

        testError(context, done, (error) => {
            expect(error).toEqual("Secret 'resources' must be set");
        });
    });

    it("fails when the resource in unknown", (done) => {
        const context = makeCommandContext(
            `show ${STUB_RESOURCE}`,
            {resources: [`${STUB_RESOURCE}-unknown`]}
        );

        testResult(context, done, (result) => {
            expect(result).toBe(`Resource ${STUB_RESOURCE} doesn't exist`);
        });
    });

    it("works with empty storage", (done) => {
        const context = makeCommandContext(`show ${STUB_RESOURCE}`);
        context.storage.data = undefined;

        testResult(context, done, (result) => {
            expect(result).toBe(`${STUB_RESOURCE} is unclaimed`);
        });
    });

    it("works with multiple resources in the secrets", (done) => {
        const additionalResource = `${STUB_RESOURCE}-extra`;
        const context = makeCommandContext(
            `show ${additionalResource}`,
            {resources: [STUB_RESOURCE, additionalResource]}
        );

        testResult(context, done, (result) => {
            expect(result).toBe(`${additionalResource} is unclaimed`);
        });
    });
});


function makeCommandContext(
    text,
    {resources=[STUB_RESOURCE], resourceClaims={}} = {}
) {
    return makeContext({
        body: {
            text: text,
            command: STUB_SLACK_COMMAND,
            user_name: STUB_SLACK_USERNAME
        },
        secrets: {"resources": resources.join()},
        storageData: resourceClaims
    });
}


function testResult(context, done, callback) {
    testWebtaskResult(webtask, context, done, (result) => {
        expect(result.text).toBeDefined();
        callback(result.text);
    });
}


function testError(context, done, callback) {
    testWebtaskError(webtask, context, done, callback);
}


function expectStringToBeHelpText(string) {
    expect(string).toContain(`${STUB_SLACK_COMMAND} help`);
    expect(string).toContain(`${STUB_SLACK_COMMAND} show RESOURCE`);
    expect(string).toContain(`${STUB_SLACK_COMMAND} lock RESOURCE`);
    expect(string).toContain(`${STUB_SLACK_COMMAND} unlock RESOURCE`);
}
