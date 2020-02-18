import {type} from 'ramda'
export const path_to_key = path => type(path) === "Array" ? path.join('.') : path