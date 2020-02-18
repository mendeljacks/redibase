import * as Joi from '@hapi/joi';

export const key_or_path_schema = Joi.alternatives().try(
    Joi.string().min(1),
    Joi.array().items(
        Joi.string().min(1)
    ).min(1)
)
