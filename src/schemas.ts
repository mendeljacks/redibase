import * as Joi from '@hapi/joi';

export const key_or_path_schema = Joi.alternatives(
    Joi.string().allow(''),
    Joi.array().items(
        Joi.string().min(0)
    ).min(1)
)

export const allowable_value_schema = Joi.alternatives().try(
    Joi.object().pattern(
        Joi.string().pattern(/^0$|^[1-9][0-9]*$/, { invert: true }).pattern(/^[a-zA-Z0-9_]*$/),
        Joi.link('...')
    ),
    Joi.any().valid(null),
    Joi.string(),
    Joi.number().allow(Infinity, -Infinity),
    Joi.bool(),
    Joi.array().items(Joi.link('...'))
)