'use strict'
import mpd from "mpd2";
import api from "./api";


const connect = async config => {
  const client = await mpd.connect(config)
  await api.apifyClient(client)
  return client
}

exports.mpd = mpd
exports.connect = connect

exports.default = { mpd, connect }
