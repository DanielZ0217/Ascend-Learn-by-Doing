# Browser workers

`sandbox.html` runs student JavaScript inside an opaque-origin sandboxed iframe and a disposable Worker. The parent page supplies bounded checks and validates the returned result.

`monaco-editor.worker.js` and `monaco-ts.worker.js` are local worker bundles generated from the installed MIT-licensed `monaco-editor` package. They avoid Monaco's automatic worker URL resolution, which fails under the current Next.js/Turbopack build.

To regenerate them from `web/` after updating Monaco:

```powershell
node_modules/.bin/rolldown.cmd node_modules/monaco-editor/esm/vs/editor/editor.worker.js -o public/runner/monaco-editor.worker.js -f iife -n MonacoEditorWorker -p browser -m
node_modules/.bin/rolldown.cmd node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js -o public/runner/monaco-ts.worker.js -f iife -n MonacoTypeScriptWorker -p browser -m
```

The `rolldown` binary is currently installed through the existing Vitest/Vite development dependency. Re-run `node tests/runner/browser-smoke.mjs` after regenerating the worker files.
