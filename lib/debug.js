'use strict'
import debug from "debug";
import {name as pkg} from "../package.json";

exports = module.exports = tag => debug(`${pkg}:${tag}`)
