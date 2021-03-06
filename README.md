# Airbitz CLI

This utility contains a wide variety of commands for working with the Edge login system (formerly Airbitz).

Install the CLI globally using `npm install -g airbitz-cli`.

You can see documentation by running `airbitz-cli help`.

## Developing

The `airbitz-cli` script in the top-level of this repository builds and launches the CLI. If you symlink the `edge-core-js` library via `npm link`, this script will also rebuild the core library before each launch as well. This makes development fairly seamless, since there is no need to manually build anything.

We don't have unit tests yet, but we do have linting set to run before every git commit. We follow the [JavaScript Standard Style](https://standardjs.com/) guide.
