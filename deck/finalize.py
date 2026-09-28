import hashlib
import re
import struct
import sys
import zipfile
from pathlib import Path

from fontTools.ttLib import TTFont

FONTS = Path(__file__).parent / 'fonts'
FAMILIES = {
    'Anton': {'regular': 'Anton-Regular.ttf'},
    'Instrument Serif': {'regular': 'InstrumentSerif-Regular.ttf', 'italic': 'InstrumentSerif-Italic.ttf'},
    'JetBrains Mono': {'regular': 'JetBrainsMono-Regular.ttf', 'bold': 'JetBrainsMono-Bold.ttf'},
    'Hanken Grotesk': {'regular': 'HankenGrotesk-Regular.ttf', 'bold': 'HankenGrotesk-Bold.ttf'},
    'STIX Two Text': {'regular': 'STIXTwoText-Regular.ttf', 'italic': 'STIXTwoText-Italic.ttf'},
}
STYLE_ORDER = ('regular', 'bold', 'italic', 'boldItalic')
FONT_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font'


def eot(path):
    data = path.read_bytes()
    font = TTFont(path)
    os2, name = font['OS/2'], font['name']
    utf16 = lambda nid: (name.getDebugName(nid) or '').encode('utf-16-le')
    p = os2.panose
    panose = bytes([p.bFamilyType, p.bSerifStyle, p.bWeight, p.bProportion, p.bContrast, p.bStrokeVariation, p.bArmStyle, p.bLetterForm, p.bMidline, p.bXHeight])
    fixed = (
        struct.pack('<LLL', len(data), 0x00020001, 0)
        + panose
        + struct.pack('<BBLHH', 1, 1 if os2.fsSelection & 1 else 0, os2.usWeightClass, os2.fsType, 0x504C)
        + struct.pack('<LLLL', os2.ulUnicodeRange1, os2.ulUnicodeRange2, os2.ulUnicodeRange3, os2.ulUnicodeRange4)
        + struct.pack('<LL', os2.ulCodePageRange1, os2.ulCodePageRange2)
        + struct.pack('<L', font['head'].checkSumAdjustment)
        + struct.pack('<LLLL', 0, 0, 0, 0)
    )
    names = b''
    for nid in (1, 2, 5, 4):
        s = utf16(nid)
        names += struct.pack('<HH', 0, len(s)) + s
    names += struct.pack('<HH', 0, 0)
    header = fixed + names
    return struct.pack('<L', 4 + len(header) + len(data)) + header + data


def duplicates(zin):
    canonical, alias = {}, {}
    for item in zin.infolist():
        if not item.filename.startswith('ppt/media/'):
            continue
        digest = hashlib.sha1(zin.read(item.filename)).hexdigest()
        if digest in canonical:
            alias[item.filename] = canonical[digest]
        else:
            canonical[digest] = item.filename
    return alias


def finalize(src, dst):
    zin = zipfile.ZipFile(src)
    alias = duplicates(zin)
    rels_xml = zin.read('ppt/_rels/presentation.xml.rels').decode()
    used = {int(n) for n in re.findall(r'Id="rId(\d+)"', rels_xml)}
    next_id = max(used) + 1
    parts, rels, entries = {}, [], []
    for family, styles in FAMILIES.items():
        refs = []
        for style in STYLE_ORDER:
            if style not in styles:
                continue
            rid = f'rId{next_id}'
            next_id += 1
            target = f'fonts/font{len(parts) + 1}.fntdata'
            parts[f'ppt/{target}'] = eot(FONTS / styles[style])
            rels.append(f'<Relationship Id="{rid}" Type="{FONT_REL}" Target="{target}"/>')
            refs.append(f'<p:{style} r:id="{rid}"/>')
        entries.append(f'<p:embeddedFont><p:font typeface="{family}"/>{"".join(refs)}</p:embeddedFont>')

    pres_xml = zin.read('ppt/presentation.xml').decode()
    pres_xml = re.sub(r'<p:presentation\b', '<p:presentation embedTrueTypeFonts="1"', pres_xml, count=1)
    pres_xml, n = re.subn(r'(<p:notesSz\b[^>]*/>)', r'\1<p:embeddedFontLst>' + ''.join(entries).replace('\\', r'\\') + '</p:embeddedFontLst>', pres_xml, count=1)
    if n != 1:
        raise SystemExit('could not find <p:notesSz> in presentation.xml')
    rels_xml = rels_xml.replace('</Relationships>', ''.join(rels) + '</Relationships>')
    types = zin.read('[Content_Types].xml').decode()
    if 'Extension="fntdata"' not in types:
        types = types.replace('<Default ', '<Default Extension="fntdata" ContentType="application/x-fontdata"/><Default ', 1)

    replaced = {'ppt/presentation.xml': pres_xml, 'ppt/_rels/presentation.xml.rels': rels_xml, '[Content_Types].xml': types}
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            if item.filename in alias:
                continue
            blob = replaced.get(item.filename, zin.read(item.filename))
            if item.filename.endswith('.rels') and alias:
                text = blob if isinstance(blob, str) else blob.decode()
                for dup, keep in alias.items():
                    text = text.replace(f'../media/{dup.rsplit("/", 1)[1]}"', f'../media/{keep.rsplit("/", 1)[1]}"')
                blob = text
            zout.writestr(item, blob)
        for path, blob in parts.items():
            zout.writestr(path, blob)
    print(f'embedded {len(parts)} font files from {len(FAMILIES)} families, dropped {len(alias)} duplicate media files: {dst}')


if __name__ == '__main__':
    finalize(sys.argv[1], sys.argv[2])
