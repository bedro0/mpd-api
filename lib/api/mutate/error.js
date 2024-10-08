'use strict'
import createDebug from "../../debug";
const debug = createDebug("mutate:error");

exports.ignore = codes => err => {
  if (codes.indexOf(err.code) !== -1) {
    debug('ignoring error %s, "%s"', err.code, err.message)
    return
  }
  return err
}
