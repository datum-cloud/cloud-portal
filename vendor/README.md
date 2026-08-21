# Vendored packages

`datum-cloud-datum-ui-2.2.0.tgz` is a local build of `@datum-cloud/datum-ui@2.2.0`
(nested nav badges, tree guide, smoother collapsible motion) until that version
is published to the npm registry.

After publishing, replace the `file:./vendor/...` dependency in `package.json`
with `"@datum-cloud/datum-ui": "^2.2.0"` and remove this tarball.
