"""Dependency-free static build. Only allowlisted public assets enter dist/."""
import argparse
from datetime import date
from html import escape
import json
from pathlib import Path
import re
import shutil
from string import Template
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self'; "
       "connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'")
SECURITY_META = f'<meta http-equiv="Content-Security-Policy" content="{CSP}">\n  <meta name="referrer" content="no-referrer">'


def https_url(value, hosts):
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or parsed.hostname not in hosts or parsed.username or parsed.password or parsed.port:
        raise ValueError('Contact URL must use HTTPS and an approved host')
    return value


def validate(company):
    if company['official_website'] != 'https://deriesgarment.com/':
        raise ValueError('The official production domain must remain deriesgarment.com')
    https_url(company['official_whatsapp'], {'wa.me'})
    if not re.fullmatch(r'[A-Za-z0-9._+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', company['official_email']):
        raise ValueError('Invalid official email')
    if company.get('official_instagram'):
        https_url(company['official_instagram'], {'www.instagram.com', 'instagram.com'})
    date.fromisoformat(company['information_updated_at'])
    for rep in company['representatives']:
        if rep['authorization_status'] not in ('active', 'revoked'):
            raise ValueError('Representative status must be active or revoked')
        if rep.get('is_public') and not rep.get('approved_at'):
            raise ValueError('Public representatives require explicit approval and its date')
        if rep.get('approved_at'):
            date.fromisoformat(rep['approved_at'])
        if rep.get('full_name') and not rep.get('full_name_approved'):
            raise ValueError('Full name requires separate confirmation')


def template(name, values):
    return Template((ROOT / 'templates' / name).read_text(encoding='utf-8')).substitute(values)


def representative_card(rep, company):
    """Only approved public fields; never render arbitrary contact URLs or a photograph."""
    if not rep.get('is_public') or not rep.get('approved_at'):
        return ''
    e = lambda key: escape(str(rep.get(key, '')), quote=True)
    active = rep['authorization_status'] == 'active'
    name = f'<p>{e("full_name")}</p>' if rep.get('full_name') and rep.get('full_name_approved') else ''
    contact = '<a href="#channels">Use official company channels</a>' if active else '<p>This representative is no longer authorized. Contact the company directly.</p>'
    return (f'<article class="dg-trust-card dg-representative"><h3>{e("display_name")}</h3>{name}'
            f'<p>{e("role")}<br>{escape(company["legal_name"])}</p>'
            f'<p><strong>Authorization: {"Active" if active else "Revoked"}</strong></p>{contact}</article>')


def channel(title, icon, label, url, copy_value):
    return (f'<article class="dg-trust-card"><i class="bi bi-{icon} dg-channel-icon" aria-hidden="true"></i>'
            f'<h3>{escape(title)}</h3><p>{escape(label)}</p><div class="dg-channel-actions">'
            f'<a href="{escape(url, quote=True)}" rel="noopener noreferrer">Open {escape(title)}</a>'
            f'<button type="button" class="dg-copy" data-copy="{escape(copy_value, quote=True)}" '
            f'aria-label="Copy {escape(title)} contact" hidden><i class="bi bi-clipboard" aria-hidden="true"></i> Copy</button></div></article>')


