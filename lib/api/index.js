'use strict'
import mpd from "mpd2";

import loadspec from "./loadspec";
import { useMethod, compose, errors, getMutator } from "./mutate";
const { cmd } = mpd

import createDebug from "../debug";
const debug = createDebug("api");

exports.apifyClient = async client => {
  debug('apifiying client')

  const spec = await loadspec.load()
  const callMPDBound = callMPDMethod(client)

  const api = {}
  for (const ns in spec) {
    const nsspec = spec[ns]
    api[ns] = {}
    for (const method in nsspec) {
      debug(' registrating api.%s.%s', ns, method)
      api[ns][method] = callMPDBound(nsspec[method])
    }
  }
  client.api = api
  debug('client ready')
  return client
}

const callMPDMethod = client => methodSpec => {
  const runMutators = compose([
    getMutator('parser', methodSpec.parser),
    getMutator('reducer', methodSpec.reducer)
  ])

  const argMutators = compose([
    getMutator('args', methodSpec.arguments)
  ], true)

  const handleErr = errors([
    getMutator('error', methodSpec.error)
  ])

  const customMethod = methodSpec.useMethod
    ? useMethod(methodSpec.useMethod)(client, { ...methodSpec })
    : null

  return async (...args) => {
    if (argMutators) {
      args = argMutators(args)
    }

    // push the default arguments if present
    if (methodSpec.boundArgs && methodSpec.boundArgs.length) {
      args = methodSpec.boundArgs.concat(args)
    }

    return (customMethod
      ? customMethod.apply(null, args)
      : client.sendCommand(cmd(methodSpec.mpdcmd, args))
    )
      .then(runMutators)
      .catch(handleErr)
  }
}
