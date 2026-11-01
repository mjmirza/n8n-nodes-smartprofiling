# Design decisions

## Playlist Limit on node version 1

**Decision.** A version 1 node sends the Limit only when the saved workflow stores a `limit` value. Any stored value is sent, including 50. A node that stores no limit sends none, and the API returns its default of up to 200 videos.

**Why.** The releases disagreed on version 1. 0.1.x never sent the Limit. 0.2.0 and 0.3.1 sent a stored Limit. The rule above keeps every workflow saved in the n8n editor on the request it was built with, and honors any value a person wrote down explicitly.

**Evidence that the editor never stores the default.**
- n8n saves node parameters through `NodeHelpers.getNodeParameters(properties, parameters, returnDefaults = false, ...)` in `packages/frontend/editor-ui/src/app/utils/nodes/nodeTransforms.ts` (n8n-io/n8n master, commit f5ed6cc72cdc, lines 229 to 236). With `returnDefaults` false, a parameter equal to its default is dropped.
- The Limit default has been 50 since 0.1.x (tags v0.1.11 and v0.2.0).
- `test/round4.test.cjs` runs the same `getNodeParameters` call on this node's properties and asserts that a limit of 50 is not stored and a limit of 5 is.

So a stored `limit: 50` can only come from a workflow written outside the editor, such as an API call, an import or a hand-edited file. That value is an explicit choice, so it is sent.

**Considered and rejected.**
- Dropping a stored 50 (0.3.2). This silently changes an explicit value to the API default of 200.
- Dropping every stored Limit on version 1 (0.3.0). This breaks workflows saved on 0.2.0, which sent their Limit.
- A version 1.2 with a "Use API default" toggle. It would not change how existing version 1 nodes behave, and version 1.1 already sends the Limit.
