"""Build a genus research workbook (.xlsx) from one shared schema.

The same schema serves every genus: described species, collections, raw measurements, an automatic micro
summary, a comparison matrix, a type-sequence check and a GenBank queue. The character columns are shared by
"Described species" and "Collections" so protologue data and collection data line up column for column.

Formulas use functions that Claude Sheets and Google Sheets both support (ARRAYFORMULA, FILTER, XLOOKUP,
PERCENTILE, COUNTIFS...). Example data, if supplied, is written below the headers.

Usage: build(path, genus, described_rows=[{...}], collection_rows=[{...}])
"""
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl.utils import get_column_letter as L

# ---------------------------------------------------------------- shared character schema (agaric default)
CHARACTERS = [
    # (section, header)
    ('Macro', 'Growth habit'), ('Macro', 'Pileus size (mm)'), ('Macro', 'Pileus shape'), ('Macro', 'Pileus color'),
    ('Macro', 'Pileus surface'), ('Macro', 'Pileus margin'), ('Macro', 'Hygrophanous?'),
    ('Macro', 'Lamellae attachment'), ('Macro', 'Lamellae spacing'), ('Macro', 'Lamellae breadth'), ('Macro', 'Lamellae color'),
    ('Macro', 'Lamellulae'), ('Macro', 'Lamellae edge'), ('Macro', 'Interveining / anastomosing'),
    ('Macro', 'Stipe size (mm)'), ('Macro', 'Stipe shape'), ('Macro', 'Stipe surface'), ('Macro', 'Stipe interior'),
    ('Macro', 'Stipe color'), ('Macro', 'Stipe base / bulb'), ('Macro', 'Veil / annulus / cortina'),
    ('Macro', 'Context (flesh)'), ('Macro', 'Odor'), ('Macro', 'Taste'), ('Macro', 'Spore print'),
    ('Macro', 'KOH reaction'), ('Macro', 'UV reaction'), ('Macro', 'Other chemical reactions'),
    ('Micro', 'Spore size (L × W µm)'), ('Micro', 'Spore Q'), ('Micro', 'Spore shape'), ('Micro', 'Spore ornamentation'),
    ('Micro', 'Spore wall'), ('Micro', 'Germ pore'), ('Micro', 'Guttulate?'), ('Micro', 'Spore color (in KOH)'),
    ('Micro', "Amyloid / dextrinoid (Melzer's)"), ('Micro', 'Basidia size (µm)'), ('Micro', 'Sterigmata per basidium'),
    ('Micro', 'Cheilocystidia'), ('Micro', 'Cheilocystidia size (µm)'), ('Micro', 'Pleurocystidia'),
    ('Micro', 'Pleurocystidia size (µm)'), ('Micro', 'Caulocystidia'), ('Micro', 'Pileipellis'), ('Micro', 'Clamp connections'),
]
STRUCTURES = ['Basidiospores', 'Basidia', 'Cheilocystidia', 'Pleurocystidia', 'Caulocystidia', 'Pileipellis', 'Hyphae', 'Other']
SUMMARY_ROWS = 300   # rows of per-collection × structure statistics kept ready

def header_row(ws, cols, row=1):
    for i, (sec, h) in enumerate(cols, 1):
        c = ws.cell(row, i, h)
        c.font = Font(bold=True, italic=h.endswith('(auto)'))
        c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.freeze_panes = ws.cell(row + 1, 1)

def cols_index(cols):
    return {h: i + 1 for i, (_, h) in enumerate(cols)}

