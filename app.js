var mongoose      =    require('mongoose');
var express       =    require('express');
var bodyParser    =    require('body-parser');
var uuidV4        =    require('uuid/v4');
var jws           =    require('jws');
var app           =    express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect('mongodb://'+process.env.MONGO_PORT_27017_TCP_ADDR+':'+process.env.MONGO_PORT_27017_TCP_PORT+'/test', function(err) {
	if (err) {throw err; }
});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("connected to mongo");
});

var dataSchema = mongoose.Schema({
  sigkey:  { type: String },
  data: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now, index : { expires : 10 } }
});

var Data = mongoose.model('Data', dataSchema);


app.post('/', function(request, response) {
  var secret_sig = uuidV4();
  // console.log("body:" + JSON.stringify(request.body));
  var data_arg = request.body.data;
  //console.log("data:" + data_arg);
  var data   = new Data({ sigkey: secret_sig, data: data_arg });
  data.save(function (err, data) {
    if (err) return console.error(err);
    //console.log(data);
    data.__v = undefined;
    data.updated_at = undefined;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(data));
  });
});

app.get('/', function(request, response) {
  var id = request.query.id;
  console.log('id:' + id);
  Data.findById(id, 'data', function (err, res) {
      if (err) {response.status(500).end("cannot fetch repository"); return};
      if (res == null) { response.status(404).end("unknown repository"); return};
      console.log('res:' + res);
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(res));
  });
});

app.put('/', function(request, response) {
  request.on('data', function(chunk) {
    var b64_sig = chunk.toString();
    var sig = jws.decode(b64_sig);
    //console.log(sig);
    var data = JSON.parse(sig.payload);
    var repo = data.repo;
    //console.log("repo:%s", repo);
    Data.findById(repo, 'sigkey', function (err, res) {
      if (err) { response.status(500).end("cannot fetch repository"); return; };
      if (res == null) { response.status(404).end("unknown repository"); return; };
      //console.log(res);
      if(!jws.verify(b64_sig, 'HS256', res.sigkey)) { response.status(403).end("wrong signature"); return ; } 
      Data.findByIdAndUpdate(repo, { $set: { data : data.data, updated_at: new Date() } } , function (err, doc) {
        if (err) console.log(err);
        response.end();
      });
    });
  });
});

// Listen on port 8082, IP defaults to 127.0.0.1
app.listen(8082);

// Put a friendly message on the terminal
console.log("Server running at http://127.0.0.1:8082/");


