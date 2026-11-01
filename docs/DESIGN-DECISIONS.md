# Design decisions

## Playlist Limit on node version 1

**Decision.** A version 1 node sends the Limit only when the saved workflow stores a `limit` value. Any stored value is sent, including 50. A node that stores no limit sends none, and the API returns its default of up to 200 videos.

**Why.** Two earlier releases sent different requests for the same saved version 1 node, and nothing in a saved workflow tells them apart:

| Release | Version 1 node with no stored `limit` | Version 1 node with a stored `limit` |
|---|---|---|
| 0.1.0 to 0.1.11 | no limit sent, up to 200 videos | no limit sent, the value is ignored |
| 0.2.0 | `limit=50` sent | stored value sent |
| 0.3.3 and later | no limit sent, up to 200 videos | stored value sent |

The node therefore cannot match both 0.1.x and 0.2.0 for a node with no stored limit, so it follows 0.1.x:
- 0.1.x was the published line from 2026-01-21 until 2026-11-01. The npm download API reported 270 downloads of 0.1.x versions in the last week, and none of 0.2.0 (`https://api.npmjs.org/versions/n8n-nodes-smartprofiling/last-week`, read 2026-11-01, the API can lag by a day).
- 0.2.0 was the latest version for 37 minutes, from 2026-11-01 10:32 UTC (published) to 11:09 UTC (0.3.0 published), per `npm view n8n-nodes-smartprofiling time`.
- A stored limit is a value a person chose in the editor, so it is sent. 0.1.x ignoring it was the bug 0.2.0 fixed.

A workflow built on 0.2.0 that relied on the default of 50 gets it back by setting the Limit to 50 in the editor, or by replacing the node with a new one, which uses version 1.1 and always sends the Limit.

**Evidence that the editor never stores the default.**
- n8n saves node parameters through `NodeHelpers.getNodeParameters(properties, parameters, returnDefaults = false, ...)` in `packages/frontend/editor-ui/src/app/utils/nodes/nodeTransforms.ts` (n8n-io/n8n master, commit f5ed6cc72cdc, lines 229 to 236). With `returnDefaults` false, a parameter equal to its default is dropped.
- The Limit default has been 50 since 0.1.x (tags v0.1.11 and v0.2.0).
- `test/round4.test.cjs` runs the same `getNodeParameters` call on this node's properties and asserts that a limit of 50 is not stored and a limit of 5 is.

So a stored `limit: 50` can only come from a workflow written outside the editor, such as an API call, an import or a hand-edited file. That value is an explicit choice, so it is sent.

**Considered and rejected.**
- Dropping a stored 50 (0.3.2). This silently changes an explicit value to the API default of 200.
- Dropping every stored Limit on version 1 (0.3.0). This breaks workflows saved on 0.2.0, which sent their Limit.
- A version 1.2 with a "Use API default" toggle. It would not change how existing version 1 nodes behave, and version 1.1 already sends the Limit.
