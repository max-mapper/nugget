#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var nugget = require('./')
var opts = require('minimist')(process.argv.slice(2), {
  string: ['out', 'dir'],
  boolean: ['continue', 'force', 'quiet', 'strict-ssl'],
  default: {
    continue: false,
    force: false,
    quiet: false,
    'strict-ssl': true,
    proxy: null,
    frequency: null
  },
  alias: {
    o: 'out',
    O: 'out',
    d: 'dir',
    c: 'continue',
    f: 'force',
    s: 'sockets',
    q: 'quiet',
    target: 'out',
    resume: 'continue',
    strictSSL: 'strict-ssl'
  }
})

var urls = opts._
if (urls.length === 0) {
  console.log(fs.readFileSync(path.join(__dirname, 'usage.txt')).toString())
  process.exit(1)
}

if (opts.frequency) {
  opts.frequency = +opts.frequency
}

nugget(urls, opts, function (err) {
  if (err) {
    console.error('Error:', err)
    process.exit(1)
  }
  process.exit(0)
})
