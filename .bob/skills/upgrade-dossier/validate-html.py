from html.parser import HTMLParser

class Validator(HTMLParser):
    def __init__(self):
        super().__init__()
        self.errors = []
        self.stack = []
        self.void = set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'])
    def handle_starttag(self, tag, attrs):
        if tag not in self.void:
            self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in self.void:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            top = self.stack[-1] if self.stack else 'empty'
            self.errors.append('Unexpected close tag: </' + tag + '>, stack top: ' + top)

with open('.bob/skills/upgrade-dossier/examples/sample-run/dossier.html', encoding='utf-8') as f:
    content = f.read()

v = Validator()
v.feed(content)
if v.errors:
    for e in v.errors:
        print('ERROR: ' + e)
elif v.stack:
    print('Unclosed tags: ' + str(v.stack))
else:
    print('HTML valid. Size: ' + str(len(content)) + ' bytes')
    import re
    ext = re.findall(r'(?:src|href)=["\'](' + r'https?://[^"\']+' + r')', content)
    osv_links = [u for u in ext if 'osv.dev' in u]
    other = [u for u in ext if 'osv.dev' not in u]
    print('External links (osv.dev): ' + str(len(osv_links)))
    if other:
        print('WARNING non-osv external links: ' + str(other))
    else:
        print('No external resource loads. Self-contained: OK')
