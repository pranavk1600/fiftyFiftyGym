import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Layouts
import AuthLayout from '../layouts/AuthLayout/AuthLayout';
import AdminLayout from '../layouts/AdminLayout/AdminLayout';
import OwnerLayout from '../layouts/OwnerLayout/OwnerLayout';
import MemberLayout from '../layouts/MemberLayout/MemberLayout';

// Screens
import LandingScreen from '../screens/public/LandingScreen';
import GymPortalScreen from '../screens/public/GymPortalScreen';
import LoginScreen from '../screens/auth/login/LoginScreen';
import DynamicGymLoginScreen from '../screens/auth/gym-login/DynamicGymLoginScreen';
import GymSetupPasswordScreen from '../screens/auth/gym-setup-password/GymSetupPasswordScreen';
import GymResetPasswordScreen from '../screens/auth/gym-reset-password/GymResetPasswordScreen';
import ResetPasswordScreen from '../screens/auth/reset-password/ResetPasswordScreen';
import DynamicMemberLoginScreen from '../screens/auth/member-login/DynamicMemberLoginScreen';
import MemberSetupPasswordScreen from '../screens/auth/member-setup-password/MemberSetupPasswordScreen';
import MemberResetPasswordScreen from '../screens/auth/member-reset-password/MemberResetPasswordScreen';
import AdminDashboardScreen from '../screens/admin/dashboard/AdminDashboardScreen';
import GymManagementScreen from '../screens/admin/gym-management/GymManagementScreen';
import OwnerDashboardScreen from '../screens/owner/dashboard/OwnerDashboardScreen';
import MemberManagementScreen from '../screens/owner/members/MemberManagementScreen';
import PlanManagementScreen from '../screens/owner/plans/PlanManagementScreen';
import AttendanceScreen from '../screens/owner/attendance/AttendanceScreen';
import PaymentManagementScreen from '../screens/owner/payments/PaymentManagementScreen';
import NotificationsScreen from '../screens/owner/notifications/NotificationsScreen';
import MemberDashboardScreen from '../screens/member/dashboard/MemberDashboardScreen';
import MemberAttendanceHistoryScreen from '../screens/member/attendance-history/MemberAttendanceHistoryScreen';
import MemberPaymentHistoryScreen from '../screens/member/payment-history/MemberPaymentHistoryScreen';
import MemberProfileScreen from '../screens/member/profile/MemberProfileScreen';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* 1. Public SaaS Landing Page */}
      <Route path="/" element={<LandingScreen />} />

      {/* 2. Dynamic Gym-Specific Branded Login & Password Setup */}
      <Route path="/gym/:slug/login" element={<DynamicGymLoginScreen />} />
      <Route path="/gym/:slug/setup-password" element={<GymSetupPasswordScreen />} />
      <Route path="/gym/:slug/reset-password" element={<GymResetPasswordScreen />} />

      {/* 2b. Dynamic Member-Specific Portal Login & Password Setup */}
      <Route path="/gym/:gymSlug/:memberSlug/login" element={<DynamicMemberLoginScreen />} />
      <Route path="/gym/:gymSlug/:memberSlug/setup-password" element={<MemberSetupPasswordScreen />} />
      <Route path="/gym/:gymSlug/:memberSlug/reset-password" element={<MemberResetPasswordScreen />} />

      {/* 3. Multi-Tenant Dedicated Gym Portal */}
      <Route path="/gym/:slug" element={<GymPortalScreen />} />

      {/* 4. Public Platform Auth Routes */}
      <Route element={<AuthLayout />}>
        {/* Dedicated Super Admin Login URL */}
        <Route path="/superadmin/login" element={<LoginScreen defaultRole="SUPER_ADMIN" />} />
        <Route path="/superadmin" element={<Navigate to="/superadmin/login" replace />} />

        {/* Dedicated Gym Admin / Owner Login URL */}
        <Route path="/admin/login" element={<LoginScreen defaultRole="GYM_OWNER" />} />

        {/* Dedicated Gym Member Login URL */}
        <Route path="/member/login" element={<LoginScreen defaultRole="MEMBER" />} />

        {/* Generic /login redirect to Gym Admin login */}
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />

        {/* Super Admin Password Reset */}
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        {/* 1. Super Admin Protected Routes */}
        <Route element={<RoleRoute allowedRoles={['PLATFORM_ADMIN', 'SUPER_ADMIN', 'super_admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboardScreen />} />
            <Route path="/admin/gyms" element={<GymManagementScreen />} />
            <Route path="/admin/access" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>

        {/* 2. Gym Owner Protected Routes */}
        <Route element={<RoleRoute allowedRoles={['GYM_OWNER']} />}>
          <Route element={<OwnerLayout />}>
            <Route path="/owner" element={<Navigate to="/owner/dashboard" replace />} />
            <Route path="/owner/dashboard" element={<OwnerDashboardScreen />} />
            <Route path="/owner/members" element={<MemberManagementScreen />} />
            <Route path="/owner/plans" element={<PlanManagementScreen />} />
            <Route path="/owner/attendance" element={<AttendanceScreen />} />
            <Route path="/owner/payments" element={<PaymentManagementScreen />} />
            <Route path="/owner/notifications" element={<NotificationsScreen />} />
          </Route>
        </Route>

        {/* 3. Gym Member Portal Routes */}
        <Route element={<RoleRoute allowedRoles={['MEMBER']} />}>
          <Route element={<MemberLayout />}>
            <Route path="/member" element={<Navigate to="/member/dashboard" replace />} />
            <Route path="/member/dashboard" element={<MemberDashboardScreen />} />
            <Route path="/member/attendance" element={<MemberAttendanceHistoryScreen />} />
            <Route path="/member/payments" element={<MemberPaymentHistoryScreen />} />
            <Route path="/member/profile" element={<MemberProfileScreen />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
