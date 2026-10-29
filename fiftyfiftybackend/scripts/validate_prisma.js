import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');

export const validatePrismaSchema = () => {
  console.log('====================================================');
  console.log('FiftyFifty Gym — Prisma Schema Validation');
  console.log('====================================================\n');

  if (!fs.existsSync(schemaPath)) {
    console.error(`✗ Prisma schema not found at ${schemaPath}`);
    return false;
  }

  const content = fs.readFileSync(schemaPath, 'utf-8');
  console.log(`✓ Located Prisma schema: ${schemaPath}`);

  // 1. Validate datasource and generator
  if (!content.includes('provider = "postgresql"')) {
    console.error('✗ Datasource must use provider = "postgresql"');
    return false;
  }
  console.log('✓ Datasource configuration: PostgreSQL');

  if (!content.includes('provider = "prisma-client-js"')) {
    console.error('✗ Generator must use provider = "prisma-client-js"');
    return false;
  }
  console.log('✓ Client generator: prisma-client-js');

  // 2. Validate required models and table mappings
  const requiredModels = [
    { model: 'SuperAdmin', table: 'super_admins' },
    { model: 'GymOwner', table: 'gym_owners' },
    { model: 'Gym', table: 'gyms' },
    { model: 'User', table: 'users' },
    { model: 'MembershipPlan', table: 'membership_plans' },
    { model: 'Member', table: 'members' },
    { model: 'MemberSubscription', table: 'member_subscriptions' },
    { attendance: 'Attendance', table: 'attendance' },
    { model: 'Payment', table: 'payments' },
    { model: 'Notification', table: 'notifications' },
    { model: 'PasswordResetToken', table: 'password_reset_tokens' }
  ];

  for (const item of requiredModels) {
    const modelName = item.model || item.attendance;
    const tablePattern = `@@map("${item.table}")`;
    const modelPattern = `model ${modelName}`;

    if (!content.includes(modelPattern)) {
      console.error(`✗ Missing model definition: ${modelName}`);
      return false;
    }
    if (!content.includes(tablePattern)) {
      console.error(`✗ Model ${modelName} must map to table "${item.table}"`);
      return false;
    }
    console.log(`✓ Model "${modelName}" correctly mapped to "${item.table}"`);
  }

  // 3. Validate key architectural relationships
  if (!content.includes('gym Gym @relation(fields: [gymId], references: [id], onDelete: Cascade)')) {
    console.error('✗ GymOwner must define Cascade relation to Gym');
    return false;
  }
  console.log('✓ GymOwner -> Gym foreign key relation validated');

  if (!content.includes('superAdmin SuperAdmin @relation(fields: [userId], references: [id], onDelete: Cascade)')) {
    console.error('✗ PasswordResetToken must define Cascade relation to SuperAdmin');
    return false;
  }
  console.log('✓ PasswordResetToken -> SuperAdmin foreign key relation validated');

  console.log('\n====================================================');
  console.log('Prisma schema validation succeeded: 100% valid.');
  console.log('====================================================\n');
  return true;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isValid = validatePrismaSchema();
  process.exit(isValid ? 0 : 1);
}
