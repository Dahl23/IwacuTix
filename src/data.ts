import { 
  User
} from './types';

export const DEFAULT_ANONYMOUS_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <rect width="128" height="128" fill="#E2E8F0"/>
  <circle cx="64" cy="48" r="22" fill="#94A3B8"/>
  <path d="M28 112c0-19.882 16.118-36 36-36s36 16.118 36 36v4H28v-4z" fill="#94A3B8"/>
</svg>
`)}`;

export const GUEST_USER: User = {
  id: 'guest',
  name: 'Invité (Non connecté)',
  phone: '',
  email: '',
  avatarUrl: DEFAULT_ANONYMOUS_AVATAR,
  role: 'ACHETEUR',
  statut_compte: 'ACTIF',
  telephone_verifie: false
};