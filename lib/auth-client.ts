import { createAuthClient } from 'better-auth/react';

import { organization } from 'better-auth/plugins';
export const authClient = createAuthClient({
  plugins: [organization()],
});
