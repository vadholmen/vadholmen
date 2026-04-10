# Hemskt hack för att generera anmälningssidor.

# Logga in på vadholmens konto på myclub.se, och navigera:
# * Första flikraden: Medlem
# * Andra flikraden: Medlemmar
# * Tredje flikraden: Formulär

# Spara sidan som html, och kör:
# ```
# python chtulhu <filnamn.html>
# ```
# från roten på vadholmen-repot. Detta ska uppdatera alla
# anmalan-*.md-filer.

import sys
from pathlib import Path
import re

[path] = sys.argv[1:]
input = Path(path).read_text().replace('\n', ' ')

[table] = re.findall('<tbody>.*?</tbody>', input)
rows = re.findall('<tr>.*?</tr>', table)
exceptions = []
pages = {}
for row in rows:
    cols = re.findall('<td>.*?</td>', row)
    [title, _, _, _, form] = cols
    title = title[4:-5]
    url_suffix = re.search('href="(.*?)"', form).group(1)
    url = 'https://member.myclub.se' + url_suffix
    if ',' in title:
        (group, page) = title.split(' - ')
        if 'Syskon' in page:
            group = 'syskon'
        elif 'VUXEN' in group:
            group = 'vuxen'
        elif 'Märkestagning' in group:
            group = 'markestagning'
        else:
            assert 'Simskola' in group, title
            group = 'simskola'
        page = '-'.join('v' + v for v in re.findall('2[6-8]', page))
        page = pages.setdefault(page, {})
        assert group not in page, title
        page[group] = url
    else:
        exceptions.append((title, url))

# stödmedlem, sponsor
assert len(exceptions) == 2, exceptions
for (page, groups) in pages.items():
    assert len(groups) == 4
    Path(f'anmalan-{page}.md').write_text(f'''\
<div style="text-align: center;" markdown=1>
# Anmälan {page.replace('-', '+')}

<br/>

[Simskola]({groups['simskola']})

<br/>

[Syskongrupp]({groups['syskon']})

<br/>

[Märkestagning]({groups['markestagning']})

<br/>

[Märkestagning Vuxen]("{groups['vuxen']})
</div>
''')

print('Glöm inte att även uppdatera:', exceptions)
