import { Pipe, PipeTransform } from '@angular/core';

const ROLES: Record<string, string> = {
  admin:    'Coordinador',
  teacher:  'Profesor',
  student:  'Alumno',
  parent:   'Padre',
  director: 'Director',
};

@Pipe({ name: 'role', standalone: true })
export class RolePipe implements PipeTransform {
  transform(value: string): string {
    return ROLES[value?.toLowerCase()] ?? value;
  }
}
