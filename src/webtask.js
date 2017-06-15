import "core-js";
import {Mutex, LockingError} from "./mutex";
import {Promise} from "bluebird";


module.exports = (context, cb) => {
    const managedResources = splitOptionalString(context.secrets.resources, ",");
    const [subcommand, resource] = splitOptionalString(context.body.text, " ");

    let responsePromised;
    if (managedResources.length === 0) {
        responsePromised = Promise.reject("Secret 'resources' must be set");
    } else if (subcommand === "help" || !resource) {
        responsePromised = Promise.resolve(getHelpText(context.body.command));
    } else if (!managedResources.includes(resource)) {
        responsePromised = Promise.resolve(`Resource ${resource} doesn't exist`);
    } else {
        const storageGetterPromised =
            Promise.promisify(context.storage.get, {context: context.storage});
        responsePromised = storageGetterPromised()
            .then((data) => data || {})
            .then((data) => runResourceSubcommand(
                resource,
                subcommand,
                data,
                context
            ));
    }

    responsePromised
        .then((msg) => {cb(null, msg);})
        .catch((error) => {cb(error, null);});
};


function runResourceSubcommand(resource, subcommand, storageData, context) {
    const claimant = context.body.user_name;
    const originalClaimant = storageData[resource];
    const mutexPromised = Promise.resolve(new Mutex(originalClaimant));

    let subcommandPromised;
    switch (subcommand) {
        case "show": {
            subcommandPromised = showView(mutexPromised, resource);
            break;
        }
        case "lock": {
            subcommandPromised = lockView(
                mutexPromised,
                claimant,
                resource,
                storageData,
                context.storage
            );
            break;
        }
        case "unlock": {
            subcommandPromised = unlockView(
                mutexPromised,
                claimant,
                resource,
                storageData,
                context.storage
            );
            break;
        }
        default: {
            subcommandPromised = Promise.resolve(getHelpText(context.body.command));
            break;
        }
    }
    return subcommandPromised;
}


// ===== Views (as in MVC)


function showView(mutexPromised, resource) {
    return mutexPromised
        .then((mutex) =>
            mutex.claimant ?
                `${resource} is claimed by @${mutex.claimant}`
                :
                `${resource} is unclaimed`
        );
}


function lockView(mutexPromised, claimant, resource, data, storage) {
    return mutexPromised
        .then((m) => m.lock(claimant))
        .then(() => saveResourceClaimant(resource, claimant, data, storage))
        .then(() => `You've successfully claimed ${resource}`)
        .catch(LockingError, (error) =>
            `Sorry, ${resource} is claimed by @${error.originalClaimant}`
        );
}


function unlockView(mutexPromised, claimant, resource, data, storage) {
    return mutexPromised
        .then((m) => m.unlock(claimant))
        .then(() => saveResourceClaimant(resource, null, data, storage))
        .then(() => `You've successfully released ${resource}`)
        .catch(LockingError, (error) =>
            `Sorry, ${resource} is claimed by @${error.originalClaimant}`
        );
}


// ===== Utilities


function splitOptionalString(string, separator) {
    const stringSanitised = (string || "").trim();
    return stringSanitised ? stringSanitised.split(separator) : [];
}


function getHelpText(slack_command) {
    return `How to use ${slack_command}

\`${slack_command} help\`: This message
\`${slack_command} show RESOURCE\`: Tell who (if anyone) claimed \`RESOURCE\`
\`${slack_command} lock RESOURCE\`: Claim \`RESOURCE\`
\`${slack_command} unlock RESOURCE\`: Release \`RESOURCE\`
`;
}


function saveResourceClaimant(resource, claimant, data, storage) {
    const newData = Object.assign({}, data, {[resource]: claimant});
    const storageSetterPromised =
        Promise.promisify(storage.set, {context: storage});
    return storageSetterPromised(newData);
}