# ---------------------------------------------------------------- tab definitions
def described_cols():
    return [('Identity', 'Genus'), ('Identity', 'Species epithet'), ('Identity', 'Full name (auto)'), ('Identity', 'Authority'),
            ('Identity', 'Year'), ('Identity', 'Publication (protologue)'), ('Identity', 'Status'), ('Identity', 'Current name (if not accepted)'),
            ('Identity', 'Basionym'), ('Identity', 'Section / subgenus'), ('Identity', 'Relevant to project?'), ('Identity', 'Name record link'),
            ('Type', 'Type specimen (herbarium, number)'), ('Type', 'Type collection date'), ('Type', 'Continent'), ('Type', 'Country'),
            ('Type', 'State / province'), ('Type', 'County'), ('Type', 'Locality'), ('Type', 'Substrate'), ('Type', 'Host / associated species'),
            ('Type', 'Habitat'),
            ('Type sequences', 'Type ITS GenBank #'), ('Type sequences', 'ITS coverage'), ('Type sequences', 'Type ITS sequence'),
            ('Type sequences', 'ITS length (auto)'), ('Type sequences', 'Type LSU GenBank #'), ('Type sequences', 'Type LSU sequence'),
            ('Type sequences', 'Other loci'), ('Type sequences', 'FASTA (auto)'),
            ] + CHARACTERS + [('Notes', 'Notes')]

def collection_cols():
    return [('Identity', 'Collection ID (iNat #)'), ('Identity', 'Provisional / working name'), ('Identity', 'Current determination'),
            ('Identity', 'Collector'), ('Identity', 'Working on it'), ('Identity', 'Project / foray'), ('Identity', 'Date collected'),
            ('Identity', 'Voucher / herbarium catalog #'), ('Identity', 'iNat link (auto)'),
            ('Sequences', 'Sequencing technology'), ('Sequences', 'GenBank ITS #'), ('Sequences', 'GenBank status'),
            ('Sequences', 'ITS sequence'), ('Sequences', 'ITS length (auto)'), ('Sequences', 'Other loci (GenBank #)'), ('Sequences', 'FASTA (auto)'),
            ('Locality', 'Country'), ('Locality', 'State / province'), ('Locality', 'County'), ('Locality', 'Locality'),
            ('Locality', 'Latitude'), ('Locality', 'Longitude'), ('Locality', 'Location precision (m)'),
            ('Field ecology', 'Substrate'), ('Field ecology', 'Host / associated species'), ('Field ecology', 'Habitat'),
            ('Site data', 'Vegetation type (auto)'), ('Site data', 'Elevation, m (auto)'), ('Site data', 'Soil (auto)'),
            ('Site data', 'Trees nearby (auto)'), ('Site data', 'Rain 14 d before (auto)'),
            ('Micro progress', 'Spores measured (auto)'), ('Micro progress', 'Basidia measured (auto)'), ('Micro progress', 'Cheilocystidia measured (auto)'),
            ('Micro progress', 'Pleurocystidia measured (auto)'), ('Micro progress', 'Caulocystidia measured (auto)'),
            ('Micro progress', 'Spore size from Measurements (auto)'),
            ] + CHARACTERS + [('Notes', 'Notes')]

def site_cols():
    # What the MycoView Ecology Profile exports ("Copy rows for the genus workbook"); Collections looks these up by ID.
    return [('Key', 'Collection ID (iNat #)'), ('Site', 'Vegetation type (LANDFIRE)'), ('Site', 'Elevation (m)'), ('Site', 'Soil'),
            ('Site', 'Trees nearby (iNat)'), ('Weather', 'Rain 14 d before (mm)'), ('Weather', 'Rain 14 d, % of normal'),
            ('Weather', 'Days since ≥5 mm rain'), ('Weather', 'Mean high, prior week (°C)'), ('Weather', 'Mean low, prior week (°C)'),
            ('Notes', 'Site report'), ('Notes', 'Retrieved')]

def measurement_cols():
    return [('Input', 'Collection ID (iNat #)'), ('Input', 'Structure'), ('Input', 'Length (µm)'), ('Input', 'Width (µm)'),
            ('Input', 'Mount / medium'), ('Input', 'Measured by'), ('Input', 'Date measured'), ('Input', 'Tool / source'), ('Input', 'Notes'),
            ('Auto', 'Q (auto)'), ('Auto', 'Working name (auto)')]

