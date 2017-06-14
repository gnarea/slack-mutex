export class Mutex {
    constructor(claimant=null) {
        this.claimant = claimant;
    }

    lock(claimant) {
        this._requireClaimantToMatchCurrent(claimant);
        this.claimant = claimant;
    }

    unlock(claimant) {
        this._requireClaimantToMatchCurrent(claimant);
        this.claimant = null;
    }

    _requireClaimantToMatchCurrent(prospectiveClaimant) {
        if (this.claimant && prospectiveClaimant !== this.claimant) {
            throw new LockingError(this.claimant);
        }
    }
}


export class LockingError extends Error {
    constructor(originalClaimant) {
        super(`${originalClaimant} claimed the resource`);

        this.originalClaimant = originalClaimant;
    }
}
