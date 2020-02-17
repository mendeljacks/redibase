import { json_to_path_values } from "./json_to_path_values"
import { zipObj, join, pathOr, __ } from "ramda"


export const redis_write = obj => {
    const paths = json_to_path_values(obj)
    const path_value_object = zipObj(paths.map(join('.')), paths.map(pathOr(undefined, __, obj)))
    return path_value_object
}