def summary_cols():
    return [('Key', 'Collection ID'), ('Key', 'Structure'), ('Key', 'Working name'), ('Stats', 'n'),
            ('Stats', 'L min'), ('Stats', 'L 5th pct'), ('Stats', 'L mean'), ('Stats', 'L 95th pct'), ('Stats', 'L max'),
            ('Stats', 'W min'), ('Stats', 'W 5th pct'), ('Stats', 'W mean'), ('Stats', 'W 95th pct'), ('Stats', 'W max'),
            ('Stats', 'Q mean'), ('Stats', 'Q range'), ('Stats', 'As written for a description'), ('Key', 'Lookup key')]

def comparison_cols():
    return [('Taxon', 'Taxon'), ('Taxon', 'Group'), ('Taxon', 'Source'),
            ('Auto', 'Collections (auto)'), ('Auto', 'Spores measured (auto)'), ('Auto', 'Spore size from Measurements (auto)'),
            ('Spores', 'Spore size (L × W µm)'), ('Spores', 'Spore Q'), ('Spores', 'Spore shape / ornamentation'),
            ('Diagnostics', 'Pileus size (mm)'), ('Diagnostics', 'Pileus color'), ('Diagnostics', 'Lamellae attachment'),
            ('Diagnostics', 'Lamellae edge'), ('Diagnostics', 'Stipe'), ('Diagnostics', 'Veil / annulus / cortina'),
            ('Diagnostics', 'Cheilocystidia'), ('Diagnostics', 'Pleurocystidia'), ('Diagnostics', 'Other key character'),
            ('Ecology', 'Substrate / host'), ('Ecology', 'Habitat'), ('Ecology', 'Geography'), ('Ecology', 'Season'),
            ('Notes', 'Notes')]

def typecheck_cols():
    return [('Name', 'Similarity group'), ('Name', 'Name'), ('Name', 'Authority & year'), ('Name', 'Publication'),
            ('Name', 'Type locality'), ('Sequence', 'Type GenBank #'), ('Sequence', 'ITS coverage'),
            ('Sequence', 'Similarity within group'), ('Sequence', 'Clusters with (accessions)'),
            ('Evidence', 'Protologue spore size'), ('Evidence', 'Claimed differences'), ('Evidence', 'Comparison with related species'),
            ('Evidence', 'Modern collections that match'), ('Evidence', 'Links'),
            ('Verdict', 'Conclusion'), ('Verdict', 'Thoughts / next step')]

