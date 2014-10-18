var fs = require('fs')
var http = require('http')
var nugget = require('../')
var path = require('path')
var test = require('tape')

var testServer = http.createServer(function(req, res) {
  res.end('hello')
})

var target = path.join(__dirname, 'foobar.html')
if (fs.existsSync(target)) fs.unlinkSync(target)

testServer.listen(5000, function() {
  test('fetches file', function(t) {
    nugget('http://localhost:5000/foobar.html', {dir: __dirname}, function(err) {
      t.ok(fs.existsSync(target), 'downloaded file')
      if (fs.existsSync(target)) fs.unlinkSync(target)
      t.end()
      testServer.close()
    })
  })
})
