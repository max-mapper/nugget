var request = require('request')
var fs = require('fs')
var path = require('path')
var log = require('single-line-log').stdout
var progress = require('progress-stream')
var prettyBytes = require('pretty-bytes')
var throttle = require('throttleit')
var EventEmitter = require('events').EventEmitter

function noop () {}

module.exports = function(url, opts, cb) {
  opts.target = path.resolve(opts.dir || process.cwd(), opts.target || path.basename(url))
  if (opts.resume) {
    resume(url, opts, cb)
  } else {
    download(url, opts, cb)
  }
  
  var progressEmitter = new EventEmitter()
  return progressEmitter
  
  function resume(url, opts, cb) {
    fs.stat(opts.target, function (err, stats) {
      if (err && err.code === 'ENOENT') {
        return download(url, opts, cb)
      }
      if (err) {
        return cb(err)
      }
      var offset = stats.size
      var req = request.get(url)

      req.on('error', cb)
      req.on('response', function(resp) {
        resp.destroy()

        var length = parseInt(resp.headers['content-length'], 10)

        // file is already downloaded.
        if (length === offset) return cb()

        if (!isNaN(length) && length > offset && /bytes/.test(resp.headers['accept-ranges'])) {
          opts.range = [offset, length]
        }

        download(url, opts, cb)
      })
    })
  }

  function download(url, opts, cb) {
    var headers = opts.headers || {}
    if (opts.range) {
      headers.Range = 'bytes=' + opts.range[0] + '-' + opts.range[1]
    }
    var _log = opts.verbose ? log : noop
    var read = request(url, { headers: headers })
    var throttledRender = throttle(render, opts.frequency || 100)
    var speed = "0 Kb"
    
    read.on('error', cb)
    read.on('response', function(resp) {
      if (resp.statusCode > 299 && !opts.force) return cb(new Error('GET ' + url + ' returned ' + resp.statusCode))
      var write = fs.createWriteStream(opts.target, {flags: opts.resume ? 'a' : 'w'})
      write.on('error', cb)
      write.on('finish', cb)
         
      var progressStream = progress({ length: Number(resp.headers['content-length']) }, onprogress)
      
      progressStream.on('progress', function(data) {
        speed = prettyBytes(data.speed)
        progressEmitter.emit('progress', data)
      })
      
      render(0)
      resp
        .pipe(progressStream)
        .pipe(write)
      
    })

    function render(pct) {
      var bar = Array(Math.floor(50 * pct / 100)).join('=')+'>'
      while (bar.length < 50) bar += ' '
   
      _log(
        'Downloading '+path.basename(opts.target)+'\n'+
        '['+bar+'] '+pct.toFixed(1)+'% (' + speed + '/s)\n'
      )
    }
   
    function onprogress(p) {
      var pct = p.percentage
      if (pct === 100) render(pct)
      else throttledRender(pct)
    }
  }
}
