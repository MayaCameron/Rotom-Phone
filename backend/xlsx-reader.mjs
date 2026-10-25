import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function readXlsx(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length>12*1024*1024||buffer.subarray(0,2).toString()!=='PK')throw Error('Envie um arquivo .xlsx válido de até 12 MB.');
 const bundled=path.resolve(path.dirname(process.execPath),'../../python/python.exe');
 const python=process.env.ROTOM_PYTHON||(existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
 return new Promise((resolve,reject)=>{
  const child=spawn(python,[fileURLToPath(new URL('./read-xlsx.py',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','ignore']});let output='',done=false;
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);};
  const timer=setTimeout(()=>{child.kill();finish(Error('A leitura excedeu o tempo limite.'));},20000);
  child.on('error',()=>finish(Error('Leitor Excel indisponível. Configure ROTOM_PYTHON com o Python local.')));
  child.stdin.on('error',()=>{});child.stdout.on('data',chunk=>{output+=chunk;if(output.length>30*1024*1024){child.kill();finish(Error('Planilha muito grande.'));}});
  child.on('close',code=>{try{const result=JSON.parse(output);if(code||result.error)finish(Error(result.error||'Falha na leitura do Excel.'));else finish(null,result);}catch{finish(Error('Arquivo Excel inválido.'));}});child.stdin.end(buffer);
 });
}
