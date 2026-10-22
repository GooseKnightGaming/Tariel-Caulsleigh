# Reads Rhys's Azgaar export ("Tariel's World Full ... .json") and writes data/region_cawel.json: what the
# chapter's corner of the map needs - the cells, the rivers, the routes and the burgs within a window round
# Stanlech, the states and provinces by name, and the map's scale. Stanlech itself is not on the map
# (Rhys: "I somehow completely neglected it"): it is added here, where the Yolo River crosses the border
# between Cawel Shire and Ausserreich Province (Rhys, 22 Oct 2026).
# usage: python3 tools/extract_region.py <azgaar.json>
import json, sys
src = json.load(open(sys.argv[1]))
P = src['pack']
X0, X1, Y0, Y1 = 240, 380, 400, 560
inwin = lambda x, y: X0 <= x <= X1 and Y0 <= y <= Y1
cells = [{'i': c['i'], 'p': [round(c['p'][0], 2), round(c['p'][1], 2)], 'h': c['h'], 'biome': c['biome'], 'state': c['state'],
          'province': c['province'], 'r': c['r']} for c in P['cells'] if inwin(*c['p'])]
ids = {c['i']: c for c in P['cells']}
rivers = []
for r in P['rivers']:
    if not isinstance(r, dict) or 'cells' not in r: continue
    pts = [ids[i]['p'] for i in r['cells'] if i in ids]
    if any(inwin(*p) for p in pts):
        rivers.append({'i': r['i'], 'name': r['name'], 'type': r.get('type'), 'width': r.get('width'), 'points': [[round(a, 2), round(b, 2)] for a, b in pts]})
routes = [{'i': r['i'], 'group': r['group'], 'name': r.get('name'), 'points': [[round(p[0], 2), round(p[1], 2)] for p in r['points']]}
          for r in P['routes'] if isinstance(r, dict) and any(inwin(p[0], p[1]) for p in r.get('points', []))]
burgs = [{'name': b['name'], 'x': round(b['x'], 2), 'y': round(b['y'], 2), 'population': b.get('population'), 'state': b.get('state'),
          'province': ids[b['cell']]['province'] if b.get('cell') in ids else None, 'port': bool(b.get('port')), 'walls': bool(b.get('walls')), 'citadel': bool(b.get('citadel'))}
         for b in P['burgs'] if isinstance(b, dict) and 'x' in b and inwin(b['x'], b['y'])]
burgs.append({'name': 'Stanlech', 'x': 303.0, 'y': 478.0, 'state': 5, 'province': 22, 'added': 'Rhys, 22 Oct 2026: on the Cawel-Sźettereich river border'})
out = {
  'about': "From Rhys's Azgaar map 'Tariel's World' (seed %s); window x %d-%d, y %d-%d" % (src['info'].get('seed'), X0, X1, Y0, Y1),
  'scale': {'milesPerPixel': src['settings']['distanceScale'], 'unit': src['settings']['distanceUnit']},
  'states': {s['i']: s.get('fullName') or s['name'] for s in P['states'] if isinstance(s, dict) and s.get('name')},
  'provinces': {p['i']: p.get('fullName') or p['name'] for p in P['provinces'] if isinstance(p, dict) and p.get('name')},
  'biomes': {b['i']: b['name'] for b in P['biomes']} if isinstance(P['biomes'], list) else {i: n for i, n in enumerate(P['biomes']['name'])},
  'cells': cells, 'rivers': rivers, 'routes': routes, 'burgs': burgs,
}
json.dump(out, open('data/region_cawel.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(cells), 'cells,', len(rivers), 'rivers,', len(routes), 'routes,', len(burgs), 'burgs')
