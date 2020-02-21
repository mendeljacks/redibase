import * as Joi from '@hapi/joi';

export const key_or_path_schema = Joi.alternatives(
    Joi.string().allow(''),
    Joi.array().items(
        Joi.string().min(0)
    ).min(1)
)