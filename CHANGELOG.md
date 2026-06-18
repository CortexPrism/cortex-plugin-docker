# Changelog

## [Unreleased]

### Added
- Structured logging via ctx.logger in lifecycle hooks

### Changed
- Renamed manifest file from `cortex.json` to `manifest.json` for consistency with Cortex standard
- Standardized UI section structure to `ui.settings` format
- Normalized parameter naming: `defaultValue` → `default`, `options` → `enum`
- Added `homepage` field with repository URL
- Added `dependencies` field to manifest

## [1.0.1] — 2026-06-15

### Added
- Initial release
## [1.0.1] — 2026-06-17

### Added

- Initial project setup

## [1.0.0] — 2026-06-15

### Added

- Initial release of cortex-plugin-docker
- `docker_list` — List containers
- `docker_run` — Run a container
- `docker_logs` — Get container logs
- `docker_stop` — Stop container
- `k8s_get_pods` — Get Kubernetes pods
- `k8s_describe` — Describe K8s resource
