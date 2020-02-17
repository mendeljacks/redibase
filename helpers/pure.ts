import { compose, uniq, concat, zipObj, join, pathOr, __, unnest, chain, is, keys } from "ramda";

export const concat_if_nonexistent = (array, append_array) => compose(uniq, concat(array))(append_array)

export const json_to_path_values = (val): (any[])[] => {
    if (Array.isArray(val)) {
        const child_paths = unnest(val.map((child, i) =>
            json_to_path_values(child).map(path => [i, ...path])
        ))
        return child_paths
    }

    if (is(Object, val)) {
        const child_paths = chain((key, i) =>
            json_to_path_values(val[key]).map(path => [key, ...path])
        )(keys(val))
        return child_paths
    }

    if (is(String, val) || is(Number, val) || is(Boolean, val)) {
        return [[]]
    }

    throw Object.assign(new Error(), {
        message: 'Unrecognized type',
        val
    })
}

export const redis_write = obj => {
    const paths = json_to_path_values(obj)
    const path_value_object = zipObj(paths.map(join('.')), paths.map(pathOr(undefined, __, obj)))
    return path_value_object
}

export const redis_read = () => {
    return {
        "animals.0.age": 2,
        "animals.0.name": "cow",
        "animals.1.name": "sheep",
        "animals.1.noise": "beh",
        is_cute: true,
        num: "42"
    }
}

// {
//     animals: [
//         {
//             name: 'cow',
//             age: 2
//         }, 
//         {
//             name: 'sheep',
//             noise: 'beh'
//         }
//     ],
//     is_cute: 'true',
//     num: '42'
// }