#!/usr/bin/env python3
"""Rebuild Capy_Math_Adventure.html from Capy_Math_Adventure.canvas.tsx (same process as before:
canvas tsx -> standalone tsx (static theme + createRoot) -> esbuild IIFE -> spliced into the self-contained HTML shell)."""
import subprocess, re, sys, os
B = os.path.dirname(os.path.abspath(__file__))
M = os.path.dirname(B)
src = open(os.path.join(M, "Capy_Math_Adventure.canvas.tsx")).read()
old_sa = open(os.path.join(B, "Capy_Math_Adventure.canvas.prebatch.standalone.tsx")).read()
header = old_sa.split("function useGrokTheme(): GrokTheme {")[0] + "function useGrokTheme(): GrokTheme {\n  return THEME;\n}\n"
lines = src.split("\n")
assert lines[0].startswith('import { useState') and lines[1].startswith('import type')
body = "\n".join(lines[2:])
sa = header + body + '\n\nconst rootEl = document.getElementById("root");\nif (rootEl) {\n  createRoot(rootEl).render(<App />);\n}\n'
open(os.path.join(B, "Capy_Math_Adventure.standalone.tsx"), "w").write(sa)
subprocess.run([os.path.join(B, "node_modules/.bin/esbuild"), "Capy_Math_Adventure.standalone.tsx", "--bundle", "--format=iife",
                "--minify", "--target=es2017", "--alias:react=./react-shim.js", "--alias:react-dom/client=./react-dom-client-shim.js",
                "--outfile=app.iife.js"], cwd=B, check=True)
js = open(os.path.join(B, "app.iife.js")).read()
shell = open(os.path.join(B, "Capy_Math_Adventure.prebatch.html")).read()
idx = shell.rfind("<script>")
end = shell.rfind("</script>")
html = shell[: idx + len("<script>")] + "\n" + js + "\n  " + shell[end:]
# Nov 18 batch 2: new title + embedded Andika Bold (SIL OFL 1.1, basic Latin subset) for Word Pond's kid-friendly letters
html = html.replace("<title>Capy Math Adventure</title>", "<title>Capy's Learning Adventure</title>", 1)
import base64
font_b64 = base64.b64encode(open(os.path.join(B, "andika-bold-latin.woff"), "rb").read()).decode()
font_css = ("    @font-face { font-family: 'Andika'; font-weight: 700; font-style: normal; font-display: swap;\n"
            "      src: url(data:font/woff;base64," + font_b64 + ") format('woff'); }\n")
html = html.replace("  <style>\n", "  <style>\n" + font_css, 1)
assert "Capy's Learning Adventure</title>" in html and "font-family: 'Andika'" in html
assert "<script src" not in html
open(os.path.join(M, "Capy_Math_Adventure.html"), "w").write(html)
print("ok", len(html))
