/* eslint-env jasmine */

import {Mutex, LockingError} from "../src/mutex";

const STUB_CLAIMANT = "House Lannister";


describe("Mutex", () => {
    it("has no claimant by default", () => {
        let mutex = new Mutex();
        expect(mutex.claimant).toBeNull();
    });

    it("can be constructed with a claimant", () => {
        let mutex = new Mutex(STUB_CLAIMANT);
        expect(mutex.claimant).toBe(STUB_CLAIMANT);
    });

    describe("locking", () => {
        it("succeeds if unlocked", () => {
            let mutex = new Mutex();
            expect(() => {mutex.lock(STUB_CLAIMANT);}).not.toThrow();
        });

        it("succeeds if already locked by same claimant", () => {
            let mutex = new Mutex(STUB_CLAIMANT);
            mutex.lock(STUB_CLAIMANT);
            expect(mutex.claimant).toBe(STUB_CLAIMANT);
        });

        it("fails if already locked by different claimant", () => {
            let mutex = new Mutex(STUB_CLAIMANT);
            expect(() => {mutex.lock("Daenerys Targaryen");}).
                toThrow(new LockingError(STUB_CLAIMANT));
            expect(mutex.claimant).toBe(STUB_CLAIMANT);
        });
    });

    describe("unlocking", () => {
        it("succeeds if already unlocked", () => {
            let mutex = new Mutex();
            mutex.unlock(STUB_CLAIMANT);
            expect(mutex.claimant).toBeNull();
        });

        it("succeeds if locked by same claimant", () => {
            let mutex = new Mutex(STUB_CLAIMANT);
            mutex.unlock(STUB_CLAIMANT);
            expect(mutex.claimant).toBeNull();
        });

        it("fails if locked by different claimant", () => {
            let mutex = new Mutex(STUB_CLAIMANT);
            expect(() => {mutex.unlock("Jon Snow");}).
                toThrow(new LockingError(STUB_CLAIMANT));
            expect(mutex.claimant).toBe(STUB_CLAIMANT);
        });
    });
});


describe("LockingError", () => {
    it("should expose original claimant", () => {
        const error = new LockingError(STUB_CLAIMANT);
        expect(error.originalClaimant).toBe(STUB_CLAIMANT);
    });

    it("should mention original claimant in the message", () => {
        const error = new LockingError(STUB_CLAIMANT);
        expect(error.message).toContain(STUB_CLAIMANT);
    });
});
