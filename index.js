var request = require('request')
var fs = require('fs')
var path = require('path')
var log = require('single-line-log').stdout
var progress = require('progress-stream')

module.exports = function(url, opts, cb) {
  var target = opts.o || opts.O || opts.out || path.basename(url)
  var read = request(url)
  read.on('error', cb)
  read.on('response', function(resp) {
    if (resp.statusCode > 299 && !opts.f && !opts.force) return cb(new Error('GET ' + url + ' returned ' + resp.statusCode))
    var write = fs.createWriteStream(path.join(opts.dir || process.cwd(), target))
    write.on('error', cb)
    write.on('finish', cb)
 
    render(0)
    resp
      .pipe(progress({ length: Number(resp.headers['content-length']) }, onprogress))
      .pipe(write)
  })
}

function render(pct) {
  var bar = Array(Math.floor(50 * pct / 100)).join('=')+'>'
  while (bar.length < 50) bar += ' '
 
  log(
    'Downloading \n'+
    '['+bar+'] '+pct.toFixed(1)+'%   \n'
  )
}
 
function onprogress(p) {
  render(p.percentage)
}
