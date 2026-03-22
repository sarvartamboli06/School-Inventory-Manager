import urllib.request
import json

url1 = "https://uvolelwvfldepogojgdl.supabase.co/rest/v1/Stationery%20Details?select=*&limit=1"
url2 = "https://uvolelwvfldepogojgdl.supabase.co/rest/v1/stationery_details?select=*&limit=1"
headers = {
    "apikey": "sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id",
    "Authorization": "Bearer sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id"
}

for url in [url1, url2]:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"URL: {url}")
            print("DATA:", json.dumps(data, indent=2))
    except Exception as e:
        pass
