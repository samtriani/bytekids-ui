import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Solo los usuarios marcados como dueños en el backend (OWNER_USERNAMES) pueden
 * entrar. Es una comodidad de UI: el backend valida lo mismo por su cuenta, asi
 * que saltarse este guard no sirve de nada.
 */
export const ownerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getUser();
  if (user?.owner) return true;
  router.navigate(['/administrator/operations']);
  return false;
};
