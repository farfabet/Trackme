'use strict';

var jws      = require('jws');
var Client   = require('node-rest-client').Client;
var uuidV4   = require('uuid/v4');
var crypt   = require('crypto');

var algo     = 'aes-256-ctr';
var cryptkey = uuidV4();

var DONOTCRYPT = false;
var url="http://nginx:80";

if (process.argv[2])
  url=process.argv[2];
console.log(url);

function encrypt(text) {
  if (DONOTCRYPT || !text)
    return text;
  var cipher   = crypt.createCipher(algo, cryptkey);
  var crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text) {
  if (DONOTCRYPT || !text)
    return text;
  var decipher   = crypt.createDecipher(algo, cryptkey);
  var dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

var client = new Client();

function get_repo(url, id, callback) {
  if (!id) { console.log("no id to get, return."); return ;}
  console.log("getting value from " + id);
  var args = {
    parameters : { id: id },
    headers: { "Content-Type": "application/text" }
  }

  client.get(url, args, callback);
}

function init_repo(url, text, callback) {
  text = encrypt(text);
  var args = {
    data: { data: text },
    headers: { "Content-Type": "application/json" }
  }

  client.post(url, args, callback);
}

function delete_repo(url, id, sigkey, callback) {
  if (!id) {console.log("no id, return."); return ;}

  const signature = jws.sign({
    header: { alg: 'HS256' },
    payload: { id : id },
    secret: sigkey,
  });

  var args = {
    parameters : { data : signature },
    headers: { "Content-Type": "application/text" }
  }

  client.delete(url, args, callback);
}

function update_repo(url, id, text, sigkey, callback) {
  if (!id || !text || !sigkey) {console.log("no id or no text or sigkey, return."); return ;}
  text = encrypt(text);
  
  const signature = jws.sign({
    header: { alg: 'HS256' },
    payload: {
      id: id,
      data: text
    },
    secret: sigkey,
  });

  var args = {
    data: signature,
    headers: { "Content-Type": "application/text" }
  }
 
  console.log("update repo with sigkey:" + sigkey);
  console.log("signature:"+ signature);
  console.log("verif:" + jws.verify(signature, 'HS256', sigkey));
  client.put(url, args, callback); 
}

var wack_sigkey;
var wack_id;

// Unit test init / get / upate / get : should work
init_repo(url, "knock knock", function(data, response) {
  if (response.statusCode !== 200) {console.log(response.statusMessage); return;}
  console.log("sigkey:" + data.sigkey);
  console.log("_id:" + data._id);
  var sigkey = data.sigkey;
  var id = data._id;
  wack_id = id;
  wack_sigkey = sigkey;
  get_repo(url, id, function(data, response) {
    console.log("got ciphered:" + data.data);
    console.log("got deciphered:" + decrypt(data.data));
    update_repo(url, id, "We the People of the United States, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity, do ordain and establish this Constitution for the United States of America.", sigkey, function (data, response) {
      console.log('update res:' + data.toString('ascii'));
      get_repo(url, id, function(data, response) {
        console.log("got ciphered:"+data.data);
        console.log("got deciphered:" + decrypt(data.data));
      });
    });
  });
});

// Unit test init / update : should failed 'wrong signature'
function wrong_sig_test() {
init_repo(url, "knock knock", function(data, response) {
  if (response.statusCode !== 200) {console.log(response.statusMessage); return;}
  console.log("sigkey:" + data.sigkey);
  console.log("_id:" + data._id);
  var sigkey = data.sigkey; 
  var id = data._id;
  update_repo(url, id, "Small update", 'wrong sigkey', function (data, response) {
    console.log("update res: " + data.toString('ascii'));
    delete_repo(url, id, sigkey, function (data, reponse) {
      console.log("delete res: " + data.toString('ascii'));
    });
  });
});
}

function get_wack() {
  get_repo(url, wack_id, function(data, response) {
    console.log("got wack ciphered:"+data.data);
    console.log("got wack deciphered:" + decrypt(data.data));
  });
}

function wack() {
  update_repo(url, wack_id, "wack wack wink", wack_sigkey, function (data, response) {
    console.log('wack update res:' + data.toString('ascii'));
    get_wack();
  });
}

setTimeout(wrong_sig_test, 1000);
// Testing expiration on updated_at index TTL. MongoDB should be db.adminCommand({setParameter:1, ttlMonitorSleepSecs:5});
//setTimeout(wack, 5000);
//setTimeout(get_wack, 9000);
//setTimeout(get_wack, 18000);
//setTimeout(wrong_sig_test, 20000);
