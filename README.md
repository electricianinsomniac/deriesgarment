# Deries Garment

Static website for PT Deries Garment Nusantara. Existing HTML, Bootstrap and the warm editorial theme are preserved. There is no server, database, CMS, admin account, or document registry in this repository.

## Local development

Requires Python 3.10+ for generation and checks, Node.js 18+ for JavaScript checks/tests. There are no packages to install.

```powershell
python tools/build.py --render-only
python -m unittest discover -s tests -p "test_*.py" -v
node --test tests/site.test.cjs
node --check js/site.js
node --check js/deries.js
node --check js/main.js
python tools/build.py --check
python -m http.server 8000 --bind 127.0.0.1
```

Visit `http://127.0.0.1:8000/verify/`. Stop the preview with Ctrl+C.

Optional browser QA uses `node tools/browser-check.mjs` while the built site is served on port 8000 and a separately launched Chromium browser exposes a **loopback-only** DevTools endpoint on port 9223. The helper requires Node.js 22+ for its built-in WebSocket client. Use a temporary local browser profile, close it after testing, and never expose DevTools publicly. Screenshots are written to ignored `.preview/`.

Edit `config/company.json` for public company settings; edit `templates/` for Trust Center content and shared navigation/footer. `index.html` remains the editable homepage; its marked navigation/footer/security blocks are regenerated. Run `--render-only` after changes and commit the generated HTML with its sources. Do not put private data in this repository or config.

## Production artifact (local only)

```powershell
python tools/build.py
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

The build refuses to merge into an existing `dist/`. Review the previous artifact and move it to an unused local directory before a new full build; `--render-only` does not need this. Only public page/asset paths are packaged. No deployment is automatic. Do not publish the repository root as a new hosting artifact: use `dist/` to exclude tools, configuration, tests and documentation.

## Documentation

- [Trust Center: audit, implementation, deployment and owner confirmations](docs/TRUST_CENTER.md)
- [Document verification architecture and issuance guide](docs/DOCUMENT_VERIFICATION.md)
- [Security controls and backend prerequisites](docs/SECURITY.md)

Phase 1 works independently. Phase 2 (registry, ID/hash checks, QR issuance) and Phase 3 (authenticated administration) are deferred until a secure backend, authentication and operational ownership are configured. The public document page states this explicitly.
