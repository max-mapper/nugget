var request = require('request')
var fs = require('fs')
var path = require('path')
var log = require('single-line-log').stdout
var progress = require('progress-stream')
var prettyBytes = require('pretty-bytes')
var throttle = require('throttleit')
var EventEmitter = require('events').EventEmitter

function noop () {}

module.exports = function(urls, opts, cb) {
  if (!Array.isArray(urls)) urls = [urls]
  var downloads = []
  var pending = 0
  urls.forEach(function (url) {
    var dl = startDownload(url, opts, function done (err) {
      if (err) throw err
      if (--pending === 0) {
        render()
        cb()
      }
    })
    downloads.push(dl)
    dl.on('start', function (progressStream) {
      throttledRender()
    })
    
    dl.on('progress', function(data) {
      dl.speed = data.speed
      if (dl.percentage === 100) render()
      else throttledRender()
    })
  })
  
  var _log = opts.verbose ? log : noop
  
  render()
  
  var throttledRender = throttle(render, opts.frequency || 100)
  
  function render () {
    var output = ""
    var totalSpeed = 0
    downloads.forEach(function (dl) {
      var pct = dl.percentage
      var speed = dl.speed
      totalSpeed += speed
      var bar = Array(Math.floor(50 * pct / 100)).join('=')+'>'
      while (bar.length < 50) bar += ' '
      output += 'Downloading '+path.basename(dl.target)+'\n'+
      '['+bar+'] '+pct.toFixed(1)+'% (' + prettyBytes(speed) + '/s)\n'
    })
    if (downloads.length > 1) output += '\nCombined Speed: ' + prettyBytes(totalSpeed) + '/s\n'
    _log(output)
  }
}

function startDownload (url, opts, cb) {
  var target = path.resolve(opts.dir || process.cwd(), path.basename(url))
  if (opts.resume) {
    resume(url, opts, cb)
  } else {
    download(url, opts, cb)
  }

  var progressEmitter = new EventEmitter()
  progressEmitter.target = target
  progressEmitter.speed = 0
  progressEmitter.percentage = 0
  
  return progressEmitter

  function resume(url, opts, cb) {
    fs.stat(target, function (err, stats) {
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
    var read = request(url, { headers: headers })
    var speed = "0 Kb"

    read.on('error', cb)
    read.on('response', function(resp) {
      if (resp.statusCode > 299 && !opts.force) return cb(new Error('GET ' + url + ' returned ' + resp.statusCode))
      var write = fs.createWriteStream(target, {flags: opts.resume ? 'a' : 'w'})
      write.on('error', cb)
      write.on('finish', cb)
      var len = Number(resp.headers['content-length'])
      progressEmitter.fileSize = len
      var progressStream = progress({ length: len }, onprogress)
      
      progressEmitter.emit('start', progressStream)
      
      resp
        .pipe(progressStream)
        .pipe(write)      
    })

    function onprogress (p) {
      var pct = p.percentage
      progressEmitter.progress = p
      progressEmitter.percentage = pct
      progressEmitter.emit('progress', p)
    }
  }
}