# dashboard/data

Sanitized sample project registry (`projects.js`) for the Monoga OS dashboard.

- `projects.js` sets `window.MONOGA_OS_DATA` with categories and project entries, labelled in its own metadata as sample data for the public repo.
- Read by the static `dashboard/index.html` and by the local server `dashboard/server.mjs`.
- The server resolves commands from this registry by project id; the client never sends filesystem paths.
- Private workspace content is not included here.
