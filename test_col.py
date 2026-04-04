import urllib.request
import json

url = 'https://uvolelwvfldepogojgdl.supabase.co/rest/v1/invoices'
headers = {
    'apikey': 'sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id',
    'Authorization': 'Bearer sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}
data = json.dumps({'payment_mode': 'Cash'}).encode('utf-8')

req = urllib.request.Request(url, data=data, headers=headers, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode())
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
