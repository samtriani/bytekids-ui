import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function roleGuard(allowedPanels: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.getUser();
    if (!user) { router.navigate(['/login']); return false; }
    const hasAccess = allowedPanels.some(p => user.panels.includes(p));
    if (!hasAccess) { router.navigate(['/portal']); return false; }
    return true;
  };
}
