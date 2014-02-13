#!/usr/bin/python
from sys import argv
from re import findall
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
	return findall(r"Auth=(.*)", str(urlopen(req).read(), "utf8"))[0]
def download(gid):
	return urlopen(Request("https://docs.google.com/spreadsheets/d/1dfKGdHqqLAAHdnw2mKBwaYwDIFODjQIjlg8ZPyRFVmA/export?format=csv&id=1dfKGdHqqLAAHdnw2mKBwaYwDIFODjQIjlg8ZPyRFVmA&gid="+gid, headers={
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
for db, gid in (("pillar", "0"), ("weapon", "1863409466"), ("shield", "457582620"), ("permanent", "420516648"), ("spell", "1605384839"), ("creature", "1045918250"), ("active", "657211460")):
	if len(argv) == 1 or any(a.startswith(db) for a in argv):
		print(db)
		open(db+".csv", "wb").write(download(gid).read())