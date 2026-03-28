import urllib.request, json, ssl

key = 'sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id'
headers = {'apikey': key, 'Authorization': 'Bearer ' + key}
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_table(table_name):
    # Fix URL encoding for spaces
    url_table = table_name.replace(' ', '%20')
    url = f"https://uvolelwvfldepogojgdl.supabase.co/rest/v1/{url_table}?select=*"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"--- TABLE: {table_name} ({len(result)} rows) ---")
            for r in result[:3]:
                print(r)
    except Exception as e:
        print(f"ERROR Fetching {table_name}: {e}")

fetch_table('schools')
fetch_table('books')
fetch_table('Stationery Details')
fetch_table('inventory_items')