def render_pages(company):
    validate(company)
    values = {k: escape(str(v), quote=True) for k, v in company.items() if not isinstance(v, (list, dict))}
    values.update(year=str(date.today().year), security_meta=SECURITY_META,
                  updated_display=date.fromisoformat(company['information_updated_at']).strftime('%d %B %Y'),
                  verify_current='aria-current="page"',
                  instagram_footer='<li>Instagram: awaiting company confirmation</li>')
    if company.get('official_instagram'):
        values['instagram_footer'] = f'<li><a href="{values["official_instagram"]}" rel="noopener noreferrer">Official Instagram</a></li>'
    values['nib_row'] = f'<div><dt>Business identification number (NIB)</dt><dd>{values["public_nib"]}</dd></div>' if company.get('public_nib') else ''
    values['beneficiary'] = f'<p>Approved beneficiary: <strong>{values["approved_beneficiary"]}</strong></p>' if company.get('approved_beneficiary') else '<p>No bank account details are published here. Confirm the approved beneficiary directly with the company.</p>'
    cards = ''.join(representative_card(rep, company) for rep in company['representatives'])
    values['representatives'] = cards or '<div class="dg-notice"><p>The public representative list is awaiting company confirmation. Please contact the company directly to confirm a representative’s identity and authorization.</p></div>'
    values['channels'] = ''.join([
        channel('WhatsApp Business', 'whatsapp', 'Use our existing business contact link', company['official_whatsapp'], company['official_whatsapp']),
        channel('Email', 'envelope', company['official_email'], 'mailto:' + company['official_email'], company['official_email']),
        channel('Website', 'globe2', 'deriesgarment.com', company['official_website'], company['official_website']),
        channel('Instagram', 'instagram', company['official_instagram'], company['official_instagram'], company['official_instagram']) if company.get('official_instagram') else '<article class="dg-trust-card"><i class="bi bi-instagram dg-channel-icon" aria-hidden="true"></i><h3>Instagram</h3><p>An official company account has not yet been confirmed for this page. Confirm any Instagram enquiry through our email or WhatsApp.</p></article>'
    ])
    values['footer'] = template('footer.html', values)
    values['navigation'] = template('navigation.html', values)
    pages = {}
    for path, source, title, description, robots in [
        ('verify/index.html', 'trust.html', 'Deries Trust Center | Official Business Verification', 'Verify the official company identity, authorized representatives, communication channels, and business documents of PT Deries Garment Nusantara.', 'index, follow'),
        ('verify/document/index.html', 'document.html', 'Verify a Deries Document | Deries Trust Center', 'Request document confirmation from Deries Garment and understand the difference between document ID lookup and exact PDF integrity verification.', 'index, follow'),
        ('404.html', 'not-found.html', 'Page unavailable | Deries Garment', 'Contact Deries Garment through its official Trust Center.', 'noindex, nofollow')
    ]:
        local = dict(values, title=title, description=description, robots=robots,
                     canonical='https://deriesgarment.com/' + path.replace('index.html', ''))
        local['content'] = template(source, local)
        pages[path] = template('page.html', local)
    home = (ROOT / 'index.html').read_text(encoding='utf-8')
    for label, content in [('NAVIGATION', template('navigation.html', dict(values, verify_current=''))), ('FOOTER', values['footer']), ('SECURITY', SECURITY_META)]:
        pattern = rf'<!-- BEGIN {label} -->.*?<!-- END {label} -->'
        home, count = re.subn(pattern, lambda _: f'<!-- BEGIN {label} -->\n{content}\n<!-- END {label} -->', home, flags=re.S)
        if count != 1:
            raise ValueError(f'Expected exactly one {label} slot in index.html')
    # Keep existing home calls to action in sync without touching editorial content.
    home = re.sub(r'https://wa\.me/[^"\s<]+', lambda _: values['official_whatsapp'], home)
    home = re.sub(r'[A-Za-z0-9._+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', lambda _: values['official_email'], home)
    pages['index.html'] = home
    return pages


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if generated pages are stale; write nothing')
    parser.add_argument('--render-only', action='store_true', help='Regenerate pages without packaging dist')
    args = parser.parse_args()
    company = json.loads((ROOT / 'config/company.json').read_text(encoding='utf-8'))
    pages = render_pages(company)
    if args.check:
        stale = [p for p, content in pages.items() if not (ROOT / p).exists() or (ROOT / p).read_text(encoding='utf-8') != content]
        if stale:
            raise SystemExit('Generated pages are stale: ' + ', '.join(stale))
        print('Generated pages are current.')
        return
    for path, content in pages.items():
        target = ROOT / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding='utf-8')
    if args.render_only:
        print('Static pages regenerated.')
        return
    # Refuse an unexpected output location; never remove user data or merge into an old artifact.
    dist = ROOT / 'dist'
    if dist.exists():
        raise SystemExit('dist already exists. Review it, then move it aside before rebuilding. Pages were regenerated.')
    dist.mkdir()
    for path in pages:
        target = dist / path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / path, target)
    for folder in ('css', 'js', 'img', 'vendor'):
        shutil.copytree(ROOT / folder, dist / folder)
    for file in ('CNAME', 'robots.txt', 'sitemap.xml'):
        shutil.copyfile(ROOT / file, dist / file)
    (dist / '.nojekyll').touch()
    print('Static production build complete: dist/ (no backend, credentials, or document registry).')


if __name__ == '__main__':
    main()
