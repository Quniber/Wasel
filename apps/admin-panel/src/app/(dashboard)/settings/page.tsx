'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/toast';
import { Settings, Bell, DollarSign, Shield, Save, FileText, Car, Palette, XCircle, ChevronRight, Search, Send } from 'lucide-react';

export default function SettingsPage() {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    appName: 'Wasel',
    supportEmail: 'support@wasel.com',
    supportPhone: '+1234567890',
    currency: 'USD',
    timezone: 'UTC',
  });

  // Commission Settings
  const [commissionSettings, setCommissionSettings] = useState({
    defaultCommission: 15,
    minimumFare: 5,
    cancellationFee: 3,
    waitingTimePerMinute: 0.5,
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    orderUpdates: true,
    driverApprovals: true,
    paymentAlerts: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success('Settings saved successfully');
  };

  // Data management sub-pages
  const dataManagementLinks = [
    { name: 'Document Types', href: '/settings/document-types', icon: FileText, description: 'Configure required documents for drivers' },
    { name: 'Car Models', href: '/settings/car-models', icon: Car, description: 'Manage available car models' },
    { name: 'Car Colors', href: '/settings/car-colors', icon: Palette, description: 'Manage available car colors' },
    { name: 'Cancel Reasons', href: '/settings/cancel-reasons', icon: XCircle, description: 'Configure order cancellation reasons' },
    { name: 'Search Test', href: '/settings/search-test', icon: Search, description: 'Test Google Places autocomplete' },
    { name: 'Test Order', href: '/settings/test-order', icon: Send, description: 'Send test orders to drivers' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your platform settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Data Management Links */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Data Management</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {dataManagementLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <link.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{link.name}</p>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">General Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">App Name</label>
              <input
                type="text"
                value={generalSettings.appName}
                onChange={(e) => setGeneralSettings({ ...generalSettings, appName: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Support Email</label>
              <input
                type="email"
                value={generalSettings.supportEmail}
                onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Support Phone</label>
              <input
                type="tel"
                value={generalSettings.supportPhone}
                onChange={(e) => setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  value={generalSettings.currency}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Timezone</label>
                <select
                  value={generalSettings.timezone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Asia/Dubai">Dubai</option>
                  <option value="Asia/Kolkata">India</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Commission Settings */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Commission & Pricing</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Default Commission (%)</label>
              <input
                type="number"
                value={commissionSettings.defaultCommission}
                onChange={(e) => setCommissionSettings({ ...commissionSettings, defaultCommission: parseFloat(e.target.value) })}
                className="w-full rounded-md border px-3 py-2 text-sm"
                min="0"
                max="100"
              />
              <p className="text-xs text-muted-foreground mt-1">Platform commission from each ride</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Fare</label>
              <input
                type="number"
                value={commissionSettings.minimumFare}
                onChange={(e) => setCommissionSettings({ ...commissionSettings, minimumFare: parseFloat(e.target.value) })}
                className="w-full rounded-md border px-3 py-2 text-sm"
                min="0"
                step="0.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum fare for any ride</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cancellation Fee</label>
              <input
                type="number"
                value={commissionSettings.cancellationFee}
                onChange={(e) => setCommissionSettings({ ...commissionSettings, cancellationFee: parseFloat(e.target.value) })}
                className="w-full rounded-md border px-3 py-2 text-sm"
                min="0"
                step="0.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Fee charged when customer cancels</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Waiting Time Rate (per minute)</label>
              <input
                type="number"
                value={commissionSettings.waitingTimePerMinute}
                onChange={(e) => setCommissionSettings({ ...commissionSettings, waitingTimePerMinute: parseFloat(e.target.value) })}
                className="w-full rounded-md border px-3 py-2 text-sm"
                min="0"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground mt-1">Additional charge per minute of waiting</p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive notifications via email</p>
              </div>
              <ToggleSwitch
                checked={notificationSettings.emailNotifications}
                onChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SMS Notifications</p>
                <p className="text-xs text-muted-foreground">Receive notifications via SMS</p>
              </div>
              <ToggleSwitch
                checked={notificationSettings.smsNotifications}
                onChange={(checked) => setNotificationSettings({ ...notificationSettings, smsNotifications: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Browser push notifications</p>
              </div>
              <ToggleSwitch
                checked={notificationSettings.pushNotifications}
                onChange={(checked) => setNotificationSettings({ ...notificationSettings, pushNotifications: checked })}
              />
            </div>
            <hr />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Order Updates</p>
                <p className="text-xs text-muted-foreground">New orders and status changes</p>
              </div>
              <ToggleSwitch
                checked={notificationSettings.orderUpdates}
                onChange={(checked) => setNotificationSettings({ ...notificationSettings, orderUpdates: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Driver Approvals</p>
                <p className="text-xs text-muted-foreground">New driver registration requests</p>
              </div>
              <ToggleSwitch
                checked={notificationSettings.driverApprovals}
                onChange={(checked) => setNotificationSettings({ ...notificationSettings, driverApprovals: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Payment Alerts</p>
                <p className="text-xs text-muted-foreground">Payment failures and refunds</p>
              </div>
              <ToggleSwitch
                checked={notificationSettings.paymentAlerts}
                onChange={(checked) => setNotificationSettings({ ...notificationSettings, paymentAlerts: checked })}
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Security</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Session Timeout (minutes)</label>
              <input
                type="number"
                defaultValue={60}
                className="w-full rounded-md border px-3 py-2 text-sm"
                min="5"
                max="480"
              />
              <p className="text-xs text-muted-foreground mt-1">Auto logout after inactivity</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Require 2FA for admin login</p>
              </div>
              <ToggleSwitch checked={false} onChange={() => toast.info('Coming soon!')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">IP Whitelisting</p>
                <p className="text-xs text-muted-foreground">Restrict access to specific IPs</p>
              </div>
              <ToggleSwitch checked={false} onChange={() => toast.info('Coming soon!')} />
            </div>
            <div className="pt-2">
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => toast.info('Audit log feature coming soon!')}
              >
                View Audit Log →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
