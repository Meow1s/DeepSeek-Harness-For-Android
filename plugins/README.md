# Bundled DSH plugins

This directory contains source snapshots of two DSH plugins so the launcher can
work offline without a separate `dsh plugin add` step:

| Directory | Package | Version | License | Upstream |
| --- | --- | --- | --- | --- |
| `dsh-web-mobile` | `dsh-web-mobile` | 3.2.1 | MIT | https://github.com/mexiaosqwq/dsh-web-mobile |
| `dsh-ops` | `dsh-ops` | 0.4.1 | MIT AND Apache-2.0 | https://github.com/T-Auto/dsh-ops |

## What they do

- **dsh-web-mobile** is the mobile UI layer: drawer navigation, mobile header,
  bottom sheets, safe-area handling, and touch-friendly composer controls.
- **dsh-ops** adds native file and shell tools to DSH (its runtime support
  depends on the host platform).

## How they are installed

`scripts/install-plugins.sh` links these directories into the DSH profile
(`$DSH_HOME/profiles/web` by default) with `dsh plugin add link:...` and ensures
both packages are present in `dsh.profile.bundles`. The launcher's
`scripts/start.sh` and Android boot hook run the installer best-effort.

Restart DSH after installing or changing plugins. DSH loads client bundles at
process start; reloading the browser is not enough.

## Updates

These are snapshots, not submodules. To update:

1. Install the new version in a temporary DSH profile.
2. Replace the directory and its license files.
3. Update the version table above and the launcher README.
4. Test the mobile UI and dsh-ops tools on a DSH instance before committing.

Do not add user data, sessions, tokens, or local configuration under
`plugins/`.
