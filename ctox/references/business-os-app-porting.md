# Porting An Existing App Into Business OS

Use this workflow when the user hands you an app that already exists — a
folder built in a coding-agent session or a GitHub repository (typically
React/TypeScript in a Vite-style layout) — and wants it to live in CTOX
Business OS. This is the hand-over moment of the product: conceived in a
prompt, born with the first deploy, raised in CTOX.

The porting result is a plain-ESM Business OS module. Business OS apps have
no build step: the transcode happens exactly once, here, and the installed
app is vanilla HTML/CSS/JS. The app keeps React at runtime through vendored
ESM bundles resolved by an import map — never through a CDN.

## What the pipeline does

1. **Inventory** the source: file tree, `package.json`, entry point
   (`module`/`main` field, else `src/main.tsx` and friends).
2. **Classify dependencies.** Only the vendored runtime is portable:
   `react`, `react-dom`, `react-dom/client`, `react/jsx-runtime`.
   Anything else is reported and must be replaced in source or explicitly
   vendored by you — never guessed, never fetched from a CDN.
3. **Transcode** every `.tsx/.ts/.jsx` file to plain ESM (sucrase:
   types stripped, automatic JSX runtime), rewrite relative imports to
   explicit `.js` paths, strip CSS imports into `<link>` tags.
4. **Scaffold** the module: `module.json` (install_scope `local`),
   `index.html` with the import map and the entry script, original source
   preserved under `source/` for provenance.
5. **Install** by placing the folder in
   `<ctox-root>/runtime/business-os/local-modules/<module-id>/` —
   dropping is installing; the filesystem is the installation truth.
6. **Verify**: restart the Business OS serve, confirm the app appears,
   then run the app smoke check.

## Running the transcode from the agent

The transcode core and the vendored transcoder ship with every CTOX
install. Use them directly — do not reimplement the transform:

```sh
CTOX_APP=$(ls -d ~/.local/lib/ctox/current/src/apps/business-os 2>/dev/null \
  || echo /path/to/ctox/src/apps/business-os)

node --input-type=module - "$CTOX_APP" <<'EOF'
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const appRoot = process.argv[2];
const sucrase = await import(join(appRoot, "vendor/app-importer/sucrase.mjs"));
const core = await import(join(appRoot, "shared/app-transcode.mjs"));

const SRC = process.env.PORT_SRC;          // the app folder to port
const OUT = process.env.PORT_OUT;          // .../runtime/business-os/local-modules
const ID = process.env.PORT_ID;            // module id (lowercase, dashes)
const TITLE = process.env.PORT_TITLE ?? ID;

const files = {};
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(SRC, full);
    if (/(^|\/)(node_modules|\.git|dist|build|\.next)(\/|$)/.test(rel)) continue;
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?|mjs|css|json|html|svg|md)$/.test(name)) {
      files[rel] = readFileSync(full, "utf8");
    }
  }
})(SRC);

const result = core.transcodeApp(sucrase, files, {
  vendorBase: "../../src/apps/business-os/vendor/app-importer",
});
if (!result.ok) {
  console.error("NOT PORTABLE:", JSON.stringify(result.report, null, 2));
  process.exit(1);
}
const moduleFiles = core.scaffoldModule({ id: ID, title: TITLE }, result);
for (const [path, content] of Object.entries(moduleFiles)) {
  const target = join(OUT, ID, path);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);
}
for (const [path, content] of Object.entries(files)) {
  const target = join(OUT, ID, "source", path);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);
}
console.log("ported:", ID, "->", join(OUT, ID));
console.log(JSON.stringify(result.report, null, 2));
EOF
```

Set `PORT_SRC`, `PORT_OUT`, `PORT_ID` (and optionally `PORT_TITLE`) before
running. The `vendorBase` above assumes local-modules resolve vendor files
relative to the served app root; verify the import map URLs load once the
app is up, and adjust `vendorBase` if the instance serves from a different
prefix.

## When the report says NOT PORTABLE

Do not work around the report. Options, in order:

1. **Replace the dependency in source** (preferred): most coding-agent apps
   use utility packages that have trivial vanilla equivalents.
2. **Vendor it yourself**: build a pinned browser-ESM bundle the same way
   CTOX vendors React (see `src/scripts/build-app-importer-vendor.mjs` in
   the CTOX repo — note its three esbuild pitfalls: exact-match externals,
   CJS require shim, named-export interop), place it next to the app and
   extend the import map. Tell the user what you vendored and why.
3. **Decline with the list**: if the app is inseparable from its framework
   (server components, CSS-in-JS runtimes, bundler magic), report exactly
   which imports block the port.

Known limitations to check explicitly: asset imports (`import logo from
'./x.svg'` — replace with plain `<img>`/URL usage), CSS modules, Tailwind
(needs a prebuilt stylesheet; there is no runtime JIT), `react-router`
(portable only if you vendor it), `import.meta.env` (replace with literals).

## Verification

```sh
ls "$PORT_OUT/$PORT_ID"                      # module.json, index.html, src/, source/
# restart the Business OS serve, then:
ctox business-os app validate "$PORT_ID" --installed   # if wired for local scope
ctox business-os app smoke "$PORT_ID" --url http://127.0.0.1:8765
```

The app must appear in the launcher after the serve restart. If it does
not, check `module.json` (`entry` must be
`local-modules/<id>/index.html`) and the serve log for manifest errors.

In the Business OS UI the same pipeline is available to end users as the
**App Importer** app (folder picker or public GitHub URL); prefer sending
non-technical users there and keep this scripted path for agent work.
