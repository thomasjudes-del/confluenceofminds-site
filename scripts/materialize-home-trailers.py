import hashlib,json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parent.parent
out=root/'assets/trailer-fallbacks';out.mkdir(parents=True,exist_ok=True)
for row in json.loads((root/'data/home-trailer-fallbacks.json').read_text()):
    if len(sys.argv)>1 and row['id'] not in sys.argv[1:]: continue
    target=out/(row['id']+'.mp4')
    if not target.exists():
        subprocess.run(['curl','--fail','--location','--retry','2','--max-time','120',row['url'],'--output',str(target)],check=True)
    assert target.stat().st_size==row['bytes'],row['id']+' size mismatch'
    assert hashlib.sha256(target.read_bytes()).hexdigest()==row['sha256'],row['id']+' hash mismatch'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(row.get('poster_second',5)),'-i',str(target),'-frames:v','1','-vf','scale=960:-2','-q:v','3',str(out/(row['id']+'.jpg'))],check=True)
print('Verified exact trailer copies and extracted authentic posters')
