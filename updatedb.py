#!/usr/bin/python
import re
from urllib.request import Request, urlopen
from urllib.parse import urlencode
def get_auth_token():
	url = "https://www.google.com/accounts/ClientLogin"
	params = {
		"Email": email, "Passwd": password,
		"service": "wise",
		"accountType": "HOSTED_OR_GOOGLE",
		"source": "etgai"
	}
	req = Request(url, bytes(urlencode(params), "utf8"))
	return re.findall(r"Auth=(.*)", str(urlopen(req).read(), "utf8"))[0]
def download(gid):
	return urlopen(Request("https://spreadsheets.google.com/feeds/download/spreadsheets/Export?key=0Ao07Zx9C3FLcdFdXV0tpOWhKeDExNmhTdHgwVkg0NFE&exportFormat=csv&gid=%i"%gid, headers={
		"Authorization": "GoogleLogin auth=" + get_auth_token(),
		"GData-Version": "3.0"
	}))
try:
	info=open("googleinfo.txt")
	email = info.readline().strip()
	password = info.readline().strip()
except:
	from getpass import getpass
	email = input("gmail: ")
	password = getpass("Password: ")
for gid, db in enumerate(("creature", "pillar", "weapon", "shield", "permanent", "spell", "active"), 6):
	print(db)
	open(db+".csv", "wb").write(download(gid).read())