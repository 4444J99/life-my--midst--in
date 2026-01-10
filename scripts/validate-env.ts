import { z } from 'zod';

const prodEnvSchema = z.object({
  POSTGRES_PASSWORD: z.string().min(8, "Production password must be at least 8 chars"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  NODE_ENV: z.literal("production"),
  LOCAL_LLM_API_KEY: z.string().optional(), // For production AI
});

export function validateProdEnv() {
  if (process.env['NODE_ENV'] !== 'production') return;

  const result = prodEnvSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Production Environment Validation Failed:');
    console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
    process.exit(1);
  }
  
  console.log('✅ Production Environment Validated.');
}

if (require.main === module) {
  validateProdEnv();
}
