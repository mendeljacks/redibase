import { unnest, chain, is, keys } from 'ramda'


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