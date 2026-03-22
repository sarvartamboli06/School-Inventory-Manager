import urllib.request, json, ssl
url = 'https://uvolelwvfldepogojgdl.supabase.co/rest/v1/invoices?select=*&order=created_at.desc&limit=5'
headers = {'apikey': 'sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id'}
req = urllib.request.Request(url, headers=headers)
ctx = ssl.create_default_context()
ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
items = json.loads(urllib.request.urlopen(req, context=ctx).read())
for i in items:
    print(f"Inv: {i['id']} | Status: {i['status']} | {i['student_id']}")
