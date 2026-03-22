import urllib.request, json, ssl
url = 'https://uvolelwvfldepogojgdl.supabase.co/rest/v1/inventory_items?select=id&limit=1'
headers = {'apikey': 'sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id', 'Authorization': 'Bearer sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id'}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

try:
    items = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=headers), context=ctx).read())
    if not items:
        print("No inventory items found!")
    else:
        item_id = items[0]['id']
        print(f"Attempting to delete {item_id}")
        del_url = f"https://uvolelwvfldepogojgdl.supabase.co/rest/v1/inventory_items?id=eq.{item_id}"
        req2 = urllib.request.Request(del_url, method='DELETE', headers=headers)
        res = urllib.request.urlopen(req2, context=ctx)
        print("Delete success! Status code:", res.getcode())
except urllib.error.HTTPError as e:
    print("Delete failed!")
    print(e.read().decode('utf-8'))
except Exception as e:
    print("Error:", str(e))
