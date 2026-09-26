import json, sys, re

with open('.bob/skills/breaking-change-extractor/schema.json') as f:
    schema = json.load(f)

with open('.bob/skills/breaking-change-extractor/examples/express-4-to-5.json') as f:
    data = json.load(f)

print('Loaded', len(data), 'breaking change entries')

errors = []
ids = set()
for i, bc in enumerate(data):
    for field in ['id','title','description','detection','fix','source']:
        if field not in bc:
            errors.append(str(i) + ' missing field: ' + field)
    bc_id = bc.get('id', str(i))
    if 'id' in bc:
        if bc['id'] in ids:
            errors.append('Duplicate id: ' + bc['id'])
        ids.add(bc['id'])
        if not re.match(r'^bc-\d{3}$', bc['id']):
            errors.append('Invalid id format: ' + bc['id'])
    if 'detection' in bc:
        for f2 in ['pattern','note']:
            if f2 not in bc['detection']:
                errors.append(bc_id + ' detection missing: ' + f2)
        if 'pattern' in bc['detection']:
            try:
                re.compile(bc['detection']['pattern'])
            except re.error as e:
                errors.append(bc_id + ' invalid regex: ' + str(e))
    if 'fix' in bc:
        for f2 in ['before','after']:
            if f2 not in bc['fix']:
                errors.append(bc_id + ' fix missing: ' + f2)

if errors:
    print('ERRORS:')
    for e in errors:
        print(' ', e)
    sys.exit(1)
else:
    print('All', len(data), 'entries valid')
    print('IDs:', sorted(ids))
