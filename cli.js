var jws      = require('jws');
var Client   = require('node-rest-client').Client;
var uuidV4   = require('uuid/v4');
var crypt   = require('crypto');

var algo     = 'aes-256-ctr';
var cryptkey = uuidV4();

var DONOTCRYPT = false;

function encrypt(text) {
  if (DONOTCRYPT)
    return text;
  var cipher   = crypt.createCipher(algo, cryptkey);
  var crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text) {
  if (DONOTCRYPT)
    return text;
  var decipher   = crypt.createDecipher(algo, cryptkey);
  var dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

var client = new Client();

function get_repo(url, id, callback) {
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

function update_repo(url, repo, text, sigkey, callback) {
  text = encrypt(text);
  var data = {
    repo: repo,
    data: text
  };

  const signature = jws.sign({
    header: { alg: 'HS256' },
    payload: data,
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

var url="http://localhost:8082";
var wack_sigkey;
var wack_id;

// Unit test init / get / upate / get : should work
init_repo(url, "knock knock", function(data, response) {
  console.log("sigkey:" + data.sigkey);
  console.log("_id:" + data._id);
  var sigkey = data.sigkey;
  var id = data._id;
  wack_id = id;
  wack_sigkey = sigkey;
  get_repo(url, id, function(data, response) {
    console.log("ciphered:" + data.data);
    console.log("deciphered:" + decrypt(data.data));
    update_repo(url, id, "updated repo", sigkey, function (data, response) {
      console.log(data.toString('ascii'));
      get_repo(url, id, function(data, response) {
        console.log("ciphered:"+data.data);
        console.log("deciphered:" + decrypt(data.data));
      });
    });
  });
});

// Unit test init / update : should failed 'wrong signature'
init_repo(url, "knock knock", function(data, response) {
  console.log("sigkey:" + data.sigkey);
  console.log("_id:" + data._id);
  var sigkey = 'pouet'; 
  var id = data._id;
//  console.log("using wrong sigkey:" + sigkey);
  update_repo(url, id, "updated repo", sigkey, function (data, response) {
    console.log(data.toString('ascii'));
  });
});

function get_wack() {
  get_repo(url, wack_id, function(data, response) {
    console.log("ciphered:"+data.data);
    console.log("deciphered:" + decrypt(data.data));
  });
}

function wack() {
  update_repo(url, wack_id, "wack wack wink", wack_sigkey, function (data, response) {
    console.log(data.toString('ascii'));
    get_wack();
  });
}


// Testing expiration on updated_at index TTL. MongoDB should be db.adminCommand({setParameter:1, ttlMonitorSleepSecs:5});
setTimeout(wack, 5000);
setTimeout(get_wack, 9000);
setTimeout(get_wack, 18000);