# ---------------------------------------------------------------- build
def build(path, genus, described_rows=(), collection_rows=(), project=None):
    project = project or {}
    wb = openpyxl.Workbook()
    st = wb.active; st.title = 'Start here'

    D, C, M, S, X, T = described_cols(), collection_cols(), measurement_cols(), summary_cols(), comparison_cols(), typecheck_cols()
    Di, Ci, Mi, Si = cols_index(D), cols_index(C), cols_index(M), cols_index(S)
    col = lambda idx, h: L(idx[h])

    # ---------------- Described species
    ws = wb.create_sheet('Described species'); header_row(ws, D)
    for r, row in enumerate(described_rows, 2):
        for h, v in row.items():
            if v not in (None, ''): ws.cell(r, Di[h], v)
    g, sp, its, acc = col(Di, 'Genus'), col(Di, 'Species epithet'), col(Di, 'Type ITS sequence'), col(Di, 'Type ITS GenBank #')
    ws.cell(2, Di['Full name (auto)'], f'=ARRAYFORMULA(IF({sp}2:{sp}="","",TRIM({g}2:{g}&" "&{sp}2:{sp})))')
    ws.cell(2, Di['ITS length (auto)'], f'=ARRAYFORMULA(IF({its}2:{its}="","",LEN(REGEXREPLACE({its}2:{its},"[^A-Za-z]",""))))')
    fn = col(Di, 'Full name (auto)')
    ws.cell(2, Di['FASTA (auto)'], f'=ARRAYFORMULA(IF({its}2:{its}="","",">"&SUBSTITUTE({fn}2:{fn}," ","_")&IF({acc}2:{acc}="","","|"&{acc}2:{acc})&"|type"&CHAR(10)&REGEXREPLACE({its}2:{its},"[^A-Za-z]","")))')
    widths(ws, D, wide={'Publication (protologue)': 26, 'Habitat': 26, 'Type ITS sequence': 18, 'FASTA (auto)': 18, 'Notes': 40})

    # ---------------- Collections
    ws = wb.create_sheet('Collections'); header_row(ws, C)
    for r, row in enumerate(collection_rows, 2):
        for h, v in row.items():
            if v not in (None, ''): ws.cell(r, Ci[h], v)
    cid, cits, cname, cacc = col(Ci, 'Collection ID (iNat #)'), col(Ci, 'ITS sequence'), col(Ci, 'Provisional / working name'), col(Ci, 'GenBank ITS #')
    ws.cell(2, Ci['iNat link (auto)'], f'=ARRAYFORMULA(IF(ISNUMBER({cid}2:{cid}),"https://www.inaturalist.org/observations/"&{cid}2:{cid},""))')
    ws.cell(2, Ci['ITS length (auto)'], f'=ARRAYFORMULA(IF({cits}2:{cits}="","",LEN(REGEXREPLACE({cits}2:{cits},"[^A-Za-z]",""))))')
    ws.cell(2, Ci['FASTA (auto)'], f'=ARRAYFORMULA(IF({cits}2:{cits}="","",">"&SUBSTITUTE(IF({cname}2:{cname}="","{genus}_sp",{cname}2:{cname})," ","_")&"|iNat"&{cid}2:{cid}&IF({cacc}2:{cacc}="","","|"&{cacc}2:{cacc})&CHAR(10)&REGEXREPLACE({cits}2:{cits},"[^A-Za-z]","")))')
    mA, mB = "Measurements!$A:$A", "Measurements!$B:$B"
    for h, struct in [('Spores measured (auto)', 'Basidiospores'), ('Basidia measured (auto)', 'Basidia'), ('Cheilocystidia measured (auto)', 'Cheilocystidia'),
                      ('Pleurocystidia measured (auto)', 'Pleurocystidia'), ('Caulocystidia measured (auto)', 'Caulocystidia')]:
        ws.cell(2, Ci[h], f'=ARRAYFORMULA(IF({cid}2:{cid}="","",COUNTIFS({mA},{cid}2:{cid},{mB},"{struct}")))')
    sk, sw = f"'Micro summary'!${col(Si,'Lookup key')}:${col(Si,'Lookup key')}", f"'Micro summary'!${col(Si,'As written for a description')}:${col(Si,'As written for a description')}"
    ws.cell(2, Ci['Spore size from Measurements (auto)'], f'=ARRAYFORMULA(IF({cid}2:{cid}="","",IFERROR(XLOOKUP({cid}2:{cid}&"|Basidiospores",{sk},{sw},""),"")))')
    SDi = cols_index(site_cols())
    k = f'{cid}2:{cid}'; look = lambda h: f"XLOOKUP({k},'Site data'!$A:$A,'Site data'!${col(SDi,h)}:${col(SDi,h)},\"\")"
    for h, sh in [('Vegetation type (auto)', 'Vegetation type (LANDFIRE)'), ('Elevation, m (auto)', 'Elevation (m)'), ('Soil (auto)', 'Soil'), ('Trees nearby (auto)', 'Trees nearby (iNat)')]:
        ws.cell(2, Ci[h], f'=ARRAYFORMULA(IF({k}="","",IFERROR({look(sh)},"")))')
    mm, pc = look('Rain 14 d before (mm)'), look('Rain 14 d, % of normal')
    ws.cell(2, Ci['Rain 14 d before (auto)'], f'=ARRAYFORMULA(IF({k}="","",IFERROR(IF({mm}="","",{mm}&" mm"&IF({pc}="",""," ("&{pc}&"% of normal)")),"")))')
    widths(ws, C, wide={'Provisional / working name': 26, 'ITS sequence': 18, 'FASTA (auto)': 18, 'Habitat': 26, 'Substrate': 24, 'Notes': 40,
                        'iNat link (auto)': 20, 'Spore size from Measurements (auto)': 34})

    # ---------------- Site data (pasted from the Ecology Profile)
    ws = wb.create_sheet('Site data'); header_row(ws, site_cols()); ws.freeze_panes = 'B2'
    for r, row in enumerate(project.get('site_rows', []), 2):
        for h, v in row.items(): ws.cell(r, SDi[h], v)
    widths(ws, site_cols(), wide={'Vegetation type (LANDFIRE)': 34, 'Soil': 30, 'Trees nearby (iNat)': 34, 'Site report': 50, 'Retrieved': 24})

    # ---------------- Measurements (one row per structure measured)
    ws = wb.create_sheet('Measurements'); header_row(ws, M)
    mL, mW, mid = col(Mi, 'Length (µm)'), col(Mi, 'Width (µm)'), col(Mi, 'Collection ID (iNat #)')
    ws.cell(2, Mi['Q (auto)'], f'=ARRAYFORMULA(IF(ISNUMBER({mL}2:{mL})*ISNUMBER({mW}2:{mW}),ROUND({mL}2:{mL}/{mW}2:{mW},2),""))')
    ws.cell(2, Mi['Working name (auto)'], f"=ARRAYFORMULA(IF({mid}2:{mid}=\"\",\"\",IFERROR(XLOOKUP({mid}2:{mid},Collections!${cid}:${cid},Collections!${cname}:${cname},\"(not in Collections)\"),\"\")))")
    widths(ws, M, wide={'Notes': 30, 'Working name (auto)': 26, 'Structure': 16})

    # ---------------- Micro summary (computed)
    ws = wb.create_sheet('Micro summary'); header_row(ws, S)
    ws.cell(2, 1, f'=IFERROR(SORT(UNIQUE(FILTER(HSTACK(Measurements!{mid}2:{mid},Measurements!B2:B),Measurements!{mid}2:{mid}<>"",Measurements!B2:B<>"")),1,TRUE),"")')
    q = col(Mi, 'Q (auto)')
    cond = f'Measurements!${mid}:${mid}=$A{{r}},Measurements!$B:$B=$B{{r}}'
    for r in range(2, SUMMARY_ROWS + 2):
        c = cond.format(r=r)
        def stat(fn, colL, extra=''):
            return f'=IF($A{r}="","",IFERROR({fn}(FILTER(Measurements!${colL}:${colL},{c},ISNUMBER(Measurements!${colL}:${colL})){extra}),""))'
        f = {
            'Working name': f'=IF($A{r}="","",IFERROR(XLOOKUP($A{r},Collections!${cid}:${cid},Collections!${cname}:${cname},""),""))',
            'n': f'=IF($A{r}="","",COUNTIFS(Measurements!${mid}:${mid},$A{r},Measurements!$B:$B,$B{r},Measurements!${mL}:${mL},">0"))',
            'L min': stat('MIN', mL), 'L 5th pct': stat('PERCENTILE', mL, ',0.05'), 'L mean': stat('AVERAGE', mL),
            'L 95th pct': stat('PERCENTILE', mL, ',0.95'), 'L max': stat('MAX', mL),
            'W min': stat('MIN', mW), 'W 5th pct': stat('PERCENTILE', mW, ',0.05'), 'W mean': stat('AVERAGE', mW),
            'W 95th pct': stat('PERCENTILE', mW, ',0.95'), 'W max': stat('MAX', mW),
            'Q mean': stat('AVERAGE', q),
            'Q range': f'=IF($A{r}="","",IFERROR(TEXT(MIN(FILTER(Measurements!${q}:${q},{c},ISNUMBER(Measurements!${q}:${q}))),"0.00")&"–"&TEXT(MAX(FILTER(Measurements!${q}:${q},{c},ISNUMBER(Measurements!${q}:${q}))),"0.00"),""))',
            'Lookup key': f'=IF($A{r}="","",$A{r}&"|"&$B{r})',
        }
        E, F_, G_, H_, I_ = (col(Si, k) for k in ['L min', 'L 5th pct', 'L mean', 'L 95th pct', 'L max'])
        J_, K_, L_, M_, N_ = (col(Si, k) for k in ['W min', 'W 5th pct', 'W mean', 'W 95th pct', 'W max'])
        Q_, D_, QR = col(Si, 'Q mean'), col(Si, 'n'), col(Si, 'Q range')
        t = lambda c_: f'TEXT({c_}{r},"0.0")'
        f['As written for a description'] = (f'=IF(OR($A{r}="",{D_}{r}=0),"",IF({D_}{r}<5,{t(E)}&"–"&{t(I_)}&" × "&{t(J_)}&"–"&{t(N_)}&" µm",'
            f'"("&{t(E)}&"–)"&{t(F_)}&"–"&{t(H_)}&"(–"&{t(I_)}&") × ("&{t(J_)}&"–)"&{t(K_)}&"–"&{t(M_)}&"(–"&{t(N_)}&") µm")'
            f'&", mean "&{t(G_)}&" × "&{t(L_)}&" µm"&IF({Q_}{r}="","",", Q = "&{QR}{r}&" (mean "&TEXT({Q_}{r},"0.00")&")")&", n = "&{D_}{r})')
        for h, formula in f.items(): ws.cell(r, Si[h], formula)
    widths(ws, S, wide={'Working name': 26, 'As written for a description': 60, 'Lookup key': 22})
    for h in ['L min', 'L 5th pct', 'L mean', 'L 95th pct', 'L max', 'W min', 'W 5th pct', 'W mean', 'W 95th pct', 'W max']:
        for r in range(2, SUMMARY_ROWS + 2): ws.cell(r, Si[h]).number_format = '0.0'
    for r in range(2, SUMMARY_ROWS + 2): ws.cell(r, Si['Q mean']).number_format = '0.00'

    # ---------------- Comparison matrix
    ws = wb.create_sheet('Comparison'); header_row(ws, X)
    Xi = cols_index(X); tx = col(Xi, 'Taxon')
    ws.cell(2, Xi['Collections (auto)'], f'=ARRAYFORMULA(IF({tx}2:{tx}="","",COUNTIF(Collections!${cname}:${cname},{tx}2:{tx})))')
    ws.cell(2, Xi['Spores measured (auto)'], f"=ARRAYFORMULA(IF({tx}2:{tx}=\"\",\"\",COUNTIFS(Measurements!${col(Mi,'Working name (auto)')}:${col(Mi,'Working name (auto)')},{tx}2:{tx},Measurements!$B:$B,\"Basidiospores\")))")
    for r, row in enumerate(project.get('comparison_rows', []), 2):
        for h, v in row.items(): ws.cell(r, Xi[h], v)
    # Spore size across all collections of a taxon: percentile ranges per row (not an array formula)
    wn = col(Mi, 'Working name (auto)')
    for r in range(2, 152):
        c = f'Measurements!${wn}:${wn}=${tx}{r},Measurements!$B:$B="Basidiospores"'
        P = lambda colL, p: f'PERCENTILE(FILTER(Measurements!${colL}:${colL},{c},ISNUMBER(Measurements!${colL}:${colL})),{p})'
        ws.cell(r, Xi['Spore size from Measurements (auto)'],
                f'=IF(${tx}{r}="","",IFERROR(TEXT({P(mL,0.05)},"0.0")&"–"&TEXT({P(mL,0.95)},"0.0")&" × "&TEXT({P(mW,0.05)},"0.0")&"–"&TEXT({P(mW,0.95)},"0.0")&" µm (5th–95th pct)",""))')
    widths(ws, X, wide={'Taxon': 30, 'Spore size from Measurements (auto)': 34, 'Notes': 40, 'Other key character': 24})

    # ---------------- Type sequence check
    ws = wb.create_sheet('Type sequence check'); header_row(ws, T)
    widths(ws, T, wide={'Name': 26, 'Claimed differences': 34, 'Comparison with related species': 34, 'Modern collections that match': 30,
                        'Thoughts / next step': 40, 'Publication': 24, 'Clusters with (accessions)': 26})

    # ---------------- GenBank queue (computed)
    ws = wb.create_sheet('GenBank queue')
    G = ['Collection ID (iNat #)', 'Provisional / working name', 'Collector', 'Date collected', 'Country', 'State / province', 'Locality',
         'Latitude', 'Longitude', 'Voucher / herbarium catalog #', 'Sequencing technology', 'ITS length (auto)', 'ITS sequence']
    header_row(ws, [('q', h) for h in G])
    ref = lambda h: f"Collections!{col(Ci,h)}2:{col(Ci,h)}"
    ws.cell(2, 1, f'=IFERROR(FILTER(HSTACK({",".join(ref(h) for h in G)}),{ref("ITS sequence")}<>"",{ref("GenBank ITS #")}=""),"Nothing waiting: every collection with an ITS sequence has a GenBank number.")')
    widths(ws, [('q', h) for h in G], wide={'Provisional / working name': 26, 'Locality': 26, 'ITS sequence': 30})

    # ---------------- Start here
    start_here(st, genus, project, Ci, Di)
    wb.save(path)

