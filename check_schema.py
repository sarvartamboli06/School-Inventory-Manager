import urllib.request
import json

url = 'https://uvolelwvfldepogojgdl.supabase.co/rest/v1/?apikey=sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id'
try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        invoices = data['definitions']['invoices']['properties']
        print(list(invoices.keys()))
except Exception as e:
    print("Error:", e)
