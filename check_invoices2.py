import requests, json

h={'apikey':'sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id', 'Authorization':'Bearer sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id'}
sid='ca4c37ac-3766-42a1-897b-891ccf48b0c7' # SMTA ID
inv_res = requests.get(f'https://uvolelwvfldepogojgdl.supabase.co/rest/v1/invoices?school_id=eq.{sid}', headers=h)
inv = inv_res.json()

print(f"SMTA Invoices count: {len(inv)}")

if len(inv) > 0:
    first_id = inv[0]['id']
    items = requests.get(f'https://uvolelwvfldepogojgdl.supabase.co/rest/v1/invoice_items?invoice_id=eq.{first_id}', headers=h).json()
    print("Items for first invoice:")
    print(json.dumps(items, indent=2))
