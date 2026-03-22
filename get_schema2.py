import urllib.request
import json

url1 = "https://uvolelwvfldepogojgdl.supabase.co/rest/v1/Stationery%20Details?select=*&limit=1"
headers = {
    "apikey": "sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id",
    "Authorization": "Bearer sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id"
}
req = urllib.request.Request(url1, headers=headers)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    print("KEYS:", list(data[0].keys()))
