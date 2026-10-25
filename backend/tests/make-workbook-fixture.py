"""Create a disposable upload fixture from the delivered model; never touches user data."""
import zipfile,xml.etree.ElementTree as ET,sys
from pathlib import Path
ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
source,target=sys.argv[1:3]
records={
 'xl/worksheets/sheet2.xml':[
 ['species-99991','Examplemon','Exemplomon','','','Regra fictícia para revisão','','','','Normal','',50,50,50,50,50,50],
 ['species-invalid','Inválido']],
 'xl/worksheets/sheet5.xml':[['abilities-example','Example Ability','Habilidade exemplo','','','Efeito fictício de teste']]
}
def letter(i):
    s=''
    while i: i,r=divmod(i-1,26);s=chr(65+r)+s
    return s
Path(target).parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(source) as zin,zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data=zin.read(item.filename)
        if item.filename in records:
            root=ET.fromstring(data);sheet=root.find('{'+ns+'}sheetData')
            for row in list(sheet):
                if int(row.attrib['r'])>1:sheet.remove(row)
            for i,values in enumerate(records[item.filename],2):
                row=ET.SubElement(sheet,'{'+ns+'}row',{'r':str(i)})
                for col,value in enumerate(values,1):
                    if value=='':continue
                    c=ET.SubElement(row,'{'+ns+'}c',{'r':letter(col)+str(i)})
                    if isinstance(value,int):ET.SubElement(c,'{'+ns+'}v').text=str(value)
                    else:
                        c.set('t','inlineStr');ET.SubElement(ET.SubElement(c,'{'+ns+'}is'),'{'+ns+'}t').text=value
            data=ET.tostring(root,encoding='utf-8',xml_declaration=True)
        zout.writestr(item,data)
print(target)
