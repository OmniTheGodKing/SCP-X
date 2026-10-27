// Turns the built dist/index.html into a page fragment for publishing: the host adds its
// own <html>/<head>/<body>, so we keep only the title, font links, styles, body and script.
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const pick = re => [...html.matchAll(re)].map(m => m[0]).join("\n");
const title = pick(/<title>[\s\S]*?<\/title>/g);
const metas = pick(/<meta name="claude:[^>]*>/g);
const links = pick(/<link [^>]*fonts\.(googleapis|gstatic)[^>]*>/g);
const styles = pick(/<style[\s\S]*?<\/style>/g);
const scripts = pick(/<script[\s\S]*?<\/script>/g);
const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/) || [, ""])[1].replace(/<script[\s\S]*?<\/script>/g, "");
writeFileSync("dist/artifact.html", [title, metas, links, styles, body.trim(), scripts].join("\n"));
console.log("wrote dist/artifact.html");
