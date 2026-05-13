import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGIN: Joi.string().default('*'),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
  CLOUDINARY_FOLDER: Joi.string().default('city-connect'),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  LGU_ADMIN_REGISTER_CODE: Joi.string().min(8).required(),

  AGORA_APP_ID: Joi.string().allow('').optional(),
  AGORA_APP_CERTIFICATE: Joi.string().allow('').optional(),
  AGORA_TOKEN_EXPIRES_SECONDS: Joi.number().default(3600),
  CALL_RING_SECONDS: Joi.number().min(10).max(120).default(30),
});
