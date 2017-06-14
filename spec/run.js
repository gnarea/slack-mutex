// Running Jasmine directly as a workaround to use ES6 transpilation

import Jasmine from "jasmine";

let jasmine = new Jasmine();
jasmine.loadConfig({
    "spec_dir": "spec",
    "spec_files": ["**/*.spec.js"],
    "stopSpecOnExpectationFailure": false,
    "random": false
});
jasmine.execute();
