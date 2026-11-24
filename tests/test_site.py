"""Static regression/security checks using the Python standard library."""
import copy
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import unittest
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build', ROOT / 'tools/build.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.ids, self.links, self.scripts, self.metas = [], [], [], {}
        self.inline_handlers, self.h1, self.lang = [], 0, None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'html':
            self.lang = attrs.get('lang')
        if tag == 'h1':
            self.h1 += 1
        if tag == 'script':
            self.scripts.append(attrs.get('src'))
        if tag == 'meta':
            self.metas[attrs.get('name', attrs.get('http-equiv'))] = attrs.get('content')
        for key in ('href', 'src'):
            if key in attrs:
                self.links.append(attrs[key])
        self.inline_handlers.extend(k for k in attrs if k.startswith('on'))


class SiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.company = json.loads((ROOT / 'config/company.json').read_text(encoding='utf-8'))
        cls.pages = build.render_pages(cls.company)

    def test_generated_pages_current(self):
        for path, html in self.pages.items():
            self.assertEqual((ROOT / path).read_text(encoding='utf-8'), html, path)

    def test_internal_links_assets_fragments_and_structure(self):
        for path, html in self.pages.items():
            page = Page(html)
            self.assertEqual(page.h1, 1, path)
            self.assertEqual(page.lang, 'en')
            self.assertEqual(len(page.ids), len(set(page.ids)), path)
            self.assertIn('main', page.ids)
            self.assertFalse(page.inline_handlers)
            self.assertNotIn(None, page.scripts)
            for href in page.links:
                url = urlsplit(href)
                if url.scheme or url.netloc:
                    self.assertIn(url.scheme, ('https', 'mailto'), href)
                    continue
                target = ((ROOT / url.path.lstrip('/')) if url.path.startswith('/') else (ROOT / path).parent / url.path) if url.path else ROOT / path
                if target.is_dir():
                    target = target / 'index.html'
                self.assertTrue(target.exists(), f'{path} -> {href}')
                if url.fragment and target.suffix == '.html':
                    self.assertIn(unquote(url.fragment), Page(target.read_text(encoding='utf-8')).ids, href)

    def test_public_security_and_unavailable_boundary(self):
        for path, html in self.pages.items():
            page = Page(html)
            self.assertEqual(page.metas['referrer'], 'no-referrer')
            self.assertIn("script-src 'self'", page.metas['Content-Security-Policy'])
            self.assertIn("connect-src 'none'", page.metas['Content-Security-Policy'])
            self.assertNotIn('electricianinsomniac', html)
            self.assertNotIn('Muhammad Rismawan', html)
        doc = self.pages['verify/document/index.html']
        self.assertIn('No document has been verified by this page', doc)
        self.assertNotIn('<input', doc)
        self.assertNotIn('<form', doc)
        self.assertIn('noindex', Page(self.pages['404.html']).metas['robots'])
        self.assertIn('index, follow', Page(self.pages['verify/index.html']).metas['robots'])
        self.assertFalse((ROOT / 'admin').exists())
        self.assertFalse((ROOT / 'api').exists())

    def test_owner_approval_and_revocation(self):
        rep = dict(display_name='Test only', role='Business Development', authorization_status='active', is_public=True, approved_at=None)
        candidate = copy.deepcopy(self.company)
        candidate['representatives'] = [rep]
        with self.assertRaises(ValueError):
            build.render_pages(candidate)
        rep.update(approved_at='2026-01-01', full_name='Unconfirmed name')
        with self.assertRaises(ValueError):
            build.render_pages(candidate)
        rep['full_name_approved'] = True
        html = build.render_pages(candidate)['verify/index.html']
        self.assertIn('Authorization: Active', html)
        rep['authorization_status'] = 'revoked'
        self.assertIn('no longer authorized', build.render_pages(candidate)['verify/index.html'])
        rep['is_public'] = False
        self.assertNotIn('Unconfirmed name', build.render_pages(candidate)['verify/index.html'])

    def test_xss_escape_and_contact_validation(self):
        candidate = copy.deepcopy(self.company)
        candidate['payment_policy'] = '<script>alert("x")</script>'
        html = build.render_pages(candidate)['verify/index.html']
        self.assertIn('&lt;script&gt;', html)
        self.assertNotIn('<script>alert', html)
        for key, value in [('official_whatsapp', 'javascript:alert(1)'), ('official_instagram', 'https://instagram.com.evil.test/x'), ('official_whatsapp', 'https://wa.me@evil.test/x'), ('official_email', 'x@example.com?bcc=victim@example.com'), ('official_website', 'https://clone.test/')]:
            candidate = copy.deepcopy(self.company)
            candidate[key] = value
            with self.assertRaises(ValueError, msg=key):
                build.render_pages(candidate)

    def test_contact_consistency_and_copy(self):
        trust = self.pages['verify/index.html']
        for html in self.pages.values():
            self.assertIn('mailto:' + self.company['official_email'], html)
            self.assertIn(self.company['official_whatsapp'], html)
            self.assertIn('PT Deries Garment Nusantara', html)
        self.assertEqual(trust.count('data-copy='), 3)
        self.assertIn('aria-live="polite"', trust)
        self.assertIn('aria-controls="dg-nav-links"', trust)

    def test_production_artifact_excludes_sources_and_secrets(self):
        dist = ROOT / 'dist'
        if not dist.exists():
            self.skipTest('Run a production build to check its artifact')
        expected = set(self.pages) | {'CNAME', 'robots.txt', 'sitemap.xml', '.nojekyll'}
        for file in dist.rglob('*'):
            if not file.is_file():
                continue
            relative = file.relative_to(dist).as_posix()
            self.assertTrue(relative in expected or relative.split('/')[0] in ('css', 'js', 'img', 'vendor'), relative)
            self.assertNotEqual(file.suffix, '.pdf')
        for path, html in self.pages.items():
            self.assertEqual((dist / path).read_text(encoding='utf-8'), html)


if __name__ == '__main__':
    unittest.main()
