#!/usr/bin/env node

var nugget = require('./')
var args = require('minimist')(process.argv.slice(2))

var url = args._[0]
if (!url) {
  console.error("Usage: nugget <url> [-O saveAs]")
  process.exit(1)
}

var opts = {
  target: args.o || args.O || args.out || path.basename(url),
  dir:    args.d || args.dir,
  resume: args.c || args.continue,
  force:  args.f || args.force,
}

nugget(url, opts, function(err) {
  if (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
  process.exit(0)
})
