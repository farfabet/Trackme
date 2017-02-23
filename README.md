# Trackme
Test project of node/mongo easy to share crypted data

First project using NodeJS or MongoDB.

The idea is to be able to create a small data reposotiry quickly and easily and to be able to share the data with a simple ID and secret key to decrypt.
Write message on an existing repository is only possible if the client has the private key to sign its messages.

Using Docker as playground.

## CallFlow

#### POST

To create a new repository, setting initial data, data can be encrypted to avoid server or anyone to access data

```
POST / HTTP/1.1
Content-Type: application/json
Content-Length: 33
Host: nginx
Connection: close
  
{"data":"7c3640a0175fe0d5cf8307"}
```
decrypted data looks like : {"data":"knock knock"}

```
HTTP/1.1 200 OK
Server: nginx/1.11.10
Date: Thu, 23 Feb 2017 09:02:48 GMT
Content-Type: application/json
Content-Length: 154
Connection: close
X-Powered-By: Express
  
{"sigkey":"dd9b16ea-6fc5-4912-8dbe-18ba6488c3d9","data":"7c3640a0175fe0d5cf8307","_id":"58aea5385d2f310001a592fd","created_at":"2017-02-23T09:02:48.702Z"}
```
decrypted data looks like : 
{"sigkey":"dd9b16ea-6fc5-4912-8dbe-18ba6488c3d9","data":"knock knock","_id":"58aea5385d2f310001a592fd","created_at":"2017-02-23T09:02:48.702Z"}

Repository is created on MongoDB with a TTL, expiration is delay after each update

#### PUT 

To update data, message must be sign using JWS and sigkey sent by server during repository creation with POST

```
PUT / HTTP/1.1
Content-Type: application/text
Content-Length: 157
Host: nginx
Connection: close
  
eyJhbGciOiJIUzI1NiJ9.eyJyZXBvIjoiNThhZWE1Mzg1ZDJmMzEwMDAxYTU5MmZkIiwiZGF0YSI6IjYyMjg0YmEyMDgxYWVmOWJkMjg1MWM0ZCJ9.e-QiHYQKw64UHxzN6ERZKMbBSBGq2NRNUCehiWlzsA0
```
decoded from Base64 (and decrypted data) signed message looks like :
```
{
  "header": {
    "alg": "HS256"
  },
  "payload": {
    "repo": "58aea90c8d3f66000110177a",
    "data": "updated repo"
  },
  "signature": "SjJQHDMJWzHTqVv4Ro7QA53rHwB83SIalYBc5GRS8O4"
}
```

```
HTTP/1.1 200 OK
Server: nginx/1.11.10
Date: Thu, 23 Feb 2017 09:02:49 GMT
Content-Length: 0
Connection: close
X-Powered-By: Express
```

#### GET 

To retrieve data, anyone can GET data with a valid ObjectId hence the interest to encrypt data

```
GET /?id=58aea5385d2f310001a592fd HTTP/1.1
Content-Type: application/text
Content-Length: 0
Host: nginx
Connection: close
```
```
HTTP/1.1 200 OK
Server: nginx/1.11.10
Date: Thu, 23 Feb 2017 09:02:49 GMT
Content-Type: application/json
Content-Length: 66
Connection: close
X-Powered-By: Express
  
{"_id":"58aea5385d2f310001a592fd","data":"7c3640a0175fe0d5cf8307"}
```
#### DELETE 

to delete repository before timeout

```
DELETE /?data=eyJhbGciOiJIUzI1NiJ9.NThhZWIxNzU2NTE1NTAwMDAxZmMzOTY4.S2JORPI7t3pDo9rN_WRqy8SpybIOXa8sPklzX3LVU18 HTTP/1.1
Content-Type: application/text
Content-Length: 0
Host: nginx
Connection: close
```
decoded from base64 data looks like, where payload is ObjectId to delete :
```
{ 
  "header": {
    "alg": "HS256"
  },
  "payload": "58aeb1756515500001fc3968",
  "signature":"S2JORPI7t3pDo9rN_WRqy8SpybIOXa8sPklzX3LVU18"
}  
```

```
HTTP/1.1 200 OK
Server: nginx/1.11.10
Date: Thu, 23 Feb 2017 09:55:01 GMT
Content-Length: 0
Connection: close
X-Powered-By: Express
```  