def widths(ws, cols, wide=None, default=15):
    wide = wide or {}
    for i, (_, h) in enumerate(cols, 1):
        ws.column_dimensions[L(i)].width = wide.get(h, default)

def start_here(ws, genus, project, Ci, Di):
    col = lambda idx, h: L(idx[h])
    ws.column_dimensions['A'].width = 3; ws.column_dimensions['B'].width = 34; ws.column_dimensions['C'].width = 70
    ws['B2'] = f'{genus}: genus workbook'; ws['B2'].font = Font(bold=True, size=16)
    ws['B3'] = 'One file for a genus project: what is already named, what has been collected, what has been measured, and how they compare.'
    r = 5
    ws.cell(r, 2, 'Project').font = Font(bold=True, size=12); r += 1
    for k in ['Genus', 'Family', 'Scope (region, group)', 'Lead', 'Collaborators', 'Started', 'Last updated']:
        ws.cell(r, 2, k); ws.cell(r, 3, project.get(k, genus if k == 'Genus' else None)); r += 1
    r += 1
    ws.cell(r, 2, 'Where things stand').font = Font(bold=True, size=12); r += 1
    ds, dsts, dits = "'Described species'", col(Di, 'Status'), col(Di, 'Type ITS sequence')
    cid, cits, cacc, cvou = col(Ci, 'Collection ID (iNat #)'), col(Ci, 'ITS sequence'), col(Ci, 'GenBank ITS #'), col(Ci, 'Voucher / herbarium catalog #')
    cname, csp = col(Ci, 'Provisional / working name'), col(Ci, 'Spores measured (auto)')
    stats = [
        ('Described species listed', f'=COUNTA({ds}!B2:B)'),
        ('…of them accepted', f'=COUNTIF({ds}!{dsts}2:{dsts},"Accepted")'),
        ('…with a type ITS sequence', f'=COUNTA({ds}!{dits}2:{dits})'),
        ('Collections', f'=COUNTA(Collections!{cid}2:{cid})'),
        ('Provisional / working names', f'=COUNTA(UNIQUE(FILTER(Collections!{cname}2:{cname},Collections!{cname}2:{cname}<>"")))'),
        ('Collections with an ITS sequence', f'=COUNTA(Collections!{cits}2:{cits})'),
        ('…waiting for a GenBank number', f'=COUNTIFS(Collections!{cits}2:{cits},"<>",Collections!{cacc}2:{cacc},"")'),
        ('Collections vouchered', f'=COUNTA(Collections!{cvou}2:{cvou})'),
        ('Collections with spores measured', f'=COUNTIF(Collections!{csp}2:{csp},">0")'),
        ('Measurements recorded', '=COUNT(Measurements!C2:C)'),
    ]
    for k, f in stats: ws.cell(r, 2, k); ws.cell(r, 3, f).alignment = Alignment(horizontal='left'); r += 1
    r += 1
    ws.cell(r, 2, 'The tabs').font = Font(bold=True, size=12); r += 1
    tabs = [
        ('Described species', 'Every name in the genus: authority, protologue, status, type specimen and locality, type sequences, and the protologue description in the shared character columns.'),
        ('Collections', 'One row per collection: identity, sequences, locality, field ecology, site data (looked up from the Site data tab), micro progress (counted automatically from Measurements), and the same character columns as Described species.'),
        ('Site data', 'Paste rows here from the MycoView Ecology Profile (“Copy rows for the genus workbook”). Collections picks them up by Collection ID. Derived from coordinates and public datasets, not field observations.'),
        ('Measurements', 'One row per spore, basidium or cystidium measured: collection, structure, length and width. Paste rows from Piximètre or the MycoView spore tool. Q is calculated.'),
        ('Micro summary', 'Calculated, do not type here. Every collection × structure with n, min, 5th–95th percentiles, mean and max, and the range written the way descriptions give it.'),
        ('Comparison', 'One row per taxon (described, provisional, outgroup) with the key diagnostic characters side by side. Spore ranges from Measurements fill in automatically for working names.'),
        ('Type sequence check', 'For checking whether names hold up: groups of types with identical or near-identical sequences, claimed differences, what modern collections cluster with, and a verdict.'),
        ('GenBank queue', 'Calculated. Collections that have an ITS sequence but no GenBank number yet, with the fields a submission needs.'),
    ]
    for k, v in tabs:
        ws.cell(r, 2, k).font = Font(bold=True); c = ws.cell(r, 3, v); c.alignment = Alignment(wrap_text=True, vertical='top'); r += 1
    r += 1
    ws.cell(r, 2, 'Conventions').font = Font(bold=True, size=12); r += 1
    conv = [
        ('Columns marked (auto)', 'Hold formulas. Type in the other columns; these fill themselves for every row.'),
        ('Measurements', 'In µm, one structure per row. Q = length ÷ width.'),
        ('Ranges in descriptions', '(min–)5th–95th percentile(–max), then the mean, Q and n. With fewer than 5 measured, min–max only.'),
        ('Site data', 'Derived from coordinates by the MycoView Ecology Profile; not field observations. Obscured or imprecise locations get weather only.'),
        ('Character columns', 'Shared by Described species and Collections (agaric set). Hide or rename the ones your genus does not use; add your own after them.'),
        ('Links', 'MycoBank: mycobank.org · Index Fungorum: indexfungorum.org · MycoPortal: mycoportal.org · MycoMap: mycomap.com · iNaturalist: inaturalist.org · Ecology Profile: mycoview.com/investigate/ecology-profile/'),
    ]
    for k, v in conv:
        ws.cell(r, 2, k).font = Font(bold=True); c = ws.cell(r, 3, v); c.alignment = Alignment(wrap_text=True, vertical='top'); r += 1
