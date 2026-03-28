import requests
import json

base_url = 'https://uvolelwvfldepogojgdl.supabase.co/rest/v1'
headers = {
    'apikey': 'sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id',
    'Authorization': 'Bearer sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id',
    'Content-Type': 'application/json'
}

# Get schools
schools = requests.get(f'{base_url}/schools?select=id,school_name', headers=headers).json()
try:
    print("Schools:", json.dumps(schools, indent=2))
except:
    print("Schools:", schools)

for s in schools:
    sname = s.get('school_name', '')
    if 'smta' in sname.lower() or 'smta' in sname.lower():
        print("Found SMTA:", s)
        sid = s['id']
        bks = requests.get(f'{base_url}/Stationery Details?school_id=eq.{sid}&select=id,"Book Name",Class', headers=headers).json()
        print("Books found:", len(bks))
        print("Books limit 5:", json.dumps(bks[:5], indent=2))
        inv = requests.get(f'{base_url}/inventory_items?school_id=eq.{sid}&select=id,item_name', headers=headers).json()
        print("Inventory found:", len(inv))
