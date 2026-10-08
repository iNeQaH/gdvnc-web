import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cài đặt cá nhân - GDVN',
  description: 'Quản lý tài khoản và bảo mật GDVN',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
