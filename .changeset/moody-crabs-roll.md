---
---

Pre-release fix, no version bump: nanoterm has not been published yet, so this
lands as part of `1.0.0` rather than as a patch on top of a version nobody can
install.

The setup wizard now writes where the app reads. It resolved the platform
config directory directly while `loadConfig` honours `NANOCODER_CONFIG_DIR`
instead of it, so anyone already running Nanocoder configured nanoterm, was told
"Success!", and had the app read none of it. Both now go through one resolver.

The wizard also says so when a project-local `agents.config.json` in the working
directory will shadow what it just saved — that path still wins in `loadConfig`,
and a successful-looking setup that changes nothing is the failure this is all
arranged to prevent.

Licence corrected from ISC to MIT, matching every other Nano Collective package.
