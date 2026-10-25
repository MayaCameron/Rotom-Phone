"""Bounded, values-only XLSX reader. No macros, formulas or external links execute."""
import io,json,sys,zipfile,xml.etree.ElementTree as ET,posixpath,re
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def read(data):
    if len(data)>12*1024*1024: raise ValueError('Arquivo maior que 12 MB.')
    z=zipfile.ZipFile(io.BytesIO(data)); entries=z.infolist()
    if len(entries)>5000 or sum(e.file_size for e in entries)>64*1024*1024: raise ValueError('Planilha excede os limites de leitura.')
    if len({e.filename for e in entries})!=len(entries): raise ValueError('Arquivo ZIP ambíguo.')
    if any('vbaproject' in e.filename.lower() for e in entries): raise ValueError('Use .xlsx sem macros.')
    def xml(name):
        raw=z.read(name)
        if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper(): raise ValueError('XML não permitido.')
        return ET.fromstring(raw)
    shared=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        shared=[''.join(n.itertext()) for n in xml('xl/sharedStrings.xml').findall('s:si',NS)]
    relations={r.attrib['Id']:r.attrib['Target'] for r in xml('xl/_rels/workbook.xml.rels') if r.attrib.get('TargetMode')!='External'}
    result=[];total=0
    for sheet in xml('xl/workbook.xml').findall('s:sheets/s:sheet',NS):
        rid=sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        target=relations[rid]; path=posixpath.normpath(target.lstrip('/') if target.startswith('/') else 'xl/'+target)
        if not path.startswith('xl/worksheets/'): raise ValueError('Caminho de aba inválido.')
        rows=[]
        for row in xml(path).findall('s:sheetData/s:row',NS):
            ri=int(row.attrib['r'])
            if ri>10002: raise ValueError('Limite de 10000 registros por aba excedido.')
            values=[]
            for c in row.findall('s:c',NS):
                addr=c.attrib.get('r','');m=re.fullmatch(r'([A-Z]+)([0-9]+)',addr)
                if not m: raise ValueError('Endereço de célula inválido.')
                col=0
                for char in m[1]: col=col*26+ord(char)-64
                if col>64: raise ValueError('Limite de 64 colunas por aba excedido.')
                total+=1
                if total>500000: raise ValueError('Planilha contém células demais.')
                while len(values)<col: values.append('')
                v=c.find('s:v',NS); value=v.text if v is not None and v.text else '';typ=c.attrib.get('t')
                if c.find('s:f',NS) is not None or typ=='e': value={'error':'formula-or-error'}
                elif typ=='s': value=shared[int(value)]
                elif typ=='inlineStr': value=''.join(c.find('s:is',NS).itertext()) if c.find('s:is',NS) is not None else ''
                elif typ=='b': value=bool(int(value))
                elif value and typ not in ('str',):
                    n=float(value);value=int(n) if n.is_integer() else n
                values[col-1]=value
            while values and values[-1]=='': values.pop()
            if values:
                while len(rows)<ri: rows.append([])
                rows[ri-1]=values
        result.append({'name':sheet.attrib['name'],'rows':rows})
    return result
try: print(json.dumps(read(sys.stdin.buffer.read(12*1024*1024+1)),ensure_ascii=True,allow_nan=False))
except Exception as error:
    print(json.dumps({'error':str(error) if isinstance(error,ValueError) else 'Arquivo .xlsx inválido ou corrompido.'}));sys.exit(1)
