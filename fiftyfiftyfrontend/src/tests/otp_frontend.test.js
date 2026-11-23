import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n======================================================');
console.log('Frontend OTP Integration & Security Tests');
console.log('======================================================\n');

// 1. Verify CommonLoginModal.jsx
const modalPath = path.join(srcDir, 'shared', 'components', 'CommonLoginModal', 'CommonLoginModal.jsx');
const modalCode = fs.readFileSync(modalPath, 'utf8');

assert(
  modalCode.includes("'/auth/otp/send'"),
  'CommonLoginModal requests OTP via /auth/otp/send'
);

assert(
  modalCode.includes("'/auth/otp/verify'"),
  'CommonLoginModal validates 6-digit code via /auth/otp/verify'
);

assert(
  modalCode.includes("'/auth/otp/reset-password'"),
  'CommonLoginModal sets new password via /auth/otp/reset-password'
);

assert(
  modalCode.includes('otpTimeLeft') && modalCode.includes('300'),
  'CommonLoginModal enforces 5-minute (300 seconds) countdown timer'
);

assert(
  modalCode.includes('resendCooldown') && modalCode.includes('60'),
  'CommonLoginModal enforces 60-second cooldown on Resend Code'
);

assert(
  modalCode.includes('maxLength={6}') && modalCode.includes('replace(/\\D/g'),
  'CommonLoginModal restricts OTP input to 6 numeric digits'
);

assert(
  !modalCode.includes('sendPasswordResetEmail') && !modalCode.includes('token='),
  'CommonLoginModal contains zero password reset links or token URLs'
);

// 2. Verify LoginScreen.jsx
const loginPath = path.join(srcDir, 'screens', 'auth', 'login', 'LoginScreen.jsx');
const loginCode = fs.readFileSync(loginPath, 'utf8');

assert(
  loginCode.includes('CommonLoginModal') && loginCode.includes('startInForgot={true}'),
  'LoginScreen opens CommonLoginModal directly in OTP Forgot flow'
);

// 3. Verify DynamicGymLoginScreen.jsx
const gymLoginPath = path.join(srcDir, 'screens', 'auth', 'gym-login', 'DynamicGymLoginScreen.jsx');
const gymLoginCode = fs.readFileSync(gymLoginPath, 'utf8');

assert(
  gymLoginCode.includes('CommonLoginModal') && gymLoginCode.includes('startInForgot={true}'),
  'DynamicGymLoginScreen opens CommonLoginModal directly in OTP Forgot flow'
);

// 4. Verify DynamicMemberLoginScreen.jsx
const memberLoginPath = path.join(srcDir, 'screens', 'auth', 'member-login', 'DynamicMemberLoginScreen.jsx');
const memberLoginCode = fs.readFileSync(memberLoginPath, 'utf8');

assert(
  memberLoginCode.includes('CommonLoginModal') && memberLoginCode.includes('startInForgot={true}'),
  'DynamicMemberLoginScreen opens CommonLoginModal directly in OTP Forgot flow'
);

// 5. Verify SuperAdminLoginScreen.jsx
const superAdminLoginPath = path.join(srcDir, 'screens', 'auth', 'superadmin-login', 'SuperAdminLoginScreen.jsx');
const superAdminLoginCode = fs.readFileSync(superAdminLoginPath, 'utf8');

assert(
  superAdminLoginCode.includes('CommonLoginModal') && superAdminLoginCode.includes('startInForgot={true}'),
  'SuperAdminLoginScreen opens CommonLoginModal directly in OTP Forgot flow'
);

console.log('\n======================================================');
console.log(`Frontend OTP Test Results: ${passedTests} passed, ${failedTests} failed`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
