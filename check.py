import urllib.request, json, ssl
url = 'https://uvolelwvfldepogojgdl.supabase.co/rest/v1/invoice_items?select=*&order=created_at.desc&limit=10'
headers = {'apikey': 'sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id'}
req = urllib.request.Request(url, headers=headers)
ctx = ssl.create_default_context()
ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
items = json.loads(urllib.request.urlopen(req, context=ctx).read())
for i in items:
    print(f"{i['invoice_id']} | {i['product_type']} | {i['product_id']} | {i['quantity']}")
