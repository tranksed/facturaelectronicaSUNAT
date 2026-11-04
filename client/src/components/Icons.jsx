import React from 'react';
import * as TailAdminIcons from '../icons';

// Export all 150+ official TailAdmin icons directly
export * from '../icons';

// TailAdmin-powered aliases for seamless backward-compatibility
export const IconDashboard = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.LayoutGridIcon width={size} height={size} className={className} {...props} />
);

export const IconInvoice = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.DocIcon width={size} height={size} className={className} {...props} />
);

export const IconFileText = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.FileIcon width={size} height={size} className={className} {...props} />
);

export const IconSettings = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.GearIcon width={size} height={size} className={className} {...props} />
);

export const IconSun = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.SunIcon width={size} height={size} className={className} {...props} />
);

export const IconMoon = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.MoonIcon width={size} height={size} className={className} {...props} />
);

export const IconSearch = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.SearchIcon width={size} height={size} className={className} {...props} />
);

export const IconPlus = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.PlusIcon width={size} height={size} className={className} {...props} />
);

export const IconCheck = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.CheckIcon width={size} height={size} className={className} {...props} />
);

export const IconTrash = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.TrashBinIcon width={size} height={size} className={className} {...props} />
);

export const IconDownload = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.DownloadIcon width={size} height={size} className={className} {...props} />
);

export const IconUpload = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.UploadIcon width={size} height={size} className={className} {...props} />
);

export const IconArchive = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.ArchiveIcon width={size} height={size} className={className} {...props} />
);

export const IconCode = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.CodeIcon width={size} height={size} className={className} {...props} />
);

export const IconUser = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.UserIcon width={size} height={size} className={className} {...props} />
);

export const IconLogout = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.LogOutIcon width={size} height={size} className={className} {...props} />
);

export const IconMail = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.EnvelopeIcon width={size} height={size} className={className} {...props} />
);

export const IconBell = ({ size = 18, className = "", ...props }) => (
  <TailAdminIcons.BellIcon width={size} height={size} className={className} {...props} />
);

export const IconCopy = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.CopyIcon width={size} height={size} className={className} {...props} />
);

export const IconKey = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.KeyIcon width={size} height={size} className={className} {...props} />
);

export const IconLock = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.LockIcon width={size} height={size} className={className} {...props} />
);

export const IconEdit = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.PencilIcon width={size} height={size} className={className} {...props} />
);

export const IconEye = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.EyeIcon width={size} height={size} className={className} {...props} />
);

export const IconEyeOff = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.EyeCloseIcon width={size} height={size} className={className} {...props} />
);

export const IconChevronDown = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.ChevronDownIcon width={size} height={size} className={className} {...props} />
);

export const IconExternalLink = ({ size = 16, className = "", ...props }) => (
  <TailAdminIcons.LinkIcon width={size} height={size} className={className} {...props} />
);

// Specialized / Additional Icons
export const IconBuilding = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <line x1="8" y1="6" x2="10" y2="6" />
    <line x1="14" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="10" y2="10" />
    <line x1="14" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="10" y2="14" />
    <line x1="14" y1="14" x2="16" y2="14" />
  </svg>
);

export const IconShield = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconTelegram = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export const IconCreditCard = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

export const IconRefresh = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const IconServer = ({ size = 18, className = "" }) => (
  <TailAdminIcons.DatabaseIcon width={size} height={size} className={className} />
);

export const IconZap = ({ size = 18, className = "" }) => (
  <TailAdminIcons.BoltIcon width={size} height={size} className={className} />
);

export const IconBriefcase = ({ size = 18, className = "" }) => (
  <TailAdminIcons.BoxIcon width={size} height={size} className={className} />
);

export const IconBookOpen = ({ size = 18, className = "" }) => (
  <TailAdminIcons.PageIcon width={size} height={size} className={className} />
);

export const IconAlertTriangle = ({ size = 18, className = "" }) => (
  <TailAdminIcons.AlertIcon width={size} height={size} className={className} />
);
