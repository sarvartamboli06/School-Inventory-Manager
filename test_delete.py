import urllib.request, json, ssl
url = 'https://uvolelwvfldepogojgdl.supabase.co/rest/v1/students?select=id&limit=1'
headers = {'apikey': 'sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id', 'Authorization': 'Bearer sb_publishable_tQqeObmCj2pHzs5019o-SQ_RKZbg1id'}
req = urllib.request.Request(url, headers=headers)
ctx = ssl.create_default_context()
ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
student = json.loads(urllib.request.urlopen(req, context=ctx).read())[0]

print("Deleting student " + student['id'])
del_url = f"https://uvolelwvfldepogojgdl.supabase.co/rest/v1/students?id=eq.{student['id']}"
req2 = urllib.request.Request(del_url, method='DELETE', headers=headers)
try:
    res = urllib.request.urlopen(req2, context=ctx)
    print("Delete success! Status code:", res.getcode())
except urllib.error.HTTPError as e:
    print("Failed!")
    print(e.read().decode('utf-8'))
