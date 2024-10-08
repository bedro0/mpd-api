'use strict'
// import util from "util";
import { loadDoc, MPD_PROTO_URL } from "./load";
import xray from "x-ray";
// import superagent from "superagent";

const cReset = '\x1b[0m'
const cBlue = '\x1b[34m'
const cMagenta = '\x1b[35m'
const cRed = '\x1b[31m'

const DEPRECATED_METHODS = {
  playlist: 'playlistinfo',
  volume: 'setvol'
}

const NOT_COMMANDS = [
  'systemctl'
]

const findMissingCommands = async () => {
  const mpdCommands = await getMPDCommandsWeb()
  // const mpdCommands = await getMPDCommandsGit()
  const localCommands = await loadLocalCommands()

  // console.log(util.inspect(mpdCommands, {colors: true, depth: null}))
  // console.log(util.inspect(localCommands, { colors: true, depth: null }))

  const localCmds = localCommands
    .map(c => c.command)
    .flat()

  const mpdCmds = mpdCommands
    .map(c => c.command)
    .flat()

  const allCmds = uniqArray(localCmds.concat(mpdCmds)).sort()

  for (const cmd of allCmds) {
    const hasL = ~localCmds.indexOf(cmd)
    const hasM = ~mpdCmds.indexOf(cmd)
    if (hasL && !hasM) {
      console.log(`${cRed}%s${cReset} command does not exist but is defined locally?`, cmd)
    } else if (!hasL && hasM) {
      if (DEPRECATED_METHODS[cmd]) {
        console.log(
          `${cBlue}%s${cReset} is deprecated and not implemented in favour of "%s"`,
          cmd, DEPRECATED_METHODS[cmd]
        )
      } else {
        console.log(`${cMagenta}%s${cReset} is missing locally`, cmd)
      }
    } else {
      // check local namespace for command
      const local = localCommands
        .filter(lcmd => lcmd.command === cmd)

      if (local.length > 1 && uniqArray(local.map(l => l.ns)).length > 1) {
        console.log(`${cRed}%s${cReset} is defined on more than one namespace!`, cmd, local)
      } else {
        const mpd = mpdCommands
          .find(mcmd => mcmd.command === cmd)
        if (!~local[0].section.indexOf(mpd.section)) {
          console.log(
            `${cMagenta}%s${cReset} invalid namespace:\n mpd: %o\n local: %o`,
            mpd, local
          )
        }
      }
    }
  }
}

const loadLocalCommands = async () => {
  const spec = await loadDoc(true)

  return spec
    .map(ns => {
      const section = ns.doc
        .filter(d => d.type === 'linkmpd')
        .map(d => d.args[0].split('!').pop())

      return ns.methods.map(method => ({
        command: cleanCommand(method.spec.mpdcmd),
        ns: ns.ns,
        section
      }))
    })
    .flat()
}

const getMPDCommandsWeb = async () => {
  const xr = xray()

  const spec = await xr(
    MPD_PROTO_URL,
    xr('#command-reference > section', [{
      section: '@id',
      // methods: xr('div', ['dl > dt > strong'])
      commands: xr('dl,p', ['strong.command'])
    }])
  )

  return spec
    .map(section => section.commands
      .map(command => cleanCommand(command))
      .filter(command => !~NOT_COMMANDS.indexOf(command))
      .map(command => ({
        command,
        section: section.section
      }))
    )
    .flat()
}

// const getMPDCommandsGit = async () => {
//  return (
//    (await superagent.get(`${MPD_GIT_RAW_URL}/master/src/command/AllCommands.cxx`))
//      .text
//      .split('command commands[] = {')
//      .pop().split(/\n/g)
//      .reduce((cmds, line, _pos, origArray) => {
//        line = line.trim()
//
//        // end of commands
//        if (line === '};') {
//          origArray.length = 0 // "break"..
//          return cmds
//        }
//
//        if (!line.startsWith('{')) {
//          return cmds
//        }
//
//        const cmd = line
//          .replace(/"/g, '')
//          .split(/{|,/g)
//          .map(s => s.trim())
//          .filter(s => s.length)
//          .shift()
//
//        cmds.push(cmd)
//
//        return cmds
//      }, [])
//    )
// }

const cleanCommand = method => method.split(/{|\[|\s/g).shift().trim()
const uniqArray = arr => Object.keys(arr.reduce((m, val) => ({ ...m, [val]: true }), {}))

findMissingCommands()
