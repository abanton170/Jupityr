const esbuild = require("esbuild");
const path = require("path");

const isWatch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: [path.join(__dirname, "src/index.tsx")],
  bundle: true,
  minify: !isWatch,
  format: "iife",
  target: ["es2018"],
  outfile: path.join(__dirname, "../public/widget.js"),
  jsx: "automatic",
  jsxImportSource: "preact",
  define: {
    "process.env.NODE_ENV": isWatch ? '"development"' : '"production"',
  },
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
    ".css": "text",
  },
};

if (isWatch) {
  esbuild
    .context(buildOptions)
    .then((ctx) => {
      ctx.watch();
      console.log("Watching for changes...");
    })
    .catch(() => process.exit(1));
} else {
  esbuild
    .build(buildOptions)
    .then(() => console.log("Widget built successfully"))
    .catch(() => process.exit(1));
}